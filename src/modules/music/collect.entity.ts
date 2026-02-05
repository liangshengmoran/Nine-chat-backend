import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 用户收藏歌曲表
 * 存储用户收藏的歌曲记录，支持多音源
 */
@Entity({ name: 'tb_collect' })
@Index('idx_collect_user_music', ['user_id', 'music_mid'], { unique: true })
export class CollectEntity extends BaseEntity {
  @Column({ comment: '收藏用户的ID' })
  user_id: number;

  @Column({ length: 100, comment: '歌曲唯一标识：酷狗为hash值，网易云为歌曲id' })
  music_mid: string;

  @Column({ length: 255, comment: '歌曲封面图片URL', nullable: true })
  music_cover: string;

  @Column({ length: 255, comment: '歌曲专辑大图URL', nullable: true })
  music_albumpic: string;

  @Column({ length: 255, comment: '歌曲演唱者/歌手名称' })
  music_singer: string;

  @Column({ length: 255, comment: '歌曲所属专辑名称', nullable: true })
  music_album: string;

  @Column({ length: 255, comment: '歌曲名称' })
  music_name: string;

  @Column({ comment: '收藏状态: 1-正常, 0-已取消收藏', default: 1 })
  status: number;

  @Column({ length: 20, comment: '音乐来源平台: kugou-酷狗音乐, netease-网易云音乐', default: 'kugou' })
  source: string;
}
