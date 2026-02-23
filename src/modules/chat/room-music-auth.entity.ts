import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 房间音乐账号授权表
 * 每个房间可独立绑定酷狗/网易云音乐账号
 */
@Entity({ name: 'tb_room_music_auth' })
export class RoomMusicAuthEntity extends BaseEntity {
  @Column({ comment: '房间ID' })
  room_id: number;

  @Column({ comment: '授权人用户ID' })
  user_id: number;

  @Column({ length: 20, default: 'kugou', comment: '音乐平台: kugou / netease' })
  source: string;

  @Column({ type: 'text', comment: '音乐平台 Cookie / Token（加密存储）' })
  auth_cookie: string;

  @Column({ length: 100, nullable: true, comment: '音乐平台用户ID（酷狗userid等）' })
  auth_userid: string;

  @Column({ length: 100, nullable: true, comment: '音乐平台昵称（展示用）' })
  nickname: string;

  @Column({ length: 500, nullable: true, comment: '音乐平台头像URL' })
  avatar: string;

  @Column({ default: 1, comment: '状态: 1=有效, 0=已撤销' })
  status: number;
}
