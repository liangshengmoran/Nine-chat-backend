import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 用户反馈表
 * 存储用户提交的反馈和建议
 */
@Entity({ name: 'tb_feedback' })
export class FeedbackEntity extends BaseEntity {
  @Column({ comment: '反馈用户ID' })
  user_id: number;

  @Column({ default: 0, comment: '反馈类型: 0-建议, 1-Bug反馈, 2-举报, 3-其他' })
  type: number;

  @Column({ length: 200, comment: '反馈标题' })
  title: string;

  @Column('text', { comment: '反馈内容' })
  content: string;

  @Column({ length: 500, nullable: true, comment: '附件图片URL（多个用逗号分隔）' })
  images: string;

  @Column({ default: 0, comment: '处理状态: 0-待处理, 1-处理中, 2-已解决, 3-已忽略' })
  status: number;

  @Column('text', { nullable: true, comment: '管理员回复' })
  reply: string;

  @Column({ nullable: true, comment: '处理人ID' })
  handler_id: number;

  @Column({ nullable: true, comment: '处理时间' })
  handled_at: Date;
}
