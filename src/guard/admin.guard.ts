import { CanActivate, ExecutionContext, HttpException, Injectable, HttpStatus } from '@nestjs/common';
import { PermissionService } from 'src/common/services/permission.service';

/**
 * 管理员权限守卫
 * 动态检查用户是否拥有任意 admin.* / user.* / system.* 权限
 * 取代旧版硬编码的 ['super', 'admin'] 角色检查
 */
@Injectable()
export class AdminGuard implements CanActivate {
  constructor(private readonly permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.payload;

    if (!payload) {
      throw new HttpException('请先登录', HttpStatus.UNAUTHORIZED);
    }

    const { user_id, user_role } = payload;

    // 动态检查：用户是否拥有任何管理后台相关权限
    const perms = await this.permissionService.getUserPermissions(user_id, undefined, user_role);
    const hasAdminAccess = perms.some(
      (p) => p.startsWith('admin.') || p.startsWith('system.') || p.startsWith('user.'),
    );

    if (!hasAdminAccess) {
      throw new HttpException('无权限访问管理后台', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}

/**
 * 超级管理员权限守卫
 * 检查用户是否拥有 system.manage_roles 权限
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  constructor(private readonly permissionService: PermissionService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.payload;

    if (!payload) {
      throw new HttpException('请先登录', HttpStatus.UNAUTHORIZED);
    }

    const { user_id, user_role } = payload;

    const hasSuperPermission = await this.permissionService.checkPermission(
      user_id,
      'system.manage_roles',
      undefined,
      user_role,
    );

    if (!hasSuperPermission) {
      throw new HttpException('需要超级管理员权限', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
