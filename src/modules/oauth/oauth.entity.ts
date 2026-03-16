import { Column, Entity, Unique } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * OAuth 账号关联表
 * 存储用户与第三方 OAuth 账号的绑定关系
 */
@Entity({ name: 'tb_oauth_account' })
@Unique(['provider', 'provider_user_id'])
export class OAuthAccountEntity extends BaseEntity {
  @Column({ comment: '关联的本地用户ID' })
  user_id: number;

  @Column({ length: 20, comment: 'OAuth 提供商: github / google' })
  provider: string;

  @Column({ length: 100, comment: '提供商的用户唯一 ID' })
  provider_user_id: string;

  @Column({ length: 100, nullable: true, comment: '提供商用户名' })
  provider_username: string;

  @Column({ length: 200, nullable: true, comment: '提供商邮箱' })
  provider_email: string;

  @Column({ length: 600, nullable: true, comment: '提供商头像 URL' })
  provider_avatar: string;

  @Column({ length: 1000, nullable: true, comment: '提供商 Access Token' })
  access_token: string;

  @Column({ length: 1000, nullable: true, comment: '提供商 Refresh Token' })
  refresh_token: string;
}
