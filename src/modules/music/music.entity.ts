import { Column, Entity } from 'typeorm';
import { BaseEntity } from 'src/common/entity/baseEntity';

/**
 * 音乐曲库表
 * 存储系统曲库中的所有歌曲信息，包括已点过、被收藏的歌曲
 */
@Entity({ name: 'tb_music' })
export class MusicEntity extends BaseEntity {
  @Column({ length: 300, comment: '歌曲所属专辑名称', nullable: true })
  music_album: string;

  @Column({ length: 300, comment: '歌曲名称' })
  music_name: string;

  @Column({ length: 100, unique: true, comment: '歌曲唯一标识：酷狗为hash值，网易云为歌曲id' })
  music_mid: string;

  @Column({ comment: '歌曲时长（秒）', nullable: true })
  music_duration: number;

  @Column({ length: 300, comment: '歌曲演唱者/歌手名称' })
  music_singer: string;

  @Column({ length: 500, comment: '歌曲封面图片URL', nullable: true })
  music_cover: string;

  @Column({ comment: '是否推荐到热门歌曲列表: 1-推荐, 0-普通, -1-不推荐', default: 0 })
  is_recommend: number;

  @Column({ length: 20, comment: '音乐来源平台: kugou-酷狗音乐, netease-网易云音乐', default: 'kugou' })
  source: string;
}
