import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * Webhook 投递日志实体
 * 记录每次 Webhook 推送的结果，用于监控和排查
 */
@Entity({ name: 'tb_bot_webhook_log' })
@Index('idx_webhook_log_bot', ['bot_id'])
@Index('idx_webhook_log_created', ['createdAt'])
export class WebhookLogEntity extends BaseEntity {
  @Column({ comment: 'Bot ID' })
  bot_id: number;

  @Column({ length: 50, comment: '事件类型' })
  event: string;

  @Column({ type: 'simple-json', nullable: true, comment: '发送载荷（截断保存）' })
  payload: any;

  @Column({ default: 0, comment: 'HTTP 响应码' })
  status_code: number;

  @Column({ length: 500, nullable: true, comment: '响应内容（截断）' })
  response_body: string;

  @Column({ default: 1, comment: '第几次尝试 (1-3)' })
  attempt: number;

  @Column({ default: false, comment: '是否成功' })
  success: boolean;

  @Column({ length: 500, nullable: true, comment: '失败原因' })
  error_message: string;
}
