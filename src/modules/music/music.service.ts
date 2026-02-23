import { CollectEntity } from './collect.entity';
import { MusicEntity } from './music.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { Repository } from 'typeorm';
import {
  getAlbumList,
  initMusicSheet,
  getHotMusic,
  searchMusicUnified,
  getMusicSrcUnified,
  getMusicDetailUnified,
} from 'src/utils/spider';
import { addAlbumDto } from './dto/addAlbum.dto';

@Injectable()
export class MusicService {
  constructor(
    @InjectRepository(MusicEntity)
    private readonly MusicModel: Repository<MusicEntity>,
    @InjectRepository(CollectEntity)
    private readonly CollectModel: Repository<CollectEntity>,
  ) {}

  /* 初始化给官方聊天室将首页推荐的专辑加入到库里 */
  async onModuleInit() {
    await this.initMusicList();
    // this.getAlbumList({ albumId: 3495945238 });
  }

  /* 通过专辑ID添加当前专辑歌曲到曲库 */
  async getAlbumList(params: addAlbumDto) {
    const { page = 1, size = 99, albumId } = params;
    const musicList = await getAlbumList({ albumId, page, size });
    console.log(`当前专辑查询到了歌曲数量为${musicList.length},排队加入中`);
    const addList = [];
    for (const music of musicList) {
      const { music_mid } = music;
      const existingMusic = await this.MusicModel.findOne({
        where: { music_mid },
      });
      if (!existingMusic) {
        await this.MusicModel.save(music);
        addList.push(music);
      }
    }
    console.log('本次加入曲库的歌曲数量: ', addList.length);
    return {
      tips: '当前为成功加入曲库的歌曲',
      data: addList,
    };
  }

  /**
   * @desc 项目启动的时候初始化一下基础歌单,如果歌单没有歌曲、就会去加载酷我专辑页面的前三个专辑的各30首歌曲
   * @params pageSize 需要几个歌单 默认10个
   *     一个歌单下默认拿10首歌曲 自己配置默认数量即可
   *     用于没有人点歌的时候随机播放的歌曲
   *     想要自己选歌单 参考此页面  https://kuwo.cn/playlists  修改page pageSize即可 只用于项目初始化
   * @returns musicList [] 返回歌曲列表
   */
  async initMusicList() {
    const params = { page: 1, pageSize: 10 };
    const musicCount = await this.MusicModel.count();
    if (musicCount) {
      return console.log(`当前曲库共有${musicCount}首音乐，初始化会默认填充曲库，具体添加方法查看readme`);
    } else {
      console.log(`>>>>>>>>>>>>> 当前曲库没有任何音乐, 将默认为您随机添加一些歌曲。`);
    }

    const musicList = await initMusicSheet(params);
    const addList = [];
    for (const music of musicList) {
      const { music_mid } = music;
      const existingMusic = await this.MusicModel.findOne({
        where: { music_mid },
      });
      if (!existingMusic) {
        await this.MusicModel.save(music);
        addList.push(music);
      }
    }
    /* 歌曲建议少量 可以相对减少或者分批存入 */
    musicList.length && console.log(`>>>>>>>>>>>>> 初始化歌单成功、共获取${addList.length}首歌曲。`);
    return musicList;
  }

  /**
   * @desc 调试接口：强制重新填充曲库
   * @param keywords 搜索关键词数组
   * @param pageSize 每个关键词获取的歌曲数量
   * @param clearExisting 是否清空现有曲库
   */
  async refillMusicLibrary(params: { keywords?: string[]; pageSize?: number; clearExisting?: boolean }) {
    const {
      keywords = ['热门', '流行', '经典', '抖音', '网红', '周杰伦', '陈奕迅', '林俊杰'],
      pageSize = 10,
      clearExisting = false,
    } = params;

    // 如果需要清空现有曲库
    if (clearExisting) {
      const deleteResult = await this.MusicModel.delete({});
      console.log(`已清空曲库，删除了 ${deleteResult.affected} 首歌曲`);
    }

    const addedSongs = [];
    const failedKeywords = [];
    const existingSongs = [];

    for (const keyword of keywords) {
      try {
        const result = await searchMusicUnified(keyword, 1, pageSize, 'kugou');
        for (const music of result.list) {
          const { music_mid } = music;
          const existingMusic = await this.MusicModel.findOne({ where: { music_mid } });
          if (!existingMusic) {
            const musicData = {
              music_mid,
              music_name: music.music_name || '',
              music_singer: music.music_singer || '',
              music_album: music.music_album || '',
              music_cover: music.music_cover || '',
              music_duration: music.music_duration || 0,
              source: 'kugou',
            };
            await this.MusicModel.save(musicData);
            addedSongs.push(musicData);
          } else {
            existingSongs.push(music.music_name);
          }
        }
      } catch (error) {
        console.error(`搜索关键词 "${keyword}" 失败:`, error.message);
        failedKeywords.push(keyword);
      }
    }

    const totalCount = await this.MusicModel.count();
    console.log(`曲库填充完成: 新增 ${addedSongs.length} 首，总共 ${totalCount} 首`);

    return {
      success: true,
      message: `曲库填充完成`,
      data: {
        added_count: addedSongs.length,
        skipped_count: existingSongs.length,
        failed_keywords: failedKeywords,
        total_count: totalCount,
        added_songs: addedSongs.slice(0, 10), // 只返回前10首作为示例
      },
    };
  }

