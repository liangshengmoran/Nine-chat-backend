import { Controller, Post, Get, Body, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { HttpException, HttpStatus } from '@nestjs/common';
import axios from 'axios';
import { RoomMusicAuthEntity } from '../chat/room-music-auth.entity';
import { MusicAuthCookieDto, MusicAuthRevokeDto, MusicAuthQrCheckDto } from './dto/music-auth.dto';

const KUGOU_API_BASE = process.env.KUGOU_API_BASE || 'https://ku-gou-music-api.qyjm.eu.org';
const NETEASE_API_BASE = process.env.NETEASE_API_BASE || 'https://netease-music-api.qyjm.eu.org';

@ApiTags('MusicAuth')
@Controller('music/auth')
export class MusicAuthController {
  constructor(
    @InjectRepository(RoomMusicAuthEntity)
    private readonly MusicAuthModel: Repository<RoomMusicAuthEntity>,
  ) {}

  // ==================== Cookie 授权 ====================

  @Post('/cookie')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '提交 Cookie 授权',
    description: `手动提交音乐平台的 Cookie/Token 到指定房间。

**授权规则：**
- 同一房间同一平台只保留一个有效授权
- 新授权会覆盖该平台的旧授权
- 房间内所有用户都可以授权

**酷狗格式：** \`token=xxx;userid=xxx\`
**网易云格式：** 完整的浏览器 Cookie 字符串`,
  })
  @ApiResponse({ status: 200, description: '授权成功' })
  async submitCookie(@Request() req, @Body() params: MusicAuthCookieDto) {
    const { user_id } = req.payload;
    const { room_id, source, cookie, userid, nickname } = params;

    // 解析酷狗 Cookie 中的 token 和 userid
    let authCookie = cookie;
    let authUserid = userid || '';
    if (source === 'kugou' && !userid) {
      const tokenMatch = cookie.match(/token=([^;]+)/);
      const useridMatch = cookie.match(/userid=(\d+)/);
      if (tokenMatch) authCookie = tokenMatch[1];
      if (useridMatch) authUserid = useridMatch[1];
    }

    // 禁用该房间该平台的旧授权
    await this.MusicAuthModel.update({ room_id, source, status: 1 }, { status: 0 });

    // 创建新授权
    const auth = new RoomMusicAuthEntity();
    auth.room_id = room_id;
    auth.user_id = user_id;
    auth.source = source;
    auth.auth_cookie = authCookie;
    auth.auth_userid = authUserid;
    auth.nickname = nickname || `${source === 'kugou' ? '酷狗' : '网易云'}用户`;
    auth.avatar = '';
    auth.status = 1;

    // 酷狗手动 Cookie 授权时，调用 /user/detail 获取用户信息
    if (source === 'kugou' && authCookie && authUserid) {
      try {
        const headers: any = {
          authorization: `token=${authCookie};userid=${authUserid}`,
          cookie: `userid=${authUserid}; token=${authCookie}`,
        };
        const userRes = await axios.get(`${KUGOU_API_BASE}/user/detail?userid=${authUserid}`, { headers });
        const userData = userRes.data?.data || userRes.data || {};
        if (userData.nickname || userData.user_name) auth.nickname = userData.nickname || userData.user_name;
        if (userData.pic || userData.user_pic) auth.avatar = userData.pic || userData.user_pic;
      } catch (e) {
        // 获取用户信息失败不影响授权
      }
    }

    // 网易云手动 Cookie 授权时，调用 /user/account 获取用户信息
    if (source === 'netease' && authCookie) {
      try {
        const userRes = await axios.post(
          `${NETEASE_API_BASE}/user/account`,
          { cookie: authCookie },
          { headers: { 'Content-Type': 'application/json' } },
        );
        const profile = userRes.data?.profile || {};
        if (profile.nickname) auth.nickname = profile.nickname;
        if (profile.avatarUrl) auth.avatar = profile.avatarUrl;
        if (profile.userId) auth.auth_userid = String(profile.userId);
      } catch (e) {
        // 获取用户信息失败不影响授权
      }
    }

    await this.MusicAuthModel.save(auth);
    return { success: true, message: '授权成功' };
  }

  // ==================== 撤销授权 ====================

  @Post('/revoke')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '撤销房间音乐授权',
    description: '撤销后该房间将回退使用全局默认音乐账号',
  })
  @ApiResponse({ status: 200, description: '撤销成功' })
  async revoke(@Body() params: MusicAuthRevokeDto) {
    const { room_id, source } = params;
    await this.MusicAuthModel.update({ room_id, source, status: 1 }, { status: 0 });
    return { success: true, message: '已撤销授权，将使用默认账号' };
  }

  // ==================== 查询授权状态 ====================

  @Get('/status')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '查询房间音乐授权状态',
    description: '查询指定房间的酷狗和网易云授权状态',
  })
  @ApiQuery({ name: 'room_id', required: true, description: '房间ID', example: 888 })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStatus(@Query('room_id') room_id: number) {
    const kugouAuth = await this.MusicAuthModel.findOne({
      where: { room_id: Number(room_id), source: 'kugou', status: 1 },
    });
    const neteaseAuth = await this.MusicAuthModel.findOne({
      where: { room_id: Number(room_id), source: 'netease', status: 1 },
    });
    return {
      kugou: kugouAuth
        ? {
            authorized: true,
            nickname: kugouAuth.nickname,
            avatar: kugouAuth.avatar,
            user_id: kugouAuth.user_id,
            auth_userid: kugouAuth.auth_userid,
            created_at: kugouAuth.createdAt,
          }
        : { authorized: false },
      netease: neteaseAuth
        ? {
            authorized: true,
            nickname: neteaseAuth.nickname,
            avatar: neteaseAuth.avatar,
            user_id: neteaseAuth.user_id,
            created_at: neteaseAuth.createdAt,
          }
        : { authorized: false },
    };
  }

  // ==================== 二维码登录代理 ====================

  @Get('/qr/key')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取二维码 Key',
    description: '代理请求酷狗/网易云二维码 Key 生成接口',
  })
  @ApiQuery({ name: 'source', required: true, enum: ['kugou', 'netease'], example: 'kugou' })
  @ApiResponse({ status: 200, description: '获取成功' })
  async getQrKey(@Query('source') source: string) {
    const timestamp = Date.now();
    try {
      if (source === 'kugou') {
        const res = await axios.get(`${KUGOU_API_BASE}/login/qr/key?timestamp=${timestamp}`);
        return res.data;
      } else {
        const res = await axios.get(`${NETEASE_API_BASE}/login/qr/key?timestamp=${timestamp}`);
        return res.data;
      }
    } catch (e) {
      throw new HttpException('获取二维码Key失败: ' + e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('/qr/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '生成二维码图片',
    description: '代理请求生成二维码图片（返回 base64）',
  })
  @ApiQuery({ name: 'key', required: true, description: '二维码 Key' })
  @ApiQuery({ name: 'source', required: true, enum: ['kugou', 'netease'], example: 'kugou' })
  @ApiResponse({ status: 200, description: '生成成功' })
  async createQr(@Query('key') key: string, @Query('source') source: string) {
    const timestamp = Date.now();
    try {
      if (source === 'kugou') {
        const res = await axios.get(
          `${KUGOU_API_BASE}/login/qr/create?key=${encodeURIComponent(key)}&qrimg=true&timestamp=${timestamp}`,
        );
        return res.data;
      } else {
        const res = await axios.get(
          `${NETEASE_API_BASE}/login/qr/create?key=${encodeURIComponent(key)}&qrimg=true&timestamp=${timestamp}`,
        );
        return res.data;
      }
    } catch (e) {
      throw new HttpException('生成二维码失败: ' + e.message, HttpStatus.BAD_REQUEST);
    }
  }

  @Get('/qr/check')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '检查扫码状态',
    description: `轮询检查二维码扫码状态。

**酷狗状态码：** 0=过期, 1=等待, 2=待确认, 4=成功
**网易云状态码：** 800=过期, 801=等待, 802=待确认, 803=成功

扫码成功且传入 room_id 时自动保存授权到房间。`,
  })
  @ApiQuery({ name: 'key', required: true, description: '二维码 Key' })
  @ApiQuery({ name: 'source', required: true, enum: ['kugou', 'netease'] })
  @ApiQuery({ name: 'room_id', required: false, description: '房间ID（成功时自动保存）' })
  @ApiQuery({ name: 'user_id', required: false, description: '授权用户ID' })
  @ApiResponse({ status: 200, description: '状态信息' })
  async checkQr(
    @Query('key') key: string,
    @Query('source') source: string,
    @Query('room_id') room_id?: number,
    @Query('user_id') user_id?: number,
  ) {
    const timestamp = Date.now();
    try {
      let res;
      if (source === 'kugou') {
        res = await axios.get(`${KUGOU_API_BASE}/login/qr/check?key=${encodeURIComponent(key)}&timestamp=${timestamp}`);
      } else {
        res = await axios.get(
          `${NETEASE_API_BASE}/login/qr/check?key=${encodeURIComponent(key)}&timestamp=${timestamp}`,
        );
      }

      const data = res.data;

      // 检测登录成功 — 自动保存授权
      const isKugouSuccess = source === 'kugou' && (data.data?.status === 4 || data.status === 4);
      const isNeteaseSuccess = source === 'netease' && (data.code === 803 || data.data?.code === 803);

      if ((isKugouSuccess || isNeteaseSuccess) && room_id && user_id) {
        // 禁用旧授权
        await this.MusicAuthModel.update({ room_id: Number(room_id), source, status: 1 }, { status: 0 });

        const auth = new RoomMusicAuthEntity();
        auth.room_id = Number(room_id);
        auth.user_id = Number(user_id);
        auth.source = source;
        auth.status = 1;

        if (source === 'kugou') {
          const token = data.data?.token || data.token || '';
          const userid = data.data?.userid || data.userid || '';
          auth.auth_cookie = token;
          auth.auth_userid = String(userid);
          auth.nickname = data.data?.nickname || data.nickname || '酷狗用户';
          auth.avatar = data.data?.pic || data.pic || '';
        } else {
          const cookie = data.cookie || '';
          auth.auth_cookie = cookie;
          auth.auth_userid = '';
          auth.nickname = data.nickname || '网易云用户';
          auth.avatar = data.avatarUrl || '';

          // QR check 可能不返回完整用户信息，额外调用 /user/account 获取
          if (cookie && (!auth.nickname || auth.nickname === '网易云用户' || !auth.avatar)) {
            try {
              const userRes = await axios.post(
                `${NETEASE_API_BASE}/user/account`,
                { cookie },
                { headers: { 'Content-Type': 'application/json' } },
              );
              const profile = userRes.data?.profile || {};
              if (profile.nickname) auth.nickname = profile.nickname;
              if (profile.avatarUrl) auth.avatar = profile.avatarUrl;
              if (profile.userId) auth.auth_userid = String(profile.userId);
            } catch (e) {
              // 获取用户信息失败不影响授权流程
            }
          }
        }

        await this.MusicAuthModel.save(auth);
        data._authSaved = true;
      }

      return data;
    } catch (e) {
      throw new HttpException('检查扫码状态失败: ' + e.message, HttpStatus.BAD_REQUEST);
    }
  }
}
