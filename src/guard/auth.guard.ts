import { CanActivate, ExecutionContext, HttpException, Injectable, HttpStatus } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import { secret, whiteList } from 'src/config/jwt';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const { headers, path, route } = context.switchToRpc().getData();

    if (whiteList.includes(path)) {
      return true;
    }

    // Bot Token 认证的请求跳过 JWT 验证，交给 BotGuard 处理
    const xBotToken = headers['x-bot-token'] || request.headers['x-bot-token'];
    const authHeader = headers.authorization || request.headers.authorization;
    if (xBotToken || (authHeader && authHeader.startsWith('Bot '))) {
      return true;
    }

    const isGet = route.methods.get;
    let token = authHeader;

    // 支持 Bearer Token 格式
    if (token && token.startsWith('Bearer ')) {
      token = token.slice(7);
    }

    if (token) {
      const payload = await this.verifyToken(token, secret);
      // const { user_role } = payload; 具体业务可以根据权限再加  当前项目不需要权限验证 有token即可
      request.payload = payload;
      return true;
    } else {
      if (isGet) return true;
      throw new HttpException('你还没登录,请先登录', HttpStatus.UNAUTHORIZED);
    }
  }

  /**
   * @desc 全局校验token
   * @param token
   * @param secret
   * @returns
   */
  private verifyToken(token: string, secret: string): Promise<any> {
    return new Promise((resolve) => {
      jwt.verify(token, secret, (error, payload) => {
        if (error) {
          throw new HttpException('身份验证失败', HttpStatus.UNAUTHORIZED);
        } else {
          resolve(payload);
        }
      });
    });
  }
}
