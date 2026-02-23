import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * Bot 实体表
 * 存储第三方 Bot 应用的配置信息
 */
@Entity({ name: 'tb_bot' })
@Index('idx_bot_token', ['bot_token'], { unique: true })
@Index('idx_bot_username', ['bot_username'], { unique: true })
@Index('idx_bot_owner', ['owner_id'])
export class BotEntity extends BaseEntity {
  @Column({ length: 50, comment: 'Bot名称 (显示名)' })
  bot_name: string;

  @Column({ length: 32, unique: true, comment: 'Bot用户名 (唯一标识, 必须以_bot结尾, 如: music_bot)' })
  bot_username: string;

  @Column({ length: 100, unique: true, comment: 'Bot Token (API认证)' })
  bot_token: string;

  @Column({ comment: '创建者用户ID' })
  owner_id: number;

  @Column({ length: 255, nullable: true, comment: 'Bot头像URL' })
  bot_avatar: string;

  @Column({ length: 200, nullable: true, comment: 'Bot描述' })
  bot_description: string;

  @Column({ default: 1, comment: '状态: 1-启用, 0-禁用' })
  status: number;

  @Column('simple-array', { nullable: true, comment: '允许接入的房间ID列表 (空表示全部)' })
  allowed_rooms: string;

  @Column({ default: 60, comment: '每分钟请求限制' })
  rate_limit: number;

  @Column({ default: 8, comment: '点歌冷却时间(秒), -1表示禁止点歌, 0表示无冷却' })
  music_cooldown: number;

  @Column({ length: 500, nullable: true, comment: 'Webhook URL (推送消息到Bot应用)' })
  webhook_url: string;

  @Column({ length: 100, nullable: true, comment: 'Webhook Secret (用于签名验证)' })
  webhook_secret: string;

  @Column({ default: 0, comment: 'Webhook状态: 0-未配置, 1-正常, -1-失败' })
  webhook_status: number;

  @Column({ nullable: true, comment: '最后活跃时间' })
  last_active_at: Date;

  @Column({ default: 0, comment: '今日请求次数 (用于统计)' })
  today_requests: number;

  @Column({ default: 0, comment: '总请求次数' })
  total_requests: number;

  // ==================== 命令系统字段 ====================

  @Column({
    type: 'simple-json',
    nullable: true,
    comment: 'Bot注册的命令列表 [{command, description}]',
  })
  commands: { command: string; description: string }[];

  // ==================== 审批机制字段 ====================

  @Column({
    length: 20,
    default: 'pending',
    comment: '审批状态: pending-待审批, approved-已通过, rejected-已拒绝, suspended-已暂停',
  })
  approval_status: 'pending' | 'approved' | 'rejected' | 'suspended';

  @Column({ nullable: true, comment: '审批人用户ID' })
  approved_by: number;

  @Column({ nullable: true, comment: '审批时间' })
  approved_at: Date;

  @Column({ length: 500, nullable: true, comment: '拒绝/暂停原因' })
  rejection_reason: string;

  // ==================== 权限分级字段 ====================

  @Column({
    type: 'simple-json',
    nullable: true,
    comment: 'Bot权限配置JSON',
  })
  permissions: {
    can_send_message: boolean; // 发送消息
    can_send_image: boolean; // 发送图片
    can_choose_music: boolean; // 点歌
    can_read_history: boolean; // 读取历史消息
    can_mention_users: boolean; // @用户
    can_pin_message: boolean; // 置顶消息
    max_message_length: number; // 最大消息长度
  };
}
