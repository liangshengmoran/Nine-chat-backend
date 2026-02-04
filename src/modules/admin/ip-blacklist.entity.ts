import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * IP黑名单表
 * 存储被封禁的IP地址
 */
@Entity({ name: 'tb_ip_blacklist' })
export class IpBlacklistEntity extends BaseEntity {
  @Column({ length: 50, unique: true, comment: 'IP地址（支持通配符，如192.168.1.*）' })
  ip: string;

  @Column({ length: 255, nullable: true, comment: '封禁原因' })
  reason: string;

  @Column({ comment: '操作者ID' })
  operator_id: number;

  @Column({ length: 50, comment: '操作者昵称' })
  operator_nick: string;

  @Column({ default: 1, comment: '状态: 1-封禁中, 0-已解除' })
  status: number;

  @Column({ nullable: true, comment: '解封时间（null表示永久封禁）' })
  expire_at: Date;
}
