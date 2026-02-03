import * as cheerio from 'cheerio';
import axios from 'axios';
import * as Qs from 'qs';
import { HttpException, HttpStatus } from '@nestjs/common';

// 酷狗音乐 API 配置
const KUGOU_API_BASE = process.env.KUGOU_API_BASE || 'https://ku-gou-music-api.qyjm.eu.org';
const KUGOU_TOKEN = process.env.KUGOU_TOKEN || '';
const KUGOU_USERID = process.env.KUGOU_USERID || '';

// 网易云音乐 API 配置
const NETEASE_API_BASE = process.env.NETEASE_API_BASE || 'https://netease-music-api.qyjm.eu.org';

/**
 * @desc 获取酷狗 API 请求头
 * @param needAuth 是否需要验证
 */
const getKugouHeaders = (needAuth = false) => {
  const headers: any = {
    Accept: 'application/json, text/plain, */*',
    'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36 Edg/144.0.0.0',
  };
  if (needAuth && KUGOU_TOKEN && KUGOU_USERID) {
    headers.authorization = `token=${KUGOU_TOKEN};userid=${KUGOU_USERID}`;
    // 添加完整的 Cookie 参数
    headers.cookie = `KUGOU_API_PLATFORM=lite; KUGOU_API_MAC=02:00:00:00:00:00; KUGOU_API_MID=168794559962591586160362213104601160653; KUGOU_API_GUID=0fcc19b7c7b83bcb8699c5b829f11898; KUGOU_API_DEV=AYNHMD02W7; userid=${KUGOU_USERID}; token=${KUGOU_TOKEN}`;
    headers.origin = 'https://music.lsmr.nl';
    headers.referer = 'https://music.lsmr.nl/';
  }
  return headers;
};

/**
 * @desc 请求页面通过cheerio格式化文档返回给业务处理
 * @param url 请求地址
 * @returns
 */
export const requestHtml = async (url) => {
  const body: any = await requestInterface(url);
  return cheerio.load(body);
};

/**
 * @desc axios调用三方接口使用
 */
export const requestInterface = async (url, param = {}, method: any = 'GET') => {
  return new Promise((resolve, reject) => {
    axios({
      method,
      headers: {
        Accept: 'application/json, text/plain, */*',
        'Accept-Language': 'zh-CN,zh;q=0.9',
        'User-Agent':
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/116.0.0.0 Safari/537.36',
      },
      url,
      data: Qs.stringify(param),
    })
      .then((res) => {
        resolve(res.data);
      })
      .catch((err) => {
        reject(err);
      });
  });
};

/**
 * @desc 搜索音乐 - 使用酷狗 API
 * @param keyword 搜索关键词
 * @param page 页码
 * @param pagesize 每页数量
 * @returns
 */
