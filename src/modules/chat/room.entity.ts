import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 聊天室房间表
 * 存储聊天房间的基本配置信息
 */
@Entity({ name: 'tb_room' })
export class RoomEntity extends BaseEntity {
  @Column({ unique: true, comment: '房间创建人的用户ID' })
  room_user_id: number;

  @Column({ unique: true, comment: '房间唯一标识ID' })
  room_id: number;

  @Column({ length: 255, nullable: true, comment: '房间Logo图片URL' })
  room_logo: string;

  @Column({ length: 20, comment: '房间名称' })
  room_name: string;

  @Column({ default: 1, comment: '房间访问权限: 1-公开, 2-需要密码' })
  room_need_password: number;

  @Column({ length: 255, nullable: true, comment: '房间访问密码（加密存储）' })
  room_password: string;

  @Column({ length: 512, default: '房间空空如也呢', comment: '房间公告内容' })
  room_notice: string;

  @Column({ length: 255, nullable: true, comment: '房间背景图片URL' })
  room_bg_img: string;
}
