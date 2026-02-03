import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 用户表
 * 存储系统用户的基本信息和权限
 */
@Entity({ name: 'tb_user' })
export class UserEntity extends BaseEntity {
  @Column({ length: 12, comment: '用户名（登录账号）' })
  user_name: string;

  @Column({ length: 12, comment: '用户昵称（显示名称）' })
  user_nick: string;

  @Column({ length: 1000, comment: '用户密码（加密存储）' })
  user_password: string;

  @Column({ default: 1, comment: '用户状态: 1-正常, 0-禁用, -1-封禁' })
  user_status: number;

  @Column({ default: 1, comment: '用户性别: 1-男, 2-女, 0-未知' })
  user_sex: number;

  @Column({ length: 64, unique: true, comment: '用户邮箱（唯一）' })
  user_email: string;

  @Column({ length: 600, nullable: true, comment: '用户头像URL' })
  user_avatar: string;

  @Column({
    length: 10,
    default: 'user',
    comment: '用户权限级别: super-超级管理员, admin-管理员, user-普通用户, guest-游客',
  })
  user_role: string;

  @Column({ length: 255, nullable: true, comment: '用户个人聊天室背景图URL' })
  user_room_bg: string;

  @Column({ length: 255, nullable: true, comment: '用户创建的房间ID' })
  user_room_id: string;

  @Column({ length: 255, default: '每个人都有签名、我希望你也有...', comment: '用户个人签名' })
  user_sign: string;
}
