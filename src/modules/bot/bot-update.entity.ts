import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * Bot 更新队列实体
 * 用于 getUpdates 长轮询模式，存储待 Bot 拉取的事件
 */
@Entity({ name: 'tb_bot_update' })
@Index('idx_bot_update_bot', ['bot_id'])
@Index('idx_bot_update_consumed', ['bot_id', 'consumed'])
export class BotUpdateEntity extends BaseEntity {
  @Column({ comment: 'Bot ID' })
  bot_id: number;

  @Column({ length: 50, comment: '更新类型: message, command, callback_query' })
  update_type: string;

  @Column({ type: 'simple-json', comment: '事件载荷 JSON' })
  payload: any;

  @Column({ default: false, comment: '是否已被消费' })
  consumed: boolean;
}
