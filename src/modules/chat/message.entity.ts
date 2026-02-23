import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 聊天消息表
 * 存储用户在房间内发送的消息记录
 */
@Entity({ name: 'tb_message' })
@Index('idx_message_room', ['room_id'])
@Index('idx_message_user', ['user_id'])
export class MessageEntity extends BaseEntity {
  @Column({ comment: '发送消息的用户ID' })
  user_id: number;

  @Column({ comment: '消息所属房间ID' })
  room_id: number;

  @Column('text', { comment: '消息内容（支持富文本/表情/图片等）' })
  message_content: string;

  @Column({ length: 64, comment: '消息类型: text-文本, image-图片, file-文件, emotion-表情, quote-引用' })
  message_type: string;

  @Column({ nullable: true, comment: '被引用消息的发送者用户ID' })
  quote_user_id: number;

  @Column({ nullable: true, comment: '被引用消息的ID' })
  quote_message_id: number;

  @Column({ comment: '消息状态: 1-正常, -1-已撤回', default: 1 })
  message_status: number;

  @Column({ type: 'simple-json', nullable: true, comment: 'Bot 内联键盘 (inline_keyboard JSON)' })
  reply_markup: any;

  @Column({ type: 'simple-json', nullable: true, comment: 'Bot @提及的用户ID列表 [1,2,3]' })
  mentions: number[];

  @Column({ length: 20, nullable: true, comment: '消息解析模式: markdown, html' })
  parse_mode: string;
}
