import { formatOnlineUser, formatRoomlist } from '../../utils/tools';
import { RoomEntity } from './room.entity';
import { RoomModeratorEntity } from './room-moderator.entity';
import { MusicEntity } from '../music/music.entity';
import { MessageEntity } from './message.entity';
import { UserEntity } from '../user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { getMusicDetailUnified, getMusicSrcUnified } from 'src/utils/spider';
import { getTimeSpace } from 'src/utils/tools';
import { getEffectiveRole, canCutMusic, canRemoveMusic, getMusicCooldown } from 'src/common/constants/roles';
import { AdminService } from '../admin/admin.service';

import { WebSocketGateway, WebSocketServer, SubscribeMessage } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { verifyToken } from 'src/utils/verifyToken';

@WebSocketGateway({
  path: '/chat',
  allowEIO3: true,
  cors: {
    origin: /.*/,
    credentials: true,
  },
})
export class WsChatGateway {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserModel: Repository<UserEntity>,
    @InjectRepository(MessageEntity)
    private readonly MessageModel: Repository<MessageEntity>,
    @InjectRepository(MusicEntity)
    private readonly MusicModel: Repository<MusicEntity>,
    @InjectRepository(RoomEntity)
    private readonly RoomModel: Repository<RoomEntity>,
    @InjectRepository(RoomModeratorEntity)
    private readonly RoomModeratorModel: Repository<RoomModeratorEntity>,
    private readonly adminService: AdminService,
  ) {}
  @WebSocketServer() private socket: Server;

  private clientIdMap: any = {}; //  记录clientId 和userId roomId的映射关系 {  client.id: { user_id, room_id }}
  private onlineUserInfo: any = {}; // 在线用户信息
  private chooseMusicTimeSpace: any = {}; // 记录每位用户的点歌时间 限制30s点一首
  private room_list_map: any = {}; // 所有的在线房间列表
  private timerList: any = {}; // 歌曲播放定时器
  private roomCloseTimers: any = {}; // 房间延迟关闭定时器
  // 房间空闲后延迟关闭时间（毫秒），通过环境变量 ROOM_CLOSE_DELAY_MINUTES 控制，默认5分钟
  private readonly roomCloseDelay: number = (Number(process.env.ROOM_CLOSE_DELAY_MINUTES) || 5) * 60 * 1000;

  /* 连接成功 */
  async handleConnection(client: Socket): Promise<any> {
    this.connectSuccess(client, client.handshake.query);
  }

  /* 断开连接 */
  async handleDisconnect(client: Socket) {
    const clientInfo = this.clientIdMap[client.id];
    if (!clientInfo) return;
    /* 删除此用户记录 */
    delete this.clientIdMap[client.id];
    const { user_id, room_id } = clientInfo;
    const { on_line_user_list, room_info, room_admin_info } = this.room_list_map[room_id];
    let user_nick;
    /* 找到这个退出的用户并且从在线列表移除 */
    const delUserIndex = on_line_user_list.findIndex((t) => {
      if (t.id === user_id) {
        user_nick = t.user_nick;
        return true;
      }
    });
    on_line_user_list.splice(delUserIndex, 1);
    /* 如果这个用户离开后房间没人了，启动延迟关闭定时器；如果还剩人则通知房间所有人更新在线用户列表 */
    if (!on_line_user_list.length) {
      this.scheduleRoomClose(room_id, room_info, room_admin_info);
      return;
    }
    this.socket.to(room_id).emit('offline', {
      code: 1,
      on_line_user_list: formatOnlineUser(on_line_user_list, user_id),
      msg: `[${user_nick}]离开房间了`,
    });
  }

  /* 接收到客户端的消息 */
  @SubscribeMessage('message')
  async handleMessage(client: Socket, data: any) {
    const { user_id, room_id } = this.clientIdMap[client.id];
    const { message_type, message_content, quote_message = {} } = data;

    /* 检查用户是否被封禁 */
    const currentUser = await this.UserModel.findOne({ where: { id: user_id } });
    if (!currentUser || currentUser.user_status === 0 || currentUser.user_status === -1) {
      return client.emit('tips', { code: -1, msg: '您的账号已被封禁，无法发送消息' });
    }

    /* 敏感词过滤处理 - 仅对文本消息进行过滤 */
    let filteredContent = message_content;
    if (message_type === 1) {
      // message_type 1 为文本消息
      try {
        const parsed = JSON.parse(message_content);
        if (parsed.text) {
          const filterResult = await this.adminService.filterSensitiveWords(parsed.text);
          if (filterResult.blocked) {
            return client.emit('tips', { code: -1, msg: '消息包含违规内容，无法发送' });
          }
          parsed.text = filterResult.filtered;
          filteredContent = JSON.stringify(parsed);
        }
      } catch (e) {
        // 如果不是 JSON 格式，直接过滤
        const filterResult = await this.adminService.filterSensitiveWords(message_content);
        if (filterResult.blocked) {
          return client.emit('tips', { code: -1, msg: '消息包含违规内容，无法发送' });
        }
        filteredContent = filterResult.filtered;
      }
    }

    /* 引用消息数据整理 */
    const {
      id: quote_message_id,
      message_content: quote_message_content,
      message_type: quote_message_type,
      user_info: quoteUserInfo = {},
    } = quote_message;
    const { id: quote_user_id, user_nick: quote_user_nick } = quoteUserInfo;

    /* 发送的消息数据处理 */
    const { user_nick, user_avatar, user_role, id } = await this.getUserInfoForClientId(client.id);
    const params = {
      user_id,
      message_content: filteredContent,
      message_type,
      room_id,
      quote_user_id,
      quote_message_id,
    };
    const message = await this.MessageModel.save(params);

    /* 需要对消息的message_content序列化因为发送的所有消息都是JSON.strify的 */
    message.message_content && (message.message_content = JSON.parse(message.message_content));

    /* 检查用户是否为房管 */
    const moderatorIds = await this.getRoomModeratorIds(room_id);
    const is_moderator = moderatorIds.includes(id);

    /* 创建消息之后的信息里没有发送人信息和引用信息，需要自己从客户端带来的信息组装 */
    const result: any = {
      ...message,
      user_info: { user_nick, user_avatar, user_role, id, user_id: id, is_moderator },
    };
    /* 如果有引用消息，自己组装引用消息需要的数据格式，就不用再请求一次了 */
    quote_user_id &&
      (result.quote_info = {
        quote_user_nick,
        quote_message_content,
        quote_message_type,
        quote_message_id,
        quote_message_status: 1,
        quote_user_id,
      });

    this.socket.to(room_id).emit('message', { data: result, msg: '有一条新消息' });
  }

  /**
   * @desc 客户端发起切歌的请求 判断权限 是否有权切换
   * @param client socket
   */
  @SubscribeMessage('cutMusic')
  async handleCutMusic(client: Socket, music: any) {
    const { music_name = '未知歌曲', music_singer = '未知歌手', choose_user_id } = music || {};
    const { room_id } = this.clientIdMap[client.id];
    const { user_role, user_nick, id: user_id } = await this.getUserInfoForClientId(client.id);
    const { room_admin_info } = this.room_list_map[room_id];

    // 获取房间管理员列表
    const moderatorIds = await this.getRoomModeratorIds(room_id);
    // 计算有效角色
    const effectiveRole = getEffectiveRole(user_role, user_id, room_admin_info.id, moderatorIds);

    if (!canCutMusic(effectiveRole, user_id, choose_user_id)) {
      return client.emit('tips', {
        code: -1,
        msg: '非管理员或房主只能切换自己歌曲哟...',
      });
    }
    await this.messageNotice(room_id, {
      code: 2,
      message_type: 'info',
      message_content: `${user_nick} 切掉了 ${music_singer}的[${music_name}]`,
    });
    this.switchMusic(room_id);
  }

  /* 点歌操作  */
  @SubscribeMessage('chooseMusic')
  async handlerChooseMusic(client: Socket, musicInfo: any) {
    const { user_id, room_id } = this.clientIdMap[client.id];
    const user_info: any = await this.getUserInfoForClientId(client.id);
    const { music_name, music_singer, music_mid } = musicInfo;
    const { music_queue_list, room_admin_info } = this.room_list_map[this.clientIdMap[client.id].room_id];

    if (music_queue_list.some((t) => t.music_mid === music_mid)) {
      return client.emit('tips', { code: -1, msg: '这首歌已经在列表中啦！' });
    }

    // 获取房间管理员列表并计算有效角色
    const moderatorIds = await this.getRoomModeratorIds(room_id);
    const effectiveRole = getEffectiveRole(user_info.user_role, user_id, room_admin_info.id, moderatorIds);

    // 获取点歌冷却时间
    const cooldown = getMusicCooldown(effectiveRole);

    // 游客禁止点歌
    if (cooldown === -1) {
      return client.emit('tips', { code: -1, msg: '请登录后点歌' });
    }

    // 检查点歌冷却时间
    if (cooldown > 0 && this.chooseMusicTimeSpace[user_id]) {
      const timeDifference = getTimeSpace(this.chooseMusicTimeSpace[user_id]);
      if (timeDifference <= cooldown) {
        return client.emit('tips', {
          code: -1,
          msg: `频率过高 请在${cooldown - timeDifference}秒后重试`,
        });
      }
    }

    musicInfo.user_info = user_info;
    music_queue_list.push(musicInfo);
    this.chooseMusicTimeSpace[user_id] = getTimeSpace();
    client.emit('tips', { code: 1, msg: '恭喜您点歌成功' });
    this.socket.to(room_id).emit('chooseMusic', {
      code: 1,
      music_queue_list: music_queue_list,
      msg: `${user_info.user_nick} 点了一首 ${music_name}(${music_singer})`,
    });
  }

  /**
   * @desc 管理员可以移除任何人歌曲 房主可以移除自己房间的任何歌曲 普通用户只能移除自己的
   * @param client
   * @param music
   * @returns
   */
  @SubscribeMessage('removeQueueMusic')
  async handlerRemoveQueueMusic(client: Socket, music: any) {
    const { user_id, room_id } = this.clientIdMap[client.id]; // 房间信息
    const { music_mid, music_name, music_singer, user_info: chooser_info } = music; // 当前操作的歌曲信息
    const chooser_id = chooser_info?.id; // 点歌人 ID
    const { music_queue_list, room_admin_info } = this.room_list_map[room_id];

    // 获取当前用户信息和有效角色
    const currentUser = await this.getUserInfoForClientId(client.id);
    const moderatorIds = await this.getRoomModeratorIds(room_id);
    const effectiveRole = getEffectiveRole(currentUser.user_role, user_id, room_admin_info.id, moderatorIds);

    if (!canRemoveMusic(effectiveRole, user_id, chooser_id)) {
      return client.emit('tips', {
        code: -1,
        msg: '非管理员或房主只能移除掉自己点的歌曲哟...',
      });
    }
    const delIndex = music_queue_list.findIndex((t) => t.music_mid === music_mid);
    music_queue_list.splice(delIndex, 1);
    client.emit('tips', {
      code: 1,
      msg: `成功移除了歌单中的 ${music_name}(${music_singer})`,
    });
    this.socket.emit('chooseMusic', {
      code: 1,
      music_queue_list: music_queue_list,
      msg: `${currentUser.user_nick} 移除了歌单中的 ${music_name}(${music_singer})`,
    });
  }

  /**
   * @desc 用户在客户端修改休息后应该通知房间变更用户信息，否则新的聊天的头像名称依然是老的用户信息
   * @param client
   * @param newUserInfo  新的用户信息，客户端上传来就不用重新查询一次
   */
  @SubscribeMessage('updateRoomUserInfo')
  async handlerUpdateRoomUserInfo(client: Socket, newUserInfo) {
    const { room_id } = this.clientIdMap[client.id];
    const old_user_info = await this.getUserInfoForClientId(client.id);
    /* 引用数据类型直接覆盖就可以改变原数据 */
    Object.keys(newUserInfo).forEach((key) => (old_user_info[key] = newUserInfo[key]));

    /* 拿到新的当前房间的在线用户列表，通知用户更新，在线列表信息也变了 */
    const { on_line_user_list } = this.room_list_map[Number(room_id)];
    this.socket.to(room_id).emit('updateOnLineUserList', { on_line_user_list });
  }

  /**
   * @desc 房主修改完房间资料后需要通知全部人修改房间信息，我们需要变更房间信息 并通知用户修改在线房间列表
   * @param client
   * @param newRoomInfo 新的房间信息，客户端上传来就不用重新查询一次
   */
  @SubscribeMessage('updateRoomInfo')
  async handlerUpdateRoomInfo(client: Socket, newRoomInfo) {
    const { room_id } = this.clientIdMap[client.id];
    this.room_list_map[Number(room_id)].room_info = newRoomInfo;
    const { user_nick } = await this.getUserInfoForClientId(client.id);
    const data: any = {
      room_list: formatRoomlist(this.room_list_map),
      msg: `房主 [${user_nick}] 修改了房间信息`,
    };
    this.socket.to(room_id).emit('updateRoomlist', data);
  }

  /**
   * @desc 客户端撤回消息
   * @param client
   * @param newUserInfo
   */
  @SubscribeMessage('recallMessage')
  async handlerRecallMessage(client: Socket, { user_nick, id }) {
    const { user_id, room_id } = this.clientIdMap[client.id];
    const message = await this.MessageModel.findOne({ where: { id, user_id } });
    if (!message)
      return client.emit('tips', {
        code: -1,
        msg: '非法操作，不可移除他人消息！',
      });
    const { createdAt } = message;
    const timeSpace = new Date(createdAt).getTime();
    const now = new Date().getTime();
    if (now - timeSpace > 2 * 60 * 1000) return client.emit('tips', { code: -1, msg: '只能撤回两分钟内的消息！' });
    await this.MessageModel.update({ id }, { message_status: -1 });
    this.socket.to(room_id).emit('recallMessage', {
      code: 1,
      id,
      msg: `${user_nick} 撤回了一条消息`,
    });
  }

  /* >>>>>>>>>>>>>>>>>>>>>>>>>>>>>> 下面是方法、不属于客户端提交的事件 <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<< */

  /**
   * @desc 管理员/房主/房管踢出用户
   */
  @SubscribeMessage('kickUser')
  async handleKickUser(client: Socket, { target_user_id, reason = '' }) {
    const { user_id, room_id } = this.clientIdMap[client.id];
    const currentUser = await this.getUserInfoForClientId(client.id);
    const { room_admin_info, on_line_user_list } = this.room_list_map[room_id];

    const moderatorIds = await this.getRoomModeratorIds(room_id);
    const effectiveRole = getEffectiveRole(currentUser.user_role, user_id, room_admin_info.id, moderatorIds);

    if (!['super', 'admin', 'owner', 'moderator'].includes(effectiveRole)) {
      return client.emit('tips', { code: -1, msg: '您没有权限踢出用户' });
    }
    if (target_user_id === user_id) {
      return client.emit('tips', { code: -1, msg: '不能踢出自己' });
    }

    const targetUser = on_line_user_list.find((u) => u.id === target_user_id);
    if (!targetUser) {
      return client.emit('tips', { code: -1, msg: '该用户不在房间内' });
    }
    if (['super', 'admin'].includes(targetUser.user_role)) {
      return client.emit('tips', { code: -1, msg: '不能踢出管理员' });
    }
    if (effectiveRole === 'moderator' && target_user_id === room_admin_info.id) {
      return client.emit('tips', { code: -1, msg: '房管不能踢出房主' });
    }

    let targetClientId = null;
    Object.keys(this.clientIdMap).forEach((clientId) => {
      if (this.clientIdMap[clientId].user_id === target_user_id && this.clientIdMap[clientId].room_id === room_id) {
        targetClientId = clientId;
      }
    });

    if (targetClientId) {
      this.socket.to(targetClientId).emit('kicked', {
        code: -1,
        msg: reason ? `您已被踢出房间，原因: ${reason}` : '您已被踢出房间',
      });
      this.socket.in(targetClientId).disconnectSockets(true);
    }

    await this.messageNotice(room_id, {
      code: 2,
      message_type: 'info',
      message_content: `${targetUser.user_nick} 已被 ${currentUser.user_nick} 踢出房间`,
    });
  }

  /**
   * @desc 管理员删除他人消息
   */
  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(client: Socket, { message_id }) {
    const { user_id, room_id } = this.clientIdMap[client.id];
    const currentUser = await this.getUserInfoForClientId(client.id);
    const { room_admin_info } = this.room_list_map[room_id];

    const moderatorIds = await this.getRoomModeratorIds(room_id);
    const effectiveRole = getEffectiveRole(currentUser.user_role, user_id, room_admin_info.id, moderatorIds);

    if (!['super', 'admin', 'owner', 'moderator'].includes(effectiveRole)) {
      return client.emit('tips', { code: -1, msg: '您没有权限删除消息' });
    }

    const message = await this.MessageModel.findOne({ where: { id: message_id, room_id } });
    if (!message) {
      return client.emit('tips', { code: -1, msg: '消息不存在' });
    }

    await this.MessageModel.update({ id: message_id }, { message_status: -2 });

    this.socket.to(room_id).emit('messageDeleted', {
      code: 1,
      id: message_id,
      msg: `${currentUser.user_nick} 删除了一条消息`,
    });
  }

  /**
   * @desc 切换房间歌曲
   * @param room_id 房间id
   * @returns
   */
  async switchMusic(room_id, retryCount = 0) {
    /* 防止无限递归：最多重试5次 */
    const MAX_RETRY = 5;
    if (retryCount >= MAX_RETRY) {
      return this.messageNotice(room_id, {
        code: -1,
        message_type: 'info',
        message_content: '连续多首歌曲无法播放，请手动点歌或稍后再试',
      });
    }
    /* 获取下一首的歌曲id */
    const music: any = await this.getNextMusicMid(room_id);
    if (!music) {
      return this.messageNotice(room_id, {
        code: -1,
        message_type: 'info',
        message_content: '当前房间没有曲库，请自定义点歌吧！',
      });
    }
    const { mid, source, user_info, music_queue_list } = music;
    try {
      /* 获取歌曲详细信息 - 传递source参数 */
      const { music_lrc, music_info } = await getMusicDetailUnified(mid, source);
      /* 如果有点歌人信息，携带其id，没有标为-1系统随机点播的，切歌时用于判断是否是本人操作 */
      music_info.choose_user_id = user_info ? user_info.id : -1;
      /* 记录歌曲来源 */
      music_info.source = source;
      /* 获取歌曲远程地址、时长和封面 - 传递source参数 */
      const musicSrcResult = await getMusicSrcUnified(mid, source);
      const music_src = musicSrcResult.url;
      /* 如果从播放地址接口获取到了时长，使用它覆盖原有的 duration */
      if (musicSrcResult.timeLength && musicSrcResult.timeLength > 0) {
        music_info.music_duration = musicSrcResult.timeLength;
      }
      /* 如果从播放地址接口获取到了封面，使用它覆盖空的封面 */
      if (musicSrcResult.cover && (!music_info.music_cover || music_info.music_cover === '')) {
        music_info.music_cover = musicSrcResult.cover;
        music_info.music_albumpic = musicSrcResult.cover;
      }
      /* 如果从播放地址接口获取到了专辑名，使用它覆盖空的专辑 */
      if (musicSrcResult.album && (!music_info.music_album || music_info.music_album === '')) {
        music_info.music_album = musicSrcResult.album;
      }
      this.room_list_map[Number(room_id)].music_info = music_info;
      this.room_list_map[Number(room_id)].music_lrc = music_lrc;
      this.room_list_map[Number(room_id)].music_src = music_src;
      const { music_singer, music_name } = music_info;
      /* 如果房间点歌队列存在歌曲那么移除房间歌曲列表第一首 */
      music_queue_list.length && this.room_list_map[Number(room_id)].music_queue_list.shift();
      /* 通知客户端事件切换歌曲 */
      this.socket.to(room_id).emit('switchMusic', {
        musicInfo: { music_info, music_src, music_lrc, music_queue_list },
        msg: `正在播放${user_info ? user_info.user_nick : '系统随机'}点播的 ${music_name} - ${music_singer}`,
      });
      const { music_duration } = music_info;
      clearTimeout(this.timerList[`timer${room_id}`]);
      /* 设置一个定时器 以歌曲时长为准 歌曲到时间后自动切歌 */
      this.timerList[`timer${room_id}`] = setTimeout(() => {
        this.switchMusic(room_id);
      }, music_duration * 1000);
      /* 拿到歌曲时长， 记录歌曲结束时间, 新用户进入时，可以计算出歌曲还有多久结束 */
      this.room_list_map[Number(room_id)].last_music_timespace = new Date().getTime() + music_duration * 1000;
    } catch (error) {
      /* 如果拿的mid查询歌曲出错了 说明这个歌曲已经不能播放  切换下一首 并且移除这首歌曲 */
      /* 先保存当前歌曲信息用于提示，再移除 */
      const failedMusicName = music_queue_list[0]?.music_name || '未知歌曲';

      this.MusicModel.delete({ music_mid: mid });
      if (music_queue_list.length) {
        music_queue_list.shift();
      }

      this.messageNotice(room_id, {
        code: 2,
        message_type: 'info',
        message_content: `歌曲 (${failedMusicName}) 暂时无法播放，正在切换下一首...`,
      });

      /* 递归切换下一首，传递重试次数 */
      this.switchMusic(room_id, retryCount + 1);
    }
  }

  /* 获取下一首音乐id、有人点歌拿到歌单中的mid 没有则去占db随机一首 */
  async getNextMusicMid(room_id) {
    let mid: any;
    let source = 'kugou'; // 默认音源
    let user_info: any = null;
    let music_queue_list: any = [];
    this.room_list_map[Number(room_id)] && (music_queue_list = this.room_list_map[Number(room_id)].music_queue_list);

    /* 如果当前房间有点歌列表，就顺延，没有就随机播放一区 */
    if (music_queue_list.length) {
      mid = music_queue_list[0].music_mid;
      source = music_queue_list[0]?.source || 'kugou'; // 获取点歌时指定的音源
      user_info = music_queue_list[0]?.user_info;
    } else {
      const count = await this.MusicModel.count();
      const randomIndex = Math.floor(Math.random() * count);
      const music: any = await this.MusicModel.find({
        take: 1,
        skip: randomIndex,
      });
      const random_music = music[0];
      if (!random_music) {
        return;
      }
      mid = random_music?.music_mid;
      source = random_music?.source || 'kugou'; // 从tb_music获取音源
    }
    return { mid, source, user_info, music_queue_list };
  }

  /**
   * @desc 初次加入房间
   * @param client ws
   * @param query 加入房间携带了token和位置信息
   * @returns
   */
  async connectSuccess(client, query) {
    try {
      const { token, address, room_id = 888 } = query;
      const payload = await verifyToken(token);
      const { user_id } = payload;
      /* token校验 */
      if (user_id === -1 || !token) {
        client.emit('authFail', { code: -1, msg: '权限校验失败，请重新登录' });
        return client.disconnect();
      }

      /* IP黑名单检查 */
      const clientIp = client.handshake.headers['x-forwarded-for'] || client.handshake.address || '';
      const realIp = Array.isArray(clientIp) ? clientIp[0] : clientIp.split(',')[0].trim();
      if (realIp) {
        const isBlocked = await this.adminService.isIpBlocked(realIp);
        if (isBlocked) {
          client.emit('authFail', { code: -1, msg: '您的IP已被封禁，无法进入聊天室' });
          return client.disconnect();
        }
      }

      /* 判断这个用户是不是在连接状态中 */
      Object.keys(this.clientIdMap).forEach((clientId) => {
        if (this.clientIdMap[clientId]['user_id'] === user_id) {
          /* 提示老的用户被挤掉 */
          this.socket.to(clientId).emit('tips', {
            code: -2,
            msg: '您的账户在别地登录了，您已被迫下线',
          });
          /* 提示新用户是覆盖登录 */
          client.emit('tips', {
            code: -1,
            msg: '您的账户已在别地登录，已为您覆盖登录！',
          });

          /* 覆盖登录前，先从旧房间的在线列表移除该用户 */
          const oldRoomId = this.clientIdMap[clientId]['room_id'];
          const oldRoom = this.room_list_map[oldRoomId];
          if (oldRoom) {
            const idx = oldRoom.on_line_user_list.findIndex((u) => u.id === user_id);
            if (idx !== -1) oldRoom.on_line_user_list.splice(idx, 1);
            /* 如果旧房间没人了，启动延迟关闭 */
            if (!oldRoom.on_line_user_list.length) {
              this.scheduleRoomClose(oldRoomId, oldRoom.room_info, oldRoom.room_admin_info);
            }
          }

          /* 断开老的用户连接 并移除掉老用户的记录 */
          this.socket.in(clientId).disconnectSockets(true);
          delete this.clientIdMap[clientId];
        }
      });

      /* 判断用户是不是已经在房间里面了 */
      if (Object.values(this.room_list_map).some((t: any) => t.on_line_user_list.some((u) => u.id === user_id))) {
        return client.emit('tips', { code: -2, msg: '您已经在别处登录了' });
      }
      /* 查询用户基础信息 */
      const u = await this.UserModel.findOne({ where: { id: user_id } });
      if (!u) {
        client.emit('authFail', { code: -1, msg: '无此用户信息、非法操作！' });
        return client.disconnect();
      }

      /* 检查用户是否被封禁 */
      if (u.user_status === 0 || u.user_status === -1) {
        client.emit('authFail', { code: -1, msg: '您的账号已被封禁，无法进入聊天室' });
        return client.disconnect();
      }

      const { user_name, user_nick, user_email, user_sex, user_role, user_avatar, user_sign, user_room_bg, id } = u;
      const userInfo = {
        user_name,
        user_nick,
        user_email,
        user_role,
        user_avatar,
        user_sign,
        user_room_bg,
        user_sex,
        id,
      };
      /* 查询房间信息 如果没有当前这个房间id 说明需要新建这个房间 */
      const room_info = await this.RoomModel.findOne({
        where: { room_id },
        select: [
          'room_id',
          'room_user_id',
          'room_logo',
          'room_name',
          'room_notice',
          'room_bg_img',
          'room_need_password',
        ],
      });
      if (!room_info) {
        client.emit('tips', {
          code: -3,
          msg: '您正在尝试加入一个不存在的房间、非法操作！！！',
        });
        return client.disconnect();
      }

      // 房间密码验证
      // room_need_password: 1-公开, 2-需要密码
      if (room_info.room_need_password === 2) {
        const { room_password: inputPassword } = query;
        // 获取完整房间信息（包含密码）
        const roomWithPassword = await this.RoomModel.findOne({
          where: { room_id },
          select: ['room_password'],
        });

        // 房主和管理员可以直接进入自己的房间
        const isRoomOwner = room_info.room_user_id === user_id;
        const isAdmin = ['super', 'admin'].includes(u.user_role);

        if (!isRoomOwner && !isAdmin) {
          if (!inputPassword) {
            client.emit('roomPasswordRequired', {
              code: -4,
              room_id,
              room_name: room_info.room_name,
              msg: '该房间需要密码才能进入',
            });
            return client.disconnect();
          }

          if (inputPassword !== roomWithPassword.room_password) {
            client.emit('tips', {
              code: -4,
              msg: '房间密码错误',
            });
            return client.disconnect();
          }
        }
      }

      /* 正式加入房间 */
      client.join(room_id);

      const isHasRoom = this.room_list_map[room_id];

      /* 如果房间正在等待关闭，取消关闭定时器 */
      if (isHasRoom && this.roomCloseTimers[room_id]) {
        clearTimeout(this.roomCloseTimers[room_id]);
        delete this.roomCloseTimers[room_id];
        console.log(`房间 ${room_id} 有新用户加入，取消延迟关闭`);
      }

      /* 判断当前房间列表有没有这个房间，没有就新增到房间列表, 并把用户加入到房间在线列表 */
      !isHasRoom && (await this.initBasicRoomInfo(room_id, room_info));
      this.room_list_map[room_id].on_line_user_list.push(userInfo);

      /* 记录当前连接的clientId用户和房间号的映射关系 */
      this.clientIdMap[client.id] = { user_id, room_id };

      /* 记录用户到在线列表，并记住当前用户的房间号 */
      this.onlineUserInfo[user_id] = { userInfo, roomId: room_id };

      /* 初始化房间信息 */
      await this.initRoom(client, user_id, user_nick, address, room_id);

      /* 需要通知别的所有人更新房间列表,如果是房间可以加一句提示消息告知开启了新房间 */
      const data: any = { room_list: formatRoomlist(this.room_list_map) };
      !isHasRoom && (data.msg = `${user_nick}的房间[${room_info.room_name}]有新用户加入已成功开启`);
      this.socket.emit('updateRoomlist', data);
    } catch (error) {}
  }

  /**
   * @desc 加入房间之后初始化信息 包含个人信息，歌曲列表，当前播放时间等等
   * @param client
   * @param user_id
   * @param user_nick
   */
  async initRoom(client, user_id, user_nick, address, room_id) {
    const {
      music_info,
      music_queue_list,
      music_src,
      music_lrc,
      on_line_user_list,
      last_music_timespace,
      room_admin_info,
    } = this.room_list_map[Number(room_id)];
    const music_start_time =
      music_info.music_duration - Math.round((last_music_timespace - new Date().getTime()) / 1000);
    const formatOnlineUserList = formatOnlineUser(on_line_user_list, room_admin_info.id);
    /* 初始化房间用户需要用到的各种信息 */
    await client.emit('initRoom', {
      user_id,
      music_src,
      music_info,
      music_lrc,
      music_start_time,
      music_queue_list,
      on_line_user_list: formatOnlineUserList,
      room_admin_info,
      room_list: formatRoomlist(this.room_list_map),
      tips: `欢迎${user_nick}加入房间！`,
      msg: `来自${address}的[${user_nick}]进入房间了`,
    });

    /* 新用户上线，通知其他人，并更新房间的在线用户列表 */
    client.broadcast.to(room_id).emit('online', {
      on_line_user_list: formatOnlineUserList,
      msg: `来自${address}的[${user_nick}]进入房间了`,
    });
  }

  /**
   * @desc 延迟关闭空房间。如果在延迟期间有新用户加入，定时器会被取消。
   * @param room_id 房间ID
   * @param room_info 房间信息
   * @param room_admin_info 房主信息
   */
  private scheduleRoomClose(room_id, room_info, room_admin_info) {
    // 如果已经有一个关闭定时器在运行，先清除
    if (this.roomCloseTimers[room_id]) {
      clearTimeout(this.roomCloseTimers[room_id]);
    }

    const delayMinutes = this.roomCloseDelay / 60000;
    console.log(`房间 ${room_id} 已无人，将在 ${delayMinutes} 分钟后自动关闭`);

    this.roomCloseTimers[room_id] = setTimeout(() => {
      // 再次确认房间仍然没人
      const room = this.room_list_map[room_id];
      if (room && room.on_line_user_list.length === 0) {
        clearTimeout(this.timerList[`timer${room_id}`]);
        delete this.timerList[`timer${room_id}`];
        delete this.room_list_map[room_id];
        delete this.roomCloseTimers[room_id];
        const { room_name } = room_info;
        const { user_nick: roomAdminNick } = room_admin_info;
        this.socket.emit('updateRoomlist', {
          room_list: formatRoomlist(this.room_list_map),
          msg: `[${roomAdminNick}]的房间 [${room_name}] 因房间人已全部退出被系统关闭了`,
        });
        console.log(`房间 ${room_id} [${room_name}] 已自动关闭`);
      } else {
        // 房间里又有人了，不关闭
        delete this.roomCloseTimers[room_id];
      }
    }, this.roomCloseDelay);
  }

  /**
   * @desc 全局消息类型通知，发送给所有人的消息
   * @param message {}: message_type 通知消息类型 message_content 通知内容
   * @param room_id
   */
  messageNotice(room_id, message) {
    this.socket.to(room_id).emit('notice', message);
  }

  /**
   * @desc 初始化房间信息，并记录房间相关信息
   * @param roomId 房间Id
   * @param roomInfo 房间信息 db查询的结果
   */
  async initBasicRoomInfo(room_id, room_info) {
    const { room_user_id } = room_info;
    const room_admin_info = await this.UserModel.findOne({
      where: { id: room_user_id },
      select: ['user_nick', 'user_avatar', 'id', 'user_role'],
    });

    this.room_list_map[Number(room_id)] = {
      on_line_user_list: [],
      music_queue_list: [],
      music_info: {},
      last_music_timespace: null,
      music_src: null,
      music_lrc: null,
      [`timer${room_id}`]: null,
      room_info,
      room_admin_info,
    };

    /* 初次启动房间，需要开始启动音乐 */
    await this.switchMusic(room_id);
  }

  /**
   * @desc 通过clientId 拿到用户信息
   * @param room_id
   * @param cliend_id
   */
  async getUserInfoForClientId(cliend_id) {
    const { user_id, room_id } = this.clientIdMap[cliend_id];
    const { on_line_user_list } = this.room_list_map[room_id];
    return on_line_user_list.find((t) => t.id === user_id);
  }

  /**
   * @desc 通过clientId 拿到房间歌曲队列
   * @param room_id
   * @param cliend_id
   */
  async getMusicQueueForClientId(cliend_id) {
    const { room_id } = this.clientIdMap[cliend_id];
    const { music_queue_list } = this.room_list_map[room_id];
    return music_queue_list;
  }

  /**
   * @desc 获取房间管理员ID列表
   * @param room_id 房间ID
   * @returns 房间管理员ID数组
   */
  async getRoomModeratorIds(room_id: number | string): Promise<number[]> {
    const moderators = await this.RoomModeratorModel.find({
      where: { room_id: Number(room_id), status: 1 },
      select: ['user_id'],
    });
    return moderators.map((m) => m.user_id);
  }

  // ==================== Bot API 支持方法 ====================

  /**
   * @desc Bot 消息广播到房间
   * @param room_id 房间ID
   * @param messageData 消息数据 (已包含 user_info)
   */
  broadcastBotMessage(room_id: number, messageData: any) {
    this.socket.to(String(room_id)).emit('message', { code: 1, data: messageData });
  }

  /**
   * @desc Bot 点歌处理
   * @param room_id 房间ID
   * @param music_mid 歌曲ID
   * @param source 音源
   * @param botUserInfo Bot用户信息
   */
  async handleBotChooseMusic(room_id: number, music_mid: string, source: string, botUserInfo: any) {
    const roomData = this.room_list_map[Number(room_id)];
    if (!roomData) {
      throw new Error('房间不存在或未启动');
    }

    // 获取歌曲详情以填充队列显示信息
    let music_name = '';
    let music_singer = '';
    let music_album = '';
    let music_cover = '';
    try {
      const detail = await getMusicDetailUnified(music_mid, source || 'kugou');
      if (detail?.music_info) {
        music_name = detail.music_info.music_name || '';
        music_singer = detail.music_info.music_singer || '';
        music_album = detail.music_info.music_album || '';
        music_cover = detail.music_info.music_cover || '';
      }
    } catch (e) {
      console.error('Bot点歌获取歌曲详情失败:', e.message);
    }

    // 封面或专辑缺失时，通过播放地址接口补充（该接口有独立的封面数据源）
    if (!music_cover || !music_album) {
      try {
        const srcInfo = await getMusicSrcUnified(music_mid, source || 'kugou');
        if (!music_cover && srcInfo.cover) {
          music_cover = srcInfo.cover;
        }
        if (!music_album && srcInfo.album) {
          music_album = srcInfo.album;
        }
      } catch (e) {
        // 补充信息失败不影响点歌流程
      }
    }

    // 构建与普通用户一致的队列项结构
    const musicQueueItem = {
      music_mid,
      music_name,
      music_singer,
      music_album,
      music_cover,
      source: source || 'kugou',
      user_info: botUserInfo,
    };

    roomData.music_queue_list.push(musicQueueItem);

    // 广播队列更新
    this.socket.to(String(room_id)).emit('chooseMusic', {
      code: 1,
      music_queue_list: roomData.music_queue_list,
      msg: `Bot [${botUserInfo.user_nick}] 点了一首 ${music_name}(${music_singer})`,
    });
  }

  /**
   * @desc 获取房间在线用户数
   * @param room_id 房间ID
   */
  getRoomOnlineCount(room_id: number): number {
    const roomData = this.room_list_map[Number(room_id)];
    return roomData?.on_line_user_list?.length || 0;
  }

  /**
   * @desc 获取房间信息 (供Bot API使用)
   * @param room_id 房间ID
   */
  getRoomData(room_id: number): any {
    return this.room_list_map[Number(room_id)] || null;
  }
}
