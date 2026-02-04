import { CanActivate, ExecutionContext, HttpException, Injectable, HttpStatus } from '@nestjs/common';

/**
 * 管理员权限守卫
 * 只允许 super 和 admin 角色访问
 */
@Injectable()
export class AdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.payload;

    if (!payload) {
      throw new HttpException('请先登录', HttpStatus.UNAUTHORIZED);
    }

    const { user_role } = payload;

    if (!['super', 'admin'].includes(user_role)) {
      throw new HttpException('无权限访问管理后台', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}

/**
 * 超级管理员权限守卫
 * 只允许 super 角色访问
 */
@Injectable()
export class SuperAdminGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const payload = request.payload;

    if (!payload) {
      throw new HttpException('请先登录', HttpStatus.UNAUTHORIZED);
    }

    const { user_role } = payload;

    if (user_role !== 'super') {
      throw new HttpException('需要超级管理员权限', HttpStatus.FORBIDDEN);
    }

    return true;
  }
}
