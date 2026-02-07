import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';
import { BotEntity } from './bot.entity';

/**
 * Bot 管理员关联表
 * 允许 Bot Owner 授权其他用户管理 Bot
 */
@Entity({ name: 'tb_bot_manager' })
@Index('idx_bot_manager_bot', ['bot_id'])
@Index('idx_bot_manager_user', ['user_id'])
@Index('idx_bot_manager_unique', ['bot_id', 'user_id'], { unique: true })
export class BotManagerEntity extends BaseEntity {
  @Column({ comment: 'Bot ID' })
  bot_id: number;

  @Column({ comment: '被授权用户ID' })
  user_id: number;

  @Column({
    length: 20,
    default: 'operator',
    comment: '权限级别: admin-可再授权, operator-只能操作',
  })
  role: 'admin' | 'operator';

  @Column({ comment: '授权人ID' })
  granted_by: number;

  @Column({ nullable: true, comment: '授权说明' })
  note: string;

  // 关联 BotEntity
  @ManyToOne(() => BotEntity)
  @JoinColumn({ name: 'bot_id' })
  bot: BotEntity;
}
