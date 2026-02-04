import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 操作日志表
 * 记录管理员的操作日志
 */
@Entity({ name: 'tb_operation_log' })
export class OperationLogEntity extends BaseEntity {
  @Column({ comment: '操作者用户ID' })
  operator_id: number;

  @Column({ length: 50, comment: '操作者昵称' })
  operator_nick: string;

  @Column({
    length: 50,
    comment: '操作类型: user_ban, user_unban, message_delete, room_delete, announcement_create, etc.',
  })
  action_type: string;

  @Column({ length: 255, comment: '操作描述' })
  action_desc: string;

  @Column({ nullable: true, comment: '操作目标ID' })
  target_id: number;

  @Column({ length: 50, nullable: true, comment: '操作目标类型: user, room, message, music, etc.' })
  target_type: string;

  @Column('text', { nullable: true, comment: '操作详情（JSON格式）' })
  action_detail: string;

  @Column({ length: 50, nullable: true, comment: '操作者IP地址' })
  operator_ip: string;
}
