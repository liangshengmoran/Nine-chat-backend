import { Injectable, HttpException, HttpStatus, Logger, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { RoleEntity } from '../entities/role.entity';
import { PermissionEntity } from '../entities/permission.entity';
import { RolePermissionEntity } from '../entities/role-permission.entity';
import { UserRoleEntity } from '../entities/user-role.entity';
import {
  PERMISSION_DEFINITIONS,
  DEFAULT_ROLES,
  getInheritedPermissions,
  getInheritedConfigs,
} from '../constants/permissions';

interface CacheEntry {
  permissions: Set<string>;
  configs: Map<string, Record<string, any>>;
  timestamp: number;
}

@Injectable()
export class PermissionService implements OnModuleInit {
  private readonly logger = new Logger(PermissionService.name);
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL = 60_000; // 60 秒

  // 角色等级缓存 (role_key -> role_level)
  private roleLevelCache = new Map<string, number>();

  constructor(
    @InjectRepository(RoleEntity)
    private readonly RoleModel: Repository<RoleEntity>,
    @InjectRepository(PermissionEntity)
    private readonly PermissionModel: Repository<PermissionEntity>,
    @InjectRepository(RolePermissionEntity)
    private readonly RolePermissionModel: Repository<RolePermissionEntity>,
    @InjectRepository(UserRoleEntity)
    private readonly UserRoleModel: Repository<UserRoleEntity>,
  ) {}

  async onModuleInit() {
    await this.seedDefaultData();
    await this.loadRoleLevelCache();
  }

  // ==================== 核心权限检查 ====================

  /**
   * 检查用户是否拥有指定权限
   * @param userId 用户ID
   * @param permKey 权限标识符
   * @param roomId 房间ID（room 作用域权限需要）
   * @param userRole 用户的全局角色（回退用，从 user_role 字段获取）
   */
  async checkPermission(userId: number, permKey: string, roomId?: number, userRole?: string): Promise<boolean> {
    const entry = await this.getUserPermissionCache(userId, roomId, userRole);
    return entry.permissions.has(permKey);
  }

  /**
   * 同 checkPermission，但无权限时直接抛出 403 异常
   */
  async requirePermission(userId: number, permKey: string, roomId?: number, userRole?: string): Promise<void> {
    const has = await this.checkPermission(userId, permKey, roomId, userRole);
    if (!has) {
      throw new HttpException('没有操作权限', HttpStatus.FORBIDDEN);
    }
  }

  /**
   * 获取权限的可配置参数（如冷却时间）
   * 多角色时，数值类取最宽松值：
   *   - cooldown_sec, time_limit_sec 等越小越宽松 → 取最小值
   *   - max_length, max_size_kb, max_pages 等越大越宽松 → 取最大值
   */
  async getPermissionConfig(
    userId: number,
    permKey: string,
    roomId?: number,
    userRole?: string,
  ): Promise<Record<string, any> | null> {
    const entry = await this.getUserPermissionCache(userId, roomId, userRole);
    return entry.configs.get(permKey) || null;
  }

  /**
   * 获取用户的最高角色等级（用于"不能操作同级或更高用户"的判断）
   */
  async getUserMaxLevel(userId: number, roomId?: number, userRole?: string): Promise<number> {
    // 查找用户绑定的角色
    const userRoles = await this.getUserRoleEntities(userId, roomId);

    let maxLevel = 0;

    if (userRoles.length > 0) {
      const roleIds = userRoles.map((ur) => ur.role_id);
      const roles = await this.RoleModel.find({ where: { id: In(roleIds), status: 1 } });
      for (const role of roles) {
        if (role.role_level > maxLevel) maxLevel = role.role_level;
      }
    }

    // 回退到 user_role 字段
    if (userRole) {
      const fallbackLevel = this.roleLevelCache.get(userRole) ?? 0;
      if (fallbackLevel > maxLevel) maxLevel = fallbackLevel;
    }

    return maxLevel;
  }

  /**
   * 获取用户在指定房间的所有权限 key 列表
   */
  async getUserPermissions(userId: number, roomId?: number, userRole?: string): Promise<string[]> {
    const entry = await this.getUserPermissionCache(userId, roomId, userRole);
    return Array.from(entry.permissions);
  }

  // ==================== 缓存管理 ====================

  clearCache(userId: number): void {
    // 清除该用户的所有缓存条目
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${userId}:`)) {
        this.cache.delete(key);
      }
    }
  }

  clearAllCache(): void {
    this.cache.clear();
  }

  // ==================== 内部方法 ====================

  private getCacheKey(userId: number, roomId?: number): string {
    return `${userId}:${roomId ?? 'global'}`;
  }

  private async getUserPermissionCache(userId: number, roomId?: number, userRole?: string): Promise<CacheEntry> {
    const cacheKey = this.getCacheKey(userId, roomId);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached;
    }

    const entry = await this.buildPermissionEntry(userId, roomId, userRole);
    this.cache.set(cacheKey, entry);
    return entry;
  }

  private async buildPermissionEntry(userId: number, roomId?: number, userRole?: string): Promise<CacheEntry> {
    const permissions = new Set<string>();
    const configs = new Map<string, Record<string, any>>();

    // 1. 查 tb_user_role 获取用户绑定的角色
    const userRoles = await this.getUserRoleEntities(userId, roomId);

    let roleIds: number[] = [];

    if (userRoles.length > 0) {
      roleIds = userRoles.map((ur) => ur.role_id);
    }

    // 2. 如果没有动态角色分配，回退到 user_role 字段映射的内置角色
    if (roleIds.length === 0 && userRole) {
      const fallbackRole = await this.RoleModel.findOne({
        where: { role_key: userRole, status: 1 },
      });
      if (fallbackRole) {
        roleIds = [fallbackRole.id];

        // 内置角色需要包含继承链上所有角色
        const inheritedRoleKeys = this.getInheritanceChain(userRole);
        if (inheritedRoleKeys.length > 1) {
          const inheritedRoles = await this.RoleModel.find({
            where: { role_key: In(inheritedRoleKeys), status: 1 },
          });
          roleIds = inheritedRoles.map((r) => r.id);
        }
      }
    }

    if (roleIds.length === 0) {
      return { permissions, configs, timestamp: Date.now() };
    }

    // 3. 查 tb_role_permission 获取角色拥有的权限
    const rolePerms = await this.RolePermissionModel.find({
      where: { role_id: In(roleIds), status: 1 },
    });

    // 获取权限实体用于 key 映射
    const permIds = [...new Set(rolePerms.map((rp) => rp.permission_id))];
    if (permIds.length === 0) {
      return { permissions, configs, timestamp: Date.now() };
    }

    const permEntities = await this.PermissionModel.find({
      where: { id: In(permIds) },
    });
    const permIdToKey = new Map(permEntities.map((p) => [p.id, p.perm_key]));

    // 4. 组装权限集和配置
    for (const rp of rolePerms) {
      // 检查作用域匹配
      if (rp.scope_value !== '*' && roomId && rp.scope_value !== String(roomId)) {
        continue; // 作用域不匹配
      }

      const permKey = permIdToKey.get(rp.permission_id);
      if (!permKey) continue;

      permissions.add(permKey);

      // 合并配置（多角色取最宽松）
      if (rp.config) {
        const existing = configs.get(permKey);
        if (existing) {
          configs.set(permKey, this.mergeConfigs(existing, rp.config));
        } else {
          configs.set(permKey, { ...rp.config });
        }
      }
    }

    return { permissions, configs, timestamp: Date.now() };
  }

  /**
   * 查找用户在指定作用域内绑定的角色
   */
  private async getUserRoleEntities(userId: number, roomId?: number): Promise<UserRoleEntity[]> {
    const conditions: any[] = [{ user_id: userId, scope_value: '*', status: 1 }];
    if (roomId) {
      conditions.push({ user_id: userId, scope_value: String(roomId), status: 1 });
    }
    return this.UserRoleModel.find({ where: conditions });
  }

  /**
   * 获取角色继承链（从低到高）
   */
  private getInheritanceChain(roleKey: string): string[] {
    const chain = ['guest', 'user', 'moderator', 'owner', 'admin', 'super'];
    const idx = chain.indexOf(roleKey);
    if (idx === -1) return [roleKey];
    return chain.slice(0, idx + 1);
  }

  /**
   * 合并配置：取最宽松值
   * - cooldown_sec → 取最小值（0 = 无冷却最宽松）
   * - time_limit_sec → 取最大值（越长越宽松）
   * - max_length, max_size_kb → 取最大值（-1 = 无限制）
   * - max_pages → 取最大值（-1 = 无限制）
   */
  private mergeConfigs(a: Record<string, any>, b: Record<string, any>): Record<string, any> {
    const result = { ...a };
    for (const [key, val] of Object.entries(b)) {
      if (!(key in result)) {
        result[key] = val;
        continue;
      }

      const existing = result[key];
      if (typeof existing !== 'number' || typeof val !== 'number') {
        result[key] = val;
        continue;
      }

      // 越小越宽松的字段
      if (key.includes('cooldown')) {
        result[key] = Math.min(existing, val);
      } else {
        // 越大越宽松的字段 (max_length, max_size_kb, max_pages, time_limit_sec)
        // 特殊处理 -1 = 无限制
        if (existing === -1 || val === -1) {
          result[key] = -1;
        } else {
          result[key] = Math.max(existing, val);
        }
      }
    }
    return result;
  }

  // ==================== 数据初始化（Seed） ====================

  private async seedDefaultData() {
    // 检查是否已经初始化
    const roleCount = await this.RoleModel.count();
    if (roleCount > 0) {
      this.logger.log('权限系统已初始化，跳过 seed');
      return;
    }

    this.logger.log('开始初始化权限系统默认数据...');

    try {
      // 1. 插入默认角色
      const roleMap = new Map<string, RoleEntity>();
      for (const roleDef of DEFAULT_ROLES) {
        const role = await this.RoleModel.save({
          role_key: roleDef.role_key,
          role_name: roleDef.role_name,
          role_color: roleDef.role_color,
          role_level: roleDef.role_level,
          is_system: roleDef.is_system,
          description: roleDef.description,
          status: 1,
        });
        roleMap.set(roleDef.role_key, role);
      }
      this.logger.log(`已创建 ${roleMap.size} 个默认角色`);

      // 2. 插入权限项
      const permMap = new Map<string, PermissionEntity>();
      for (const permDef of PERMISSION_DEFINITIONS) {
        const perm = await this.PermissionModel.save({
          perm_key: permDef.perm_key,
          perm_name: permDef.perm_name,
          perm_group: permDef.perm_group,
          description: permDef.description,
          scope_type: permDef.scope_type,
          config_schema: permDef.config_schema,
        });
        permMap.set(permDef.perm_key, perm);
      }
      this.logger.log(`已创建 ${permMap.size} 个权限项`);

      // 3. 插入角色-权限关联（含继承）
      let bindingCount = 0;
      for (const roleDef of DEFAULT_ROLES) {
        const role = roleMap.get(roleDef.role_key);
        if (!role) continue;

        // 获取继承后的完整权限列表
        const allPerms = getInheritedPermissions(roleDef.role_key);
        const allConfigs = getInheritedConfigs(roleDef.role_key);

        for (const permKey of allPerms) {
          const perm = permMap.get(permKey);
          if (!perm) continue;

          await this.RolePermissionModel.save({
            role_id: role.id,
            permission_id: perm.id,
            scope_value: '*',
            config: allConfigs[permKey] || null,
            status: 1,
          });
          bindingCount++;
        }
      }
      this.logger.log(`已创建 ${bindingCount} 个角色-权限绑定`);

      this.logger.log('权限系统默认数据初始化完成');
    } catch (e) {
      this.logger.error('权限系统初始化失败:', e.message);
    }
  }

  private async loadRoleLevelCache() {
    const roles = await this.RoleModel.find({ where: { status: 1 } });
    this.roleLevelCache.clear();
    for (const role of roles) {
      this.roleLevelCache.set(role.role_key, role.role_level);
    }
  }
}
