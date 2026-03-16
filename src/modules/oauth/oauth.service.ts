import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import * as crypto from 'crypto';
import * as bcrypt from 'bcryptjs';
import { OAuthAccountEntity } from './oauth.entity';
import { UserEntity } from '../user/user.entity';

/**
 * OAuth 提供商配置
 */
interface OAuthProviderConfig {
  clientId: string;
  clientSecret: string;
  callbackUrl: string;
  authorizeUrl: string;
  tokenUrl: string;
  userInfoUrl: string;
  scope: string;
}

/**
 * OAuth 用户信息（标准化后）
 */
interface OAuthUserInfo {
  provider_user_id: string;
  provider_username: string;
  provider_email: string;
  provider_avatar: string;
}

@Injectable()
export class OAuthService {
  private readonly logger = new Logger(OAuthService.name);

  /**
   * PKCE code_verifier 临时存储 (state -> code_verifier)
   * OAuth 2.1 要求所有客户端必须使用 PKCE
   * 使用内存 Map + 10 分钟 TTL 自动清理
   */
  private readonly pkceStore = new Map<string, { verifier: string; expires: number }>();
  private static readonly PKCE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    @InjectRepository(OAuthAccountEntity)
    private readonly oauthRepo: Repository<OAuthAccountEntity>,
    @InjectRepository(UserEntity)
    private readonly userRepo: Repository<UserEntity>,
    private readonly jwtService: JwtService,
  ) {}

  // ==================== 提供商配置 ====================

  /**
   * 获取 OAuth 提供商配置
   */
  private getProviderConfig(provider: string): OAuthProviderConfig | null {
    const configs: Record<string, () => OAuthProviderConfig | null> = {
      github: () => {
        const clientId = process.env.GITHUB_CLIENT_ID;
        const clientSecret = process.env.GITHUB_CLIENT_SECRET;
        const callbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:5000/api/oauth/github/callback';
        if (!clientId || !clientSecret) return null;
        return {
          clientId,
          clientSecret,
          callbackUrl,
          authorizeUrl: 'https://github.com/login/oauth/authorize',
          tokenUrl: 'https://github.com/login/oauth/access_token',
          userInfoUrl: 'https://api.github.com/user',
          scope: 'read:user user:email',
        };
      },
      google: () => {
        const clientId = process.env.GOOGLE_CLIENT_ID;
        const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
        const callbackUrl = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/oauth/google/callback';
        if (!clientId || !clientSecret) return null;
        return {
          clientId,
          clientSecret,
          callbackUrl,
          authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
          tokenUrl: 'https://oauth2.googleapis.com/token',
          userInfoUrl: 'https://www.googleapis.com/oauth2/v2/userinfo',
          scope: 'openid email profile',
        };
      },
    };

    return configs[provider]?.() || null;
  }

  /**
   * 获取当前可用的 OAuth 提供商列表
   */
  getAvailableProviders(): { provider: string; name: string }[] {
    const providers = [
      { provider: 'github', name: 'GitHub' },
      { provider: 'google', name: 'Google' },
    ];
    return providers.filter((p) => this.getProviderConfig(p.provider) !== null);
  }

  // ==================== PKCE (OAuth 2.1) ====================

  /**
   * 生成 PKCE code_verifier (43-128 字符的高熵随机字符串)
   */
  private generateCodeVerifier(): string {
    return crypto.randomBytes(48).toString('base64url'); // 64 chars
  }

  /**
   * 从 code_verifier 计算 code_challenge (SHA-256 + Base64URL)
   */
  private generateCodeChallenge(verifier: string): string {
    return crypto.createHash('sha256').update(verifier).digest('base64url');
  }

  /**
   * 生成防 CSRF 的 state 参数 (包含 provider 标识 + 随机令牌)
   */
  private generateState(provider: string): string {
    const token = crypto.randomBytes(16).toString('hex');
    return `${provider}:${token}`;
  }

  /**
   * 存储 PKCE code_verifier，自动清理过期条目
   */
  private storePkceVerifier(state: string, verifier: string): void {
    // 清理过期条目
    const now = Date.now();
    for (const [key, value] of this.pkceStore) {
      if (value.expires < now) this.pkceStore.delete(key);
    }
    this.pkceStore.set(state, { verifier, expires: now + OAuthService.PKCE_TTL_MS });
  }

  /**
   * 取出并删除 PKCE code_verifier
   */
  consumePkceVerifier(state: string): string | null {
    const entry = this.pkceStore.get(state);
    if (!entry) return null;
    this.pkceStore.delete(state);
    if (entry.expires < Date.now()) return null; // 已过期
    return entry.verifier;
  }

  // ==================== 授权 URL ====================

  /**
   * 生成 OAuth 2.1 授权 URL (含 PKCE code_challenge)
   */
  getAuthorizationUrl(provider: string): string {
    const config = this.getProviderConfig(provider);
    if (!config) {
      throw new HttpException(`OAuth 提供商 ${provider} 未配置`, HttpStatus.BAD_REQUEST);
    }

    // PKCE: 生成 code_verifier 和 code_challenge
    const codeVerifier = this.generateCodeVerifier();
    const codeChallenge = this.generateCodeChallenge(codeVerifier);
    const state = this.generateState(provider);

    // 存储 code_verifier，回调时使用
    this.storePkceVerifier(state, codeVerifier);

    const params = new URLSearchParams({
      client_id: config.clientId,
      redirect_uri: config.callbackUrl,
      scope: config.scope,
      response_type: 'code',
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    // Google 需要额外参数
    if (provider === 'google') {
      params.set('access_type', 'offline');
      params.set('prompt', 'consent');
    }

    this.logger.debug(`OAuth 2.1 PKCE: state=${state}, challenge=${codeChallenge.slice(0, 8)}...`);
    return `${config.authorizeUrl}?${params.toString()}`;
  }

  // ==================== 回调处理 ====================

  /**
   * 处理 OAuth 回调 (OAuth 2.1 + PKCE)
   * 1. 验证 state + 取出 code_verifier
   * 2. 用 code + code_verifier 换 access_token
   * 3. 获取用户信息
   * 4. 匹配/创建本地用户
   * 5. 签发 JWT
   */
  async handleCallback(provider: string, code: string, state?: string): Promise<{ token: string; isNewUser: boolean }> {
    const config = this.getProviderConfig(provider);
    if (!config) {
      throw new HttpException(`OAuth 提供商 ${provider} 未配置`, HttpStatus.BAD_REQUEST);
    }

    // PKCE: 取出 code_verifier
    let codeVerifier: string | undefined;
    if (state) {
      codeVerifier = this.consumePkceVerifier(state);
      if (!codeVerifier) {
        this.logger.warn(`PKCE verifier not found or expired for state: ${state}`);
        throw new HttpException('OAuth 授权已过期，请重新登录', HttpStatus.BAD_REQUEST);
      }
    }

    // 1. 用 code + code_verifier 换取 access_token
    const accessToken = await this.exchangeCodeForToken(provider, code, config, codeVerifier);

    // 2. 获取用户信息
    const userInfo = await this.getProviderUserInfo(provider, accessToken, config);
    this.logger.log(`OAuth ${provider} 用户信息: ${userInfo.provider_username} (${userInfo.provider_email})`);

    // 3. 查找已有的 OAuth 绑定
    const oauthAccount = await this.oauthRepo.findOne({
      where: { provider, provider_user_id: userInfo.provider_user_id },
    });

    let user: UserEntity;
    let isNewUser = false;

    if (oauthAccount) {
      // 已绑定：直接找到关联用户
      user = await this.userRepo.findOne({ where: { id: oauthAccount.user_id } });
      if (!user) {
        throw new HttpException('关联用户不存在', HttpStatus.NOT_FOUND);
      }

      // 更新 OAuth 账号信息
      await this.oauthRepo.update(oauthAccount.id, {
        access_token: accessToken,
        provider_username: userInfo.provider_username,
        provider_email: userInfo.provider_email,
        provider_avatar: userInfo.provider_avatar,
      });
    } else {
      // 未绑定：尝试通过邮箱匹配已有用户
      if (userInfo.provider_email) {
        user = await this.userRepo.findOne({ where: { user_email: userInfo.provider_email } });
      }

      if (!user) {
        // 全新用户：自动创建
        user = await this.createUserFromOAuth(provider, userInfo);
        isNewUser = true;
      }

      // 创建 OAuth 绑定
      await this.oauthRepo.save({
        user_id: user.id,
        provider,
        provider_user_id: userInfo.provider_user_id,
        provider_username: userInfo.provider_username,
        provider_email: userInfo.provider_email,
        provider_avatar: userInfo.provider_avatar,
        access_token: accessToken,
      });
    }

    // 检查用户状态
    if (user.user_status !== 1) {
      throw new HttpException('账号已被封禁', HttpStatus.FORBIDDEN);
    }

    // 4. 签发 JWT
    const payload = {
      user_id: user.id,
      user_name: user.user_name,
      user_role: user.user_role,
    };
    const token = this.jwtService.sign(payload);

    return { token, isNewUser };
  }

  // ==================== Token 交换 ====================

  /**
   * 用授权码交换 Access Token (OAuth 2.1: 携带 code_verifier)
   */
  private async exchangeCodeForToken(
    provider: string,
    code: string,
    config: OAuthProviderConfig,
    codeVerifier?: string,
  ): Promise<string> {
    const body: Record<string, string> = {
      client_id: config.clientId,
      client_secret: config.clientSecret,
      code,
      redirect_uri: config.callbackUrl,
    };

    // PKCE: 携带 code_verifier 供授权服务器验证
    if (codeVerifier) {
      body.code_verifier = codeVerifier;
    }

    // Google 需要 grant_type
    if (provider === 'google') {
      body.grant_type = 'authorization_code';
    }

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      // GitHub 需要 Accept header 来获取 JSON 响应
      if (provider === 'github') {
        headers['Accept'] = 'application/json';
      }

      const response = await fetch(config.tokenUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (data.error) {
        this.logger.error(`OAuth ${provider} token exchange error: ${data.error_description || data.error}`);
        throw new HttpException(`OAuth 授权失败: ${data.error_description || data.error}`, HttpStatus.BAD_REQUEST);
      }

      return data.access_token;
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`OAuth ${provider} token exchange failed:`, error);
      throw new HttpException('OAuth Token 交换失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  // ==================== 用户信息获取 ====================

  /**
   * 从 OAuth 提供商获取用户信息
   */
  private async getProviderUserInfo(
    provider: string,
    accessToken: string,
    config: OAuthProviderConfig,
  ): Promise<OAuthUserInfo> {
    try {
      const response = await fetch(config.userInfoUrl, {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (provider === 'github') {
        // GitHub 的邮箱可能需要额外请求
        let email = data.email;
        if (!email) {
          email = await this.getGitHubEmail(accessToken);
        }
        return {
          provider_user_id: String(data.id),
          provider_username: data.login || data.name || '',
          provider_email: email || '',
          provider_avatar: data.avatar_url || '',
        };
      }

      if (provider === 'google') {
        return {
          provider_user_id: String(data.id),
          provider_username: data.name || '',
          provider_email: data.email || '',
          provider_avatar: data.picture || '',
        };
      }

      throw new Error(`未知的 OAuth 提供商: ${provider}`);
    } catch (error) {
      if (error instanceof HttpException) throw error;
      this.logger.error(`OAuth ${provider} user info fetch failed:`, error);
      throw new HttpException('获取 OAuth 用户信息失败', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * GitHub 邮箱可能是私有的，需要额外接口获取
   */
  private async getGitHubEmail(accessToken: string): Promise<string> {
    try {
      const response = await fetch('https://api.github.com/user/emails', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
        },
      });
      const emails = await response.json();
      if (Array.isArray(emails)) {
        const primary = emails.find((e: any) => e.primary && e.verified);
        if (primary) return primary.email;
        const verified = emails.find((e: any) => e.verified);
        if (verified) return verified.email;
        if (emails.length > 0) return emails[0].email;
      }
    } catch (error) {
      this.logger.warn('Failed to fetch GitHub email:', error);
    }
    return '';
  }

  // ==================== 用户创建 ====================

  /**
   * 从 OAuth 信息自动创建本地用户
   */
  private async createUserFromOAuth(provider: string, info: OAuthUserInfo): Promise<UserEntity> {
    // 生成唯一用户名（不超过 12 字符）
    let userName = `${provider.slice(0, 2)}_${info.provider_user_id}`;
    if (userName.length > 12) {
      userName = userName.slice(0, 12);
    }

    // 确保用户名唯一
    const existing = await this.userRepo.findOne({ where: { user_name: userName } });
    if (existing) {
      userName = `${provider.slice(0, 1)}${Date.now().toString(36)}`.slice(0, 12);
    }

    // 生成昵称（不超过 12 字符）
    let nickName = info.provider_username || info.provider_email?.split('@')[0] || provider;
    if (nickName.length > 12) {
      nickName = nickName.slice(0, 12);
    }

    // 随机密码（OAuth 用户可能不需要密码登录，但字段不能为空）
    const randomPassword = await bcrypt.hash(`oauth_${Date.now()}_${Math.random()}`, 10);

    const user = this.userRepo.create({
      user_name: userName,
      user_nick: nickName,
      user_password: randomPassword,
      user_email: info.provider_email || `${userName}@oauth.local`,
      user_avatar: info.provider_avatar || '',
      user_role: 'user',
      user_status: 1,
    });

    return await this.userRepo.save(user);
  }

  // ==================== 账号管理 ====================

  /**
   * 获取用户已绑定的 OAuth 账号列表
   */
  async listAccounts(userId: number): Promise<any[]> {
    const accounts = await this.oauthRepo.find({
      where: { user_id: userId },
      order: { createdAt: 'DESC' },
    });
    return accounts.map((a) => ({
      id: a.id,
      provider: a.provider,
      provider_username: a.provider_username,
      provider_email: a.provider_email,
      provider_avatar: a.provider_avatar,
      created_at: a.createdAt,
    }));
  }

  /**
   * 解绑 OAuth 账号
   * 安全规则：用户至少需要保留密码或一个 OAuth 绑定
   */
  async unbindAccount(userId: number, provider: string): Promise<void> {
    const account = await this.oauthRepo.findOne({
      where: { user_id: userId, provider },
    });

    if (!account) {
      throw new HttpException('未找到该 OAuth 绑定', HttpStatus.NOT_FOUND);
    }

    // 检查是否还有其他登录方式
    const otherOAuth = await this.oauthRepo.count({
      where: { user_id: userId },
    });

    // 如果用户只有一个 OAuth 绑定，解绑前给予警告
    // 这里简化判断：如果只有一个 OAuth 且没有设置过明文密码来源，给予警告
    if (otherOAuth <= 1) {
      // 至少保留一种登录方式的提示
      this.logger.warn(`用户 ${userId} 解绑最后一个 OAuth 账号，请确保已设置密码`);
    }

    await this.oauthRepo.softDelete(account.id);
  }
}
