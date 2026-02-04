import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 系统公告表
 * 存储管理员发布的系统公告
 */
@Entity({ name: 'tb_announcement' })
export class AnnouncementEntity extends BaseEntity {
  @Column({ length: 100, comment: '公告标题' })
  title: string;

  @Column('text', { comment: '公告内容' })
  content: string;

  @Column({ comment: '发布者用户ID' })
  publisher_id: number;

  @Column({ length: 50, comment: '发布者昵称' })
  publisher_nick: string;

  @Column({ default: 1, comment: '公告状态: 1-显示, 0-隐藏' })
  status: number;

  @Column({ default: 0, comment: '公告类型: 0-普通, 1-重要, 2-紧急' })
  type: number;

  @Column({ nullable: true, comment: '公告过期时间' })
  expire_at: Date;
}