  /* 查询搜索音乐 - 支持多音源 */
  async search(params) {
    const { keyword, page = 1, pagesize = 30, source = 'kugou' } = params;
    try {
      const result = await searchMusicUnified(keyword, page, pagesize, source);
      return result.list.map((t) => ({
        music_mid: t.music_mid,
        music_duration: t.music_duration,
        music_album: t.music_album,
        music_singer: t.music_singer,
        music_cover: t.music_cover,
        music_name: t.music_name,
        source: t.source || source,
        isPlay: true,
      }));
    } catch (error) {
      throw new HttpException(`没有搜索到歌曲`, HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * @desc 收藏音乐
   *  1. 所有人收藏的歌曲都要加入到歌曲曲库中 当前没有热门歌曲推荐机制、管理员权限的人点的歌曲就全部加入到热门列表
   *  2. 管理员收藏的歌默认其为推荐状态 如果歌曲存在曲库就改变其推荐状态 不存在就加入到曲库
   * @returns
   */
  async collectMusic(payload, params) {
    const { music_mid, music_name, music_singer, music_album, music_cover, music_albumpic, source } = params;
    const { user_id, user_role } = payload;
    const c = await this.CollectModel.count({
      where: { music_mid, user_id, status: 1 },
    });
    if (c > 0) {
      throw new HttpException(`您已经收藏过这首歌了！`, HttpStatus.BAD_REQUEST);
    }

    // 检查是否有之前取消收藏的记录（soft-delete, status=0），如果有则恢复
    const existing = await this.CollectModel.findOne({
      where: { music_mid, user_id, status: 0 },
    });
    if (existing) {
      await this.CollectModel.update(
        { id: existing.id },
        {
          status: 1,
          music_name: music_name || existing.music_name || '',
          music_singer: music_singer || existing.music_singer || '',
          music_album: music_album || existing.music_album || '',
          music_cover: music_cover || music_albumpic || existing.music_cover || '',
          music_albumpic: music_albumpic || music_cover || existing.music_albumpic || '',
          source: source || existing.source || 'kugou',
        },
      );
    } else {
      // 全新收藏，插入新记录
      const collectData = {
        user_id,
        music_mid,
        music_name: music_name || '',
        music_singer: music_singer || '',
        music_album: music_album || '',
        music_cover: music_cover || music_albumpic || '',
        music_albumpic: music_albumpic || music_cover || '',
        source: source || 'kugou',
      };
      await this.CollectModel.save(collectData);
    }

    // 管理员收藏的歌曲加入推荐
    const isRecommend = user_role === 'admin' ? 1 : 0;
    const musicData = {
      music_mid,
      music_name: music_name || '',
      music_singer: music_singer || '',
      music_album: music_album || '',
      music_cover: music_cover || music_albumpic || '',
      source: source || 'kugou',
      recommend_status: isRecommend,
    };

    const m = await this.MusicModel.count({ where: { music_mid } });
    if (m) {
      if (isRecommend) {
        return await this.MusicModel.update({ music_mid }, { recommend_status: 1 });
      }
      return '收藏成功';
    }
    return await this.MusicModel.save(musicData);
  }

  /* 获取收藏歌单 */
  async collectList(payload, params) {
    const { page = 1, pagesize = 30 } = params;
    if (!payload) {
      throw new HttpException('请先登录', HttpStatus.UNAUTHORIZED);
    }
    const { user_id } = payload;
    return await this.CollectModel.find({
      where: { user_id, status: 1 },
      order: { id: 'DESC' },
      skip: (page - 1) * pagesize,
      take: pagesize,
      cache: true,
    });
  }

  /* 移除收藏音乐 */
  async removeCollect(payload, params) {
    const { music_mid } = params;
    const { user_id } = payload;
    const u = await this.CollectModel.findOne({
      where: { user_id, music_mid, status: 1 },
    });
    if (u) {
      await this.CollectModel.update({ id: u.id }, { status: 0 });
      return '移除完成';
    } else {
      throw new HttpException('无权移除此歌曲！', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * @desc 获取热门歌曲 - 使用酷狗每日推荐接口
   * @returns
   */
  async hot(params) {
    const { page = 1, pagesize = 30 } = params;
    try {
      const hotMusic = await getHotMusic();
      // 分页处理
      const start = (page - 1) * pagesize;
      const end = start + pagesize;
      return hotMusic.slice(start, end);
    } catch (error) {
      // 如果酷狗接口失败，回退到用户收藏列表
      const { user_id = 1 } = params;
      return await this.CollectModel.find({
        where: { user_id, status: 1 },
        order: { id: 'DESC' },
        skip: (page - 1) * pagesize,
        take: pagesize,
        cache: true,
      });
    }
  }

  /**
   * @desc 获取歌曲播放地址
   * @param mid 歌曲 ID (酷狗hash/网易云id)
   * @param source 音源
   */
  async getPlayUrl(mid: string, source = 'kugou') {
    try {
      const result = await getMusicSrcUnified(mid, source);
      return { play_url: result.url, timeLength: result.timeLength };
    } catch (error) {
      throw new HttpException('获取播放地址失败', HttpStatus.BAD_REQUEST);
    }
  }

  /**
   * @desc 获取歌曲详情（包含歌词、封面等）
   * @param mid 歌曲 ID (酷狗hash/网易云id)
   * @param source 音源
   */
  async getDetail(mid: string, source = 'kugou') {
    try {
      const detail = await getMusicDetailUnified(mid, source);
      return detail;
    } catch (error) {
      throw new HttpException('获取歌曲详情失败', HttpStatus.BAD_REQUEST);
    }
  }
}
