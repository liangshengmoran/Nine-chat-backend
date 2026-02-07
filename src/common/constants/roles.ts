/**
 * 用户权限系统 - 7级权限体系 (含Bot)
 * super (最高权限) → admin → owner → moderator → user / bot → guest (最低权限)
 */

// 用户角色枚举
export enum UserRole {
  SUPER = 'super', // 超级管理员 - 系统最高权限
  ADMIN = 'admin', // 管理员 - 系统管理权限
  OWNER = 'owner', // 房主 - 房间管理权限（运行时计算）
  MODERATOR = 'moderator', // 房间管理员 - 协助管理权限（数据库存储）
  USER = 'user', // 普通用户 - 基础互动权限
  BOT = 'bot', // 机器人 - API接入权限
  GUEST = 'guest', // 游客 - 仅限浏览
}

// 全局角色（存储在用户表中）
export type GlobalRole = 'super' | 'admin' | 'user' | 'bot' | 'guest';

// 房间角色（运行时计算或从房间管理员表获取）
export type RoomRole = 'owner' | 'moderator';

// 有效角色（综合全局角色和房间角色后的最终角色）
export type EffectiveRole = 'super' | 'admin' | 'owner' | 'moderator' | 'user' | 'bot' | 'guest';

// 权限等级映射 (数值越高权限越大)
export const ROLE_LEVEL: Record<string, number> = {
  [UserRole.GUEST]: 0,
  [UserRole.BOT]: 1, // Bot与普通用户同级
  [UserRole.USER]: 1,
  [UserRole.MODERATOR]: 2,
  [UserRole.OWNER]: 3,
  [UserRole.ADMIN]: 4,
  [UserRole.SUPER]: 5,
};

// 角色中文名称映射
export const ROLE_NAMES: Record<string, string> = {
  [UserRole.SUPER]: '超级管理员',
  [UserRole.ADMIN]: '管理员',
  [UserRole.OWNER]: '房主',
  [UserRole.MODERATOR]: '房间管理员',
  [UserRole.USER]: '用户',
  [UserRole.BOT]: '机器人',
  [UserRole.GUEST]: '游客',
};

// 角色显示颜色
export const ROLE_COLORS: Record<string, string> = {
  [UserRole.SUPER]: '#d4af37', // 金色
  [UserRole.ADMIN]: '#d4af37', // 金色
  [UserRole.OWNER]: '#9b59b6', // 紫色
  [UserRole.MODERATOR]: '#3498db', // 蓝色
  [UserRole.USER]: '#999999', // 灰色
  [UserRole.BOT]: '#667eea', // 渐变紫蓝
  [UserRole.GUEST]: '#cccccc', // 浅灰色
};

/**
 * 检查用户是否拥有指定权限
 * @param userRole 用户角色
 * @param requiredRole 所需角色
 * @returns 是否拥有权限
 */
export function hasPermission(userRole: string, requiredRole: string): boolean {
  const userLevel = ROLE_LEVEL[userRole] ?? 0;
  const requiredLevel = ROLE_LEVEL[requiredRole] ?? 0;
  return userLevel >= requiredLevel;
}

/**
 * 获取用户在房间内的有效角色
 * 优先级: 全局角色(super/admin) > 房主 > 房间管理员 > 全局角色(user/guest)
 * @param globalRole 用户的全局角色
 * @param userId 用户ID
 * @param roomOwnerId 房主ID
 * @param moderatorIds 房间管理员ID列表
 * @returns 有效角色
 */
export function getEffectiveRole(
  globalRole: string,
  userId: number,
  roomOwnerId: number,
  moderatorIds: number[] = [],
): EffectiveRole {
  // 全局高权限角色优先
  if (globalRole === UserRole.SUPER) return UserRole.SUPER;
  if (globalRole === UserRole.ADMIN) return UserRole.ADMIN;

  // 房间角色
  if (userId === roomOwnerId) return UserRole.OWNER;
  if (moderatorIds.includes(userId)) return UserRole.MODERATOR;

  // 默认返回全局角色
  if (globalRole === UserRole.USER) return UserRole.USER;
  return UserRole.GUEST;
}

/**
 * 检查用户是否可以管理房间（切歌、移除歌曲等）
 * @param effectiveRole 有效角色
 * @returns 是否可以管理房间
 */
export function canManageRoom(effectiveRole: string): boolean {
  return hasPermission(effectiveRole, UserRole.MODERATOR);
}

/**
 * 检查用户是否是系统管理员（super 或 admin）
 * @param role 用户角色
 * @returns 是否是系统管理员
 */
export function isSystemAdmin(role: string): boolean {
  return [UserRole.SUPER, UserRole.ADMIN].includes(role as UserRole);
}

/**
 * 检查用户是否可以点歌
 * @param effectiveRole 有效角色
 * @returns 是否可以点歌
 */
export function canChooseMusic(effectiveRole: string): boolean {
  return hasPermission(effectiveRole, UserRole.USER);
}

/**
 * 获取点歌冷却时间（秒）
 * @param effectiveRole 有效角色
 * @returns 冷却时间，0表示无限制，-1表示禁止
 */
export function getMusicCooldown(effectiveRole: string): number {
  if (hasPermission(effectiveRole, UserRole.MODERATOR)) return 0; // 无限制
  if (effectiveRole === UserRole.USER) return 8; // 8秒冷却
  return -1; // 游客禁止点歌
}

/**
 * 检查用户是否可以切歌
 * @param effectiveRole 有效角色
 * @param userId 用户ID
 * @param chooserId 点歌人ID
 * @returns 是否可以切歌
 */
export function canCutMusic(effectiveRole: string, userId: number, chooserId: number): boolean {
  // 管理员和房主可以切任何歌
  if (hasPermission(effectiveRole, UserRole.OWNER)) return true;
  // 点歌人可以切自己点的歌
  if (userId === chooserId) return true;
  return false;
}

/**
 * 检查用户是否可以移除歌单中的歌曲
 * @param effectiveRole 有效角色
 * @param userId 用户ID
 * @param chooserId 点歌人ID
 * @returns 是否可以移除
 */
export function canRemoveMusic(effectiveRole: string, userId: number, chooserId: number): boolean {
  // 房间管理员及以上可以移除任何歌曲
  if (hasPermission(effectiveRole, UserRole.MODERATOR)) return true;
  // 点歌人可以移除自己点的歌
  if (userId === chooserId) return true;
  return false;
}
