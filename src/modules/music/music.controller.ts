import { MusicService } from './music.service';
import { Controller, Get, Query, Request, Post, Body } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery, ApiBody } from '@nestjs/swagger';
import { searchDto } from './dto/search.dto';
import { addAlbumDto } from './dto/addAlbum.dto';
import { collectMusicDto, removeCollectDto, collectListDto, hotDto } from './dto/music.dto';

@ApiTags('Music - 音乐模块')
@Controller('music')
export class MusicController {
  constructor(private readonly MusicService: MusicService) {}

  @Post('/getAlbumList')
  @ApiOperation({
    summary: '添加专辑歌曲',
    description: '根据酷狗专辑 ID 批量添加歌曲到曲库，用于初始化歌曲库',
  })
  @ApiBody({ type: addAlbumDto })
  @ApiResponse({ status: 200, description: '添加成功，返回新增歌曲列表' })
  @ApiResponse({ status: 400, description: '专辑ID无效' })
  getAlbumList(@Body() params: addAlbumDto) {
    return this.MusicService.getAlbumList(params);
  }

  @Get('/search')
  @ApiOperation({
    summary: '搜索歌曲',
    description: `在线搜索歌曲，支持歌名、歌手、专辑等关键词搜索。

**支持音源：**
- \`kugou\` - 酷狗音乐（默认）
- \`netease\` - 网易云音乐

**酷狗接口说明：**
- 使用 \`/search?keywords=xxx&page=1&pagesize=30&type=song\` 搜索
- 需要完整的 Cookie 认证参数（KUGOU_API_PLATFORM, MAC, MID, GUID, DEV）
- 返回字段自动兼容 SongName/songname/audio_name 等多种格式`,
  })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词（歌名/歌手/专辑）', example: '周杰伦' })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pagesize', required: false, description: '每页数量', example: 30 })
  @ApiQuery({
    name: 'source',
    required: false,
    description: '音源: kugou(默认) / netease',
    example: 'kugou',
    enum: ['kugou', 'netease'],
  })
  @ApiResponse({
    status: 200,
    description: '搜索成功，返回歌曲列表',
    schema: {
      example: {
        code: 200,
        data: [
          {
            music_mid: 'abc123',
            music_name: '晴天',
            music_singer: '周杰伦',
            music_album: '叶惠美',
            music_cover: 'https://...',
            music_duration: 269,
            source: 'kugou',
            isPlay: true,
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 400, description: '搜索失败' })
  search(@Query() params: searchDto) {
    return this.MusicService.search(params);
  }

  @Post('/collectMusic')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '收藏歌曲',
    description: '将歌曲添加到当前用户的收藏列表。管理员收藏的歌曲会自动加入推荐列表。',
  })
  @ApiBody({ type: collectMusicDto })
  @ApiResponse({ status: 200, description: '收藏成功' })
  @ApiResponse({ status: 400, description: '已收藏过该歌曲' })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  collectMusic(@Request() req, @Body() params: collectMusicDto) {
    return this.MusicService.collectMusic(req.payload, params);
  }

  @Get('/collectList')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取收藏列表',
    description: '获取当前登录用户的歌曲收藏列表，支持分页',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pagesize', required: false, description: '每页数量', example: 30 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            id: 1,
            music_mid: 'abc123',
            music_name: '晴天',
            music_singer: '周杰伦',
            music_album: '叶惠美',
            music_cover: 'https://...',
            source: 'kugou',
          },
        ],
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  collectList(@Request() req, @Query() params: collectListDto) {
    return this.MusicService.collectList(req.payload, params);
  }

  @Get('/hot')
  @ApiOperation({
    summary: '热门歌曲',
    description: '获取平台热门推荐歌曲列表，使用酷狗每日推荐接口',
  })
  @ApiQuery({ name: 'page', required: false, description: '页码', example: 1 })
  @ApiQuery({ name: 'pagesize', required: false, description: '每页数量', example: 30 })
  @ApiQuery({ name: 'user_id', required: false, description: '用户ID（可选，用于回退到用户收藏）' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            music_mid: 'abc123',
            music_name: '热门歌曲',
            music_singer: '歌手',
            music_album: '专辑',
            music_cover: 'https://...',
            music_duration: 200,
          },
        ],
      },
    },
  })
  hot(@Request() req, @Query() params: hotDto) {
    return this.MusicService.hot(params);
  }

  @Post('/removeCollect')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '取消收藏',
    description: '从用户收藏列表中移除指定歌曲',
  })
  @ApiBody({ type: removeCollectDto })
  @ApiResponse({ status: 200, description: '取消收藏成功' })
  @ApiResponse({ status: 400, description: '无权移除此歌曲' })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  removeCollect(@Request() req, @Body() params: removeCollectDto) {
    return this.MusicService.removeCollect(req.payload, params);
  }

  @Get('/playUrl')
  @ApiOperation({
    summary: '获取播放地址',
    description: `根据歌曲标识获取音乐播放地址。

**支持音源：**
- \`kugou\` - 使用酷狗 hash
- \`netease\` - 使用网易云歌曲 ID

**酷狗接口说明：**
- 使用 \`/song/url/new?hash=xxx&quality=high\` 获取播放地址
- 需要 Cookie 认证参数
- 播放地址在 \`data[0].info.tracker_url[0]\` 中`,
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: '歌曲ID (酷狗hash/网易云id)',
    example: 'E2C4039A49F514784862D05C7C0F3D0E',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    description: '音源: kugou(默认) / netease',
    example: 'kugou',
    enum: ['kugou', 'netease'],
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          play_url: 'https://webfs.tx.kugou.com/xxx.mp3',
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '获取播放地址失败（可能是VIP歌曲）' })
  getPlayUrl(@Query('id') id: string, @Query('source') source = 'kugou') {
    return this.MusicService.getPlayUrl(id, source);
  }

  @Get('/detail')
  @ApiOperation({
    summary: '获取歌曲详情',
    description: `根据歌曲标识获取歌曲详细信息，包含歌词、封面、时长等。

**支持音源：**
- \`kugou\` - 酷狗音乐
- \`netease\` - 网易云音乐

**酷狗歌词获取流程：**
1. 调用 \`/search/lyric?hash=xxx\` 获取歌词 id 和 accesskey
2. 调用 \`/lyric?id=xxx&accesskey=xxx&fmt=krc&decode=true\` 获取 KRC 格式歌词
3. 解析 decodeContent 中的歌词，格式: \`[毫秒,持续时间]<逐字标记>歌词\`

**歌曲名解析：**
- 自动处理 "歌手 - 歌名" 格式，分离歌手和歌名
- 兼容 songname/audio_name/name 等多种字段名`,
  })
  @ApiQuery({
    name: 'id',
    required: true,
    description: '歌曲ID (酷狗hash/网易云id)',
    example: 'E2C4039A49F514784862D05C7C0F3D0E',
  })
  @ApiQuery({
    name: 'source',
    required: false,
    description: '音源: kugou(默认) / netease',
    example: 'kugou',
    enum: ['kugou', 'netease'],
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          music_lrc: [
            { time: '13', lineLyric: '从前 有一个女孩' },
            { time: '15', lineLyric: '喜欢上了个男孩' },
          ],
          music_info: {
            music_mid: 'E2C4039A49F514784862D05C7C0F3D0E',
            music_name: 'TA',
            music_singer: '不是花火呀',
            music_album: '',
            music_cover: 'https://...',
            music_duration: 235,
            source: 'kugou',
          },
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: '获取歌曲详情失败' })
  getDetail(@Query('id') id: string, @Query('source') source = 'kugou') {
    return this.MusicService.getDetail(id, source);
  }
}
