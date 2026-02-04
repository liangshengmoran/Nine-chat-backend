import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 邀请码表
 * 存储注册邀请码
 */
@Entity({ name: 'tb_invite_code' })
export class InviteCodeEntity extends BaseEntity {
  @Column({ length: 20, unique: true, comment: '邀请码' })
  code: string;

  @Column({ comment: '创建者用户ID' })
  creator_id: number;

  @Column({ length: 50, comment: '创建者昵称' })
  creator_nick: string;

  @Column({ default: 1, comment: '可使用次数' })
  max_uses: number;

  @Column({ default: 0, comment: '已使用次数' })
  used_count: number;

  @Column({ default: 1, comment: '状态: 1-有效, 0-无效' })
  status: number;

  @Column({ nullable: true, comment: '过期时间' })
  expire_at: Date;

  @Column({ length: 255, nullable: true, comment: '备注' })
  remark: string;
}
