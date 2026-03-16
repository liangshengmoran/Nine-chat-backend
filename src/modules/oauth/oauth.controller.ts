import { Controller, Get, Post, Param, Query, Request, Res } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Response } from 'express';
import { OAuthService } from './oauth.service';

@ApiTags('OAuth')
@Controller('oauth')
export class OAuthController {
  constructor(private readonly oauthService: OAuthService) {}

  // ==================== 公开接口 ====================

  @Get('/providers')
  @ApiOperation({
    summary: '获取可用的 OAuth 提供商',
    description: `返回当前已配置的 OAuth 登录提供商列表。

**返回内容：**
- 提供商标识符和显示名称
- 仅返回已在 .env 中配置 Client ID/Secret 的提供商

**前端用法：**
- 根据返回结果动态显示登录按钮
- 未配置的提供商不会出现在列表中`,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          { provider: 'github', name: 'GitHub' },
          { provider: 'google', name: 'Google' },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  getProviders() {
    return this.oauthService.getAvailableProviders();
  }

  @Get('/:provider')
  @ApiOperation({
    summary: '发起 OAuth 授权',
    description: `重定向用户到第三方 OAuth 提供商的授权页面。

**支持的提供商：**
- \`github\` - GitHub OAuth
- \`google\` - Google OAuth

**流程：**
1. 前端将用户导航到此接口
2. 后端生成授权 URL 并 302 重定向
3. 用户在第三方页面授权
4. 第三方回调到 /api/oauth/:provider/callback`,
  })
  @ApiParam({ name: 'provider', description: 'OAuth 提供商', enum: ['github', 'google'] })
  @ApiResponse({ status: 302, description: '重定向到 OAuth 授权页面' })
  @ApiResponse({ status: 400, description: 'OAuth 提供商未配置' })
  authorize(@Param('provider') provider: string, @Res() res: Response) {
    const url = this.oauthService.getAuthorizationUrl(provider);
    return res.redirect(url);
  }

  @Get('/:provider/callback')
  @ApiOperation({
    summary: 'OAuth 回调',
    description: `处理第三方 OAuth 提供商的授权回调。

**业务流程：**
1. 用授权码 (code) 交换 Access Token
2. 从提供商获取用户信息
3. 匹配或创建本地用户：
   - 已绑定该 OAuth 账号 → 直接登录
   - 未绑定但邮箱匹配 → 自动绑定已有账号
   - 全新用户 → 自动创建账号
4. 签发 JWT Token
5. 重定向到前端回调页面（携带 token）

**注意：** 此接口由浏览器自动发起（第三方重定向），非手动调用`,
  })
  @ApiParam({ name: 'provider', description: 'OAuth 提供商', enum: ['github', 'google'] })
  @ApiQuery({ name: 'code', description: '授权码', example: 'abc123' })
  @ApiQuery({ name: 'state', description: '状态参数', required: false })
  @ApiResponse({ status: 302, description: '重定向到前端携带 token' })
  @ApiResponse({ status: 400, description: '授权码无效或 OAuth 提供商未配置' })
  async callback(
    @Param('provider') provider: string,
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const frontendUrl = process.env.OAUTH_FRONTEND_URL || 'http://localhost:5173';

    try {
      if (!code) {
        return res.redirect(`${frontendUrl}/oauth/callback?error=no_code`);
      }

      const { token, isNewUser } = await this.oauthService.handleCallback(provider, code, state);

      // 重定向到前端，携带 token
      const params = new URLSearchParams({ token });
      if (isNewUser) params.set('new_user', '1');
      return res.redirect(`${frontendUrl}/oauth/callback?${params.toString()}`);
    } catch (error) {
      const errorMsg = encodeURIComponent(error.message || 'OAuth 登录失败');
      return res.redirect(`${frontendUrl}/oauth/callback?error=${errorMsg}`);
    }
  }

  // ==================== 需要登录的接口 ====================

  @Get('/accounts')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取已绑定的 OAuth 账号',
    description: `获取当前登录用户已绑定的所有第三方 OAuth 账号列表。

**返回内容：**
- 提供商标识、提供商用户名、邮箱、头像
- 绑定时间`,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            id: 1,
            provider: 'github',
            provider_username: 'octocat',
            provider_email: 'octocat@github.com',
            provider_avatar: 'https://avatars.githubusercontent.com/u/1',
            created_at: '2026-03-16T00:00:00.000Z',
          },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  getAccounts(@Request() req) {
    return this.oauthService.listAccounts(req.payload?.user_id);
  }

  @Post('/unbind/:provider')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '解绑 OAuth 账号',
    description: `解除当前用户与指定第三方 OAuth 账号的绑定。

**安全规则：**
- 解绑后用户无法通过该第三方账号登录
- 建议解绑前确保已设置密码或绑定其他 OAuth 账号`,
  })
  @ApiParam({ name: 'provider', description: 'OAuth 提供商', enum: ['github', 'google'] })
  @ApiResponse({
    status: 200,
    description: '解绑成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '未找到该 OAuth 绑定' })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  async unbindAccount(@Request() req, @Param('provider') provider: string) {
    await this.oauthService.unbindAccount(req.payload?.user_id, provider);
    return { success: true };
  }
}
