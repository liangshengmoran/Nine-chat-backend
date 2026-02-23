import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * Bot 定时消息实体
 * 存储 Bot 计划发送的定时/周期消息
 */
@Entity({ name: 'tb_bot_scheduled_message' })
@Index('idx_scheduled_bot', ['bot_id'])
@Index('idx_scheduled_next', ['next_send_at', 'status'])
export class BotScheduledMessageEntity extends BaseEntity {
  @Column({ comment: 'Bot ID' })
  bot_id: number;

  @Column({ comment: '目标房间ID' })
  room_id: number;

  @Column({ length: 20, comment: '消息类型: text/img' })
  message_type: string;

  @Column({ type: 'text', comment: '消息内容' })
  message_content: string;

  @Column({ length: 20, default: 'once', comment: '重复模式: once-单次, daily-每天, weekly-每周' })
  repeat: string;

  @Column({ length: 20, nullable: true, comment: '消息解析模式: text/markdown/html' })
  parse_mode: string;

  @Column({ comment: '下次发送时间' })
  next_send_at: Date;

  @Column({ default: 1, comment: '状态: 1-活跃, 0-已取消, 2-已完成' })
  status: number;

  @Column({ default: 0, comment: '已发送次数' })
  sent_count: number;
}