export const searchMusic = async (keyword: string, page = 1, pagesize = 20) => {
  const url = `${KUGOU_API_BASE}/search?keywords=${encodeURIComponent(
    keyword,
  )}&page=${page}&pagesize=${pagesize}&type=song`;
  try {
    const response = await axios.get(url, { headers: getKugouHeaders(true) });
    if (response.data.status === 1 && response.data.data) {
      const { lists, total } = response.data.data;
      return {
        total,
        list: lists.map((t) => {
          // 兼容多种字段名格式
          const songName = t.SongName || t.songname || t.audio_name || t.FileName?.split(' - ')[1] || '';
          const singerName = t.SingerName || t.singername || t.author_name || t.FileName?.split(' - ')[0] || '';
          const albumName = t.AlbumName || t.album_name || '';

          return {
            music_mid: t.Hash || t.hash || t.FileHash,
            music_name: songName,
            music_singer: singerName,
            music_album: albumName,
            music_duration: Math.floor(t.Duration || t.duration || 0),
            music_cover: (t.Image || t.album_sizable_cover || '')?.replace('{size}', '400') || '',
            audio_id: t.Audioid || t.audio_id,
            album_id: t.AlbumID || t.album_id,
            hash: t.Hash || t.hash,
            sq_hash: t.SQHash || t.sq_hash,
            hq_hash: t.HQHash || t.hq_hash,
          };
        }),
      };
    }
    throw new HttpException('搜索失败', HttpStatus.BAD_REQUEST);
  } catch (error) {
    console.error('搜索音乐失败:', error.message);
    throw new HttpException(`搜索失败: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * @desc 获取热门歌单列表 - 使用酷狗 API
 * @param page 页码
 * @param pagesize 每页数量
 */
export const getMusicSheetIds = async (page = 1, pagesize = 3) => {
  const url = `${KUGOU_API_BASE}/top/playlist?page=${page}&pagesize=${pagesize}`;
  try {
    const response = await axios.get(url);
    if (response.data.status === 1 && response.data.data) {
      const list = response.data.data.info || [];
      return list.map((t) => t.specialid);
    }
    return [];
  } catch (error) {
    console.error('获取歌单列表失败:', error.message);
    return [];
  }
};

/**
 * @desc 初始化音乐曲库 - 使用搜索接口获取热门歌曲
 */
export const initMusicSheet = async ({ pageSize = 10 }) => {
  const keywords = ['热门', '流行', '经典', '抖音', '网红'];
  const sumMusic = [];
  const cacheMusicMids = [];

  for (const keyword of keywords) {
    try {
      const result = await searchMusic(keyword, 1, pageSize);
      result.list.forEach((music) => {
        if (!cacheMusicMids.includes(music.music_mid)) {
          sumMusic.push(music);
          cacheMusicMids.push(music.music_mid);
        }
      });
    } catch (error) {
      console.error(`搜索关键词 "${keyword}" 失败:`, error.message);
    }
  }

  console.log(`初始化曲库: 共获取 ${sumMusic.length} 首歌曲`);
  return sumMusic;
};

/**
 * @desc 通过hash获取音乐的详情信息，包含封面、歌词、播放地址等
 * @param mid 音乐 hash
 */
export const getMusicDetail = async (mid) => {
  // 使用 privilege/lite 接口获取歌曲信息和播放地址
  const infoUrl = `${KUGOU_API_BASE}/privilege/lite?hash=${mid}`;
  try {
    const infoRes = await axios.get(infoUrl, { headers: getKugouHeaders(true) });
    if (infoRes.data.status === 1 && infoRes.data.data && infoRes.data.data.length > 0) {
      const songData = infoRes.data.data[0];
      // 字段可能在 songData 或 songData.info 中
      const info = songData.info || songData;

      // 解析歌曲信息 - 从不同可能的字段名获取
      let songName = info.songname || info.audio_name || info.name || songData.name || '';
      let singerName = info.singername || info.author_name || songData.singername || '';

      // 处理歌曲名包含 "歌手 - 歌名" 格式的情况
      if (songName.includes(' - ') && !singerName) {
        const parts = songName.split(' - ');
        singerName = parts[0];
        songName = parts.slice(1).join(' - ');
      } else if (songName.includes(' - ') && songName.startsWith(singerName)) {
        // 如果歌曲名以歌手名开头，提取实际歌曲名
        songName = songName.replace(`${singerName} - `, '');
      }

      const albumName = info.album_name || songData.album_name || '';
      // duration 可能返回秒或毫秒，需要统一转换为秒
      let duration = info.duration || songData.duration || 0;
      // 如果 duration > 10000，说明单位是毫秒，需要转换为秒
      if (duration > 10000) {
        duration = Math.floor(duration / 1000);
      }
      if (!duration) {
        const timelength = info.timelength || songData.timelength || 0;
        duration = timelength > 10000 ? Math.floor(timelength / 1000) : timelength;
      }

      // 获取封面 - 尝试多种可能的字段名
      let cover = '';
      const coverSources = [
        info.album_sizable_cover,
        info.sizable_cover,
        songData.album_sizable_cover,
        songData.sizable_cover,
        info.img,
        songData.img,
        info.cover,
        songData.cover,
      ];
      for (const src of coverSources) {
        if (src) {
          cover = src.replace('{size}', '400');
          break;
        }
      }

      // 获取歌词 - 两步流程
      let lrclist = [];
      try {
        // 步骤1: 获取歌词 id 和 accesskey
        const searchLrcUrl = `${KUGOU_API_BASE}/search/lyric?hash=${mid}`;
        const searchLrcRes = await axios.get(searchLrcUrl, { headers: getKugouHeaders(true) });

        if (
          searchLrcRes.data.status === 200 &&
          searchLrcRes.data.candidates &&
          searchLrcRes.data.candidates.length > 0
        ) {
          const { id: lyricId, accesskey } = searchLrcRes.data.candidates[0];

          // 步骤2: 使用 id 和 accesskey 获取歌词内容
          const lrcUrl = `${KUGOU_API_BASE}/lyric?id=${lyricId}&accesskey=${accesskey}&fmt=krc&decode=true`;
          const lrcRes = await axios.get(lrcUrl, { headers: getKugouHeaders(true) });

          if (lrcRes.data.status === 200 && lrcRes.data.decodeContent) {
            // 解析 decodeContent 中的歌词
            const lrcContent = lrcRes.data.decodeContent;
            const lines = lrcContent.split(/\r?\n/);
            lrclist = lines
              .map((line) => {
                // 匹配 KRC 格式: [开始时间毫秒,持续时间毫秒]<逐字时间标记>歌词
                const match = line.match(/^\[(\d+),\d+\](.*)$/);
                if (match) {
                  const timeMs = parseInt(match[1]);
                  const time = Math.floor(timeMs / 1000);
                  // 清理歌词中的逐字时间标记 <开始,持续,0>
                  let lineLyric = match[2].replace(/<\d+,\d+,\d+>/g, '');
                  // 跳过元数据行 (以 [id:, [ar:, [ti: 等开头的行)
                  if (lineLyric.match(/^(id|ar|ti|by|hash|al|sign|qq|total|offset|language):/i)) {
                    return null;
                  }
                  lineLyric = lineLyric.trim();
                  if (lineLyric) {
                    return { time: time.toString(), lineLyric };
                  }
                }
                return null;
              })
              .filter(Boolean);
          }
        }
      } catch (e) {
        console.error('获取歌词失败:', e.message);
        // 歌词获取失败不影响主流程
      }

      return {
        music_lrc: lrclist,
        music_info: {
          music_singer: singerName,
          music_cover: cover,
          music_albumpic: cover,
          music_duration: duration,
          music_score100: 80,
          music_album: albumName,
          music_name: songName,
          music_song_time_minutes: '',
          music_mid: mid,
          choose_user_id: null,
          source: 'kugou',
        },
        reqid: info.audio_id,
        play_url: info.play_url || info.url || '',
      };
    }
    throw new HttpException('获取歌曲信息失败', HttpStatus.BAD_REQUEST);
  } catch (error) {
    console.error('获取歌曲详情失败:', error.message);
    throw new HttpException(`获取歌曲信息失败: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
};

/**
 * @desc 通过hash获取歌曲播放地址、时长、封面和专辑
 * @param mid 音乐 hash
 * @returns { url: string, timeLength: number, cover: string, album: string } 播放地址、时长(秒)、封面URL和专辑名
 */
export const getMusicSrc = async (mid) => {
  // 使用 /song/url 接口获取播放地址 (该接口返回 timeLength 和 union_cover)
  const url = `${KUGOU_API_BASE}/song/url?hash=${mid}&quality=high`;
  try {
    const response = await axios.get(url, { headers: getKugouHeaders(true) });
    if (response.data.status === 1 && response.data.url && response.data.url.length > 0) {
      const playUrl = response.data.url[0];
      const timeLength = response.data.timeLength || 0;
      // 从 trans_param.union_cover 获取封面
      const cover = response.data.trans_param?.union_cover?.replace('{size}', '400') || '';

      // 尝试获取更完整的歌曲信息（包括专辑名）
      let album = '';
      // 从 trans_param 中查找 album_audio_id 或使用 privilege/lite 接口
      let albumAudioId = response.data.album_audio_id || response.data.trans_param?.album_audio_id;

      // 如果没有找到，尝试从 privilege/lite 接口获取
      if (!albumAudioId) {
        try {
          const privilegeUrl = `${KUGOU_API_BASE}/privilege/lite?hash=${mid}`;
          const privilegeRes = await axios.get(privilegeUrl, { headers: getKugouHeaders(true) });
          if (privilegeRes.data.status === 1 && privilegeRes.data.data?.[0]) {
            const songData = privilegeRes.data.data[0];
            albumAudioId = songData.album_audio_id || songData.info?.album_audio_id;
            // 也尝试直接获取专辑名
            album = songData.album_name || songData.info?.album_name || '';
          }
        } catch (e) {
          // 忽略错误
        }
      }

      // 如果有 album_audio_id 且没有专辑名，从 audio/related 获取
      if (albumAudioId && !album) {
        try {
          const relatedUrl = `${KUGOU_API_BASE}/audio/related?album_audio_id=${albumAudioId}`;
          const relatedRes = await axios.get(relatedUrl, { headers: getKugouHeaders(true) });
          if (relatedRes.data.status === 1 && relatedRes.data.extra?.resp?.base?.album_name) {
            album = relatedRes.data.extra.resp.base.album_name;
          }
        } catch (e) {
          // 获取专辑失败不影响主流程
        }
      }

      return {
        url: playUrl,
        timeLength: timeLength,
        cover: cover,
        album: album,
      };
    }
    throw new HttpException('获取播放地址失败', HttpStatus.BAD_REQUEST);
  } catch (error) {
    console.error('获取播放地址失败:', error.message);
    throw new HttpException(`获取播放地址失败: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
};

/**
 * @desc 通过歌单id获取歌曲列表
 * @param opt 配置参数
 * @returns
 */
export const getAlbumList = async (opt) => {
  const { albumId, page = 1, size = 30 } = opt;
  const url = `${KUGOU_API_BASE}/playlist/track/all?id=${albumId}&page=${page}&pagesize=${size}`;
  try {
    const response = await axios.get(url);
    if (response.data.status === 1 && response.data.data) {
      const musicList = response.data.data.info || [];
      return musicList.map((t) => ({
        music_name: t.filename?.split(' - ')[1] || t.songname || '',
        music_album: t.album_name || '',
        music_duration: Math.floor(t.duration || 0),
        music_singer: t.filename?.split(' - ')[0] || t.singername || '',
        music_mid: t.hash,
      }));
    }
    return [];
  } catch (error) {
    console.error('获取歌单歌曲失败:', error.message);
    return [];
  }
};

/**
 * @desc 获取每日推荐歌曲 - 使用酷狗 everyday/recommend 接口
 */
export const getHotMusic = async () => {
  const url = `${KUGOU_API_BASE}/everyday/recommend`;
  try {
    const response = await axios.get(url, { headers: getKugouHeaders(true) });
    if (response.data.status === 1 && response.data.data) {
      const data = response.data.data;
      const songs = data.songs || data.list || data.song_list || data.info || [];
      return songs.slice(0, 30).map((t) => {
        // 尝试多个封面字段
        const cover = (
          t.album_sizable_cover ||
          t.sizable_cover ||
          t.cover ||
          t.img ||
          t.album_img ||
          t.pic ||
          ''
        ).replace('{size}', '400');
        return {
          music_mid: t.hash || t.Hash,
          music_name: t.songname || t.filename?.split(' - ')[1] || t.song_name || '',
          music_singer: t.singername || t.filename?.split(' - ')[0] || t.author_name || '',
          music_album: t.album_name || '',
          music_cover: cover,
          music_duration: Math.floor((t.timelength || t.duration || 0) / 1000),
          source: 'kugou',
        };
      });
    }
    return [];
  } catch (error) {
    return [];
  }
};

// ==================== 网易云音乐 API ====================

/**
 * @desc 搜索音乐 - 使用网易云 API
 * @param keyword 搜索关键词
 * @param page 页码
 * @param pagesize 每页数量
 */
export const searchMusicNetease = async (keyword: string, page = 1, pagesize = 20) => {
  const offset = (page - 1) * pagesize;
  const url = `${NETEASE_API_BASE}/search?keywords=${encodeURIComponent(keyword)}&limit=${pagesize}&offset=${offset}`;
  try {
    const response = await axios.get(url);
    if (response.data.code === 200 && response.data.result?.songs) {
      const songs = response.data.result.songs;
      return {
        total: response.data.result.songCount || songs.length,
        list: songs.map((t) => ({
          music_mid: String(t.id),
          music_name: t.name || '',
          music_singer: t.artists?.map((a) => a.name).join('/') || '',
          music_album: t.album?.name || '',
          music_duration: Math.floor((t.duration || 0) / 1000),
          music_cover: t.album?.artist?.img1v1Url || '',
          source: 'netease',
        })),
      };
    }
    throw new HttpException('搜索失败', HttpStatus.BAD_REQUEST);
  } catch (error) {
    console.error('网易云搜索失败:', error.message);
    throw new HttpException(`搜索失败: ${error.message}`, HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * @desc 获取网易云歌曲播放地址
 * @param id 歌曲ID
 */
export const getMusicSrcNetease = async (id: string) => {
  const url = `${NETEASE_API_BASE}/song/url?id=${id}`;
  try {
    const response = await axios.get(url);
    if (response.data.code === 200 && response.data.data?.length > 0) {
      const playUrl = response.data.data[0].url;
      if (playUrl) {
        return playUrl;
      }
    }
    throw new HttpException('获取播放地址失败', HttpStatus.BAD_REQUEST);
  } catch (error) {
    console.error('网易云获取播放地址失败:', error.message);
    throw new HttpException(`获取播放地址失败: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
};

/**
 * @desc 获取网易云歌曲详情
 * @param id 歌曲ID
 */
export const getMusicDetailNetease = async (id: string) => {
  const url = `${NETEASE_API_BASE}/song/detail?ids=${id}`;
  try {
    const response = await axios.get(url);
    if (response.data.code === 200 && response.data.songs?.length > 0) {
      const song = response.data.songs[0];

      // 获取歌词
      let lrclist = [];
      try {
        const lrcUrl = `${NETEASE_API_BASE}/lyric?id=${id}`;
        const lrcRes = await axios.get(lrcUrl);
        if (lrcRes.data.code === 200 && lrcRes.data.lrc?.lyric) {
          const lines = lrcRes.data.lrc.lyric.split('\n');
          lrclist = lines
            .map((line) => {
              const match = line.match(/\[(\d+):(\d+)\.(\d+)\](.*)/);
              if (match) {
                const minutes = parseInt(match[1]);
                const seconds = parseInt(match[2]);
                const time = minutes * 60 + seconds;
                return { time: time.toString(), lineLyric: match[4] };
              }
              return null;
            })
            .filter(Boolean);
        }
      } catch (e) {
        // 歌词获取失败不影响主流程
      }

      return {
        music_lrc: lrclist,
        music_info: {
          music_singer: song.ar?.map((a) => a.name).join('/') || '',
          music_cover: song.al?.picUrl || '',
          music_albumpic: song.al?.picUrl || '',
          music_duration: Math.floor((song.dt || 0) / 1000),
          music_score100: 80,
          music_album: song.al?.name || '',
          music_name: song.name || '',
          music_song_time_minutes: '',
          music_mid: String(song.id),
          choose_user_id: null,
          source: 'netease',
        },
        reqid: song.id,
      };
    }
    throw new HttpException('获取歌曲信息失败', HttpStatus.BAD_REQUEST);
  } catch (error) {
    console.error('网易云获取歌曲详情失败:', error.message);
    throw new HttpException(`获取歌曲信息失败: ${error.message}`, HttpStatus.BAD_REQUEST);
  }
};

// ==================== 统一接口 ====================

/**
 * @desc 统一搜索接口 - 根据 source 调用不同 API
 */
export const searchMusicUnified = async (keyword: string, page = 1, pagesize = 20, source = 'kugou') => {
  if (source === 'netease') {
    return searchMusicNetease(keyword, page, pagesize);
  }
  return searchMusic(keyword, page, pagesize);
};

/**
 * @desc 统一获取播放地址 - 根据 source 调用不同 API
 * @returns { url: string, timeLength: number, cover: string, album: string } 播放地址、时长(秒)、封面URL和专辑名
 */
export const getMusicSrcUnified = async (mid: string, source = 'kugou') => {
  if (source === 'netease') {
    const url = await getMusicSrcNetease(mid);
    // 网易云只返回 URL，时长、封面和专辑从 getMusicDetail 获取
    return { url, timeLength: 0, cover: '', album: '' };
  }
  return getMusicSrc(mid);
};

/**
 * @desc 统一获取歌曲详情 - 根据 source 调用不同 API
 */
export const getMusicDetailUnified = async (mid: string, source = 'kugou') => {
  if (source === 'netease') {
    return getMusicDetailNetease(mid);
  }
  return getMusicDetail(mid);
};
