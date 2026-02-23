import { RoomEntity } from './room.entity';
import { RoomModeratorEntity } from './room-moderator.entity';
import { UserEntity } from './../user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from './message.entity';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { requestHtml } from 'src/utils/spider';
import { BotEntity } from '../bot/bot.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(MessageEntity)
    private readonly MessageModel: Repository<MessageEntity>,
    @InjectRepository(UserEntity)
    private readonly UserModel: Repository<UserEntity>,
    @InjectRepository(RoomEntity)
    private readonly RoomModel: Repository<RoomEntity>,
    @InjectRepository(RoomModeratorEntity)
    private readonly ModeratorModel: Repository<RoomModeratorEntity>,
    @InjectRepository(BotEntity)
    private readonly BotModel: Repository<BotEntity>,
  ) {}

  async onModuleInit() {
    await this.initOfficialRoom();
  }

  /* 初始化官方聊天室 */
  async initOfficialRoom() {
    const count = await this.RoomModel.count({ where: { room_id: 888 } });
    if (count === 0) {
      const basicRoomInfo = {
        room_name: '官方聊天室',
        room_user_id: 1,
        room_id: 888,
        room_logo: '/basic/room-default-logo.gif',
        room_need_password: 1,
        room_notice: '欢迎来到官方聊天室',
      };
      const room = await this.RoomModel.save(basicRoomInfo);
      Logger.debug('官方聊天室初始化成功', room);
    }
  }

  /* 查询历史消息 */
  async history(params) {
    const { page = 1, pagesize = 300, room_id = 888 } = params;
    // 过滤已删除的消息（message_status: 1=正常, -1=撤回, -2=管理员删除）
    const messageInfo = await this.MessageModel.createQueryBuilder('message')
      .where('message.room_id = :room_id', { room_id })
      .andWhere('message.message_status != :deleted', { deleted: -2 })
      .orderBy('message.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getMany();

    /* 收集此次所有的用户id 包含发送消息的和被艾特消息的 */
    const userIds = [];
    const botIds = []; // Bot ID 是负数
    const quoteMessageIds = [];

    messageInfo.forEach((t) => {
      if (t.user_id < 0) {
        // Bot 消息，user_id 是负数，实际 Bot ID 是 -user_id
        const botId = -t.user_id;
        !botIds.includes(botId) && botIds.push(botId);
      } else {
        !userIds.includes(t.user_id) && userIds.push(t.user_id);
      }
      !userIds.includes(t.quote_user_id) && t.quote_user_id && t.quote_user_id > 0 && userIds.push(t.quote_user_id);
      !quoteMessageIds.includes(t.quote_message_id) && t.quote_message_id && quoteMessageIds.push(t.quote_message_id);
    });

    // 查询正常用户信息
    const userInfoList: any[] =
      userIds.length > 0
        ? await this.UserModel.find({
            where: { id: In(userIds) },
            select: ['id', 'user_nick', 'user_avatar', 'user_role'],
          })
        : [];

    userInfoList.forEach((t: any) => (t.user_id = t.id));

    // 查询 Bot 信息并构建 user_info
    if (botIds.length > 0) {
      const bots = await this.BotModel.find({
        where: { id: In(botIds) },
        select: ['id', 'bot_name', 'bot_username', 'bot_avatar'],
      });

      bots.forEach((bot) => {
        userInfoList.push({
          id: -bot.id, // 负数 ID 标识 Bot
          user_id: -bot.id,
          user_nick: bot.bot_name,
          user_username: bot.bot_username,
          user_avatar: bot.bot_avatar || '/images/default-bot-avatar.png',
          user_role: 'bot',
          is_bot: true,
          bot_id: bot.id,
        });
      });
    }

    /* 获取该房间的房管列表 */
    const moderators = await this.ModeratorModel.find({
      where: { room_id: Number(room_id), status: 1 },
      select: ['user_id'],
    });
    const moderatorIds = moderators.map((m) => m.user_id);

    /* 为用户信息添加 is_moderator 标记 (仅限正常用户) */
    userInfoList.forEach((t: any) => {
      if (!t.is_bot) {
        t.is_moderator = moderatorIds.includes(t.id);
      }
    });

    /* 相关联的引用消息的信息 */
    const messageInfoList = await this.MessageModel.find({
      where: { id: In(quoteMessageIds) },
      select: ['id', 'message_content', 'message_type', 'user_id', 'message_status'],
    });

    /* 对引用消息通过user_id拿到此条消息的user_nick 并修改字段名称 */
    messageInfoList.forEach((t: any) => {
      const quoteUser = userInfoList.find((k: any) => k.user_id === t.user_id);
      t.quote_user_nick = quoteUser?.user_nick || '未知用户';
      // 安全解析消息内容
      try {
        t.quote_message_content = JSON.parse(t.message_content);
      } catch (e) {
        t.quote_message_content = t.message_content;
      }
      t.quote_message_type = t.message_type;
      t.quote_message_status = t.message_status;
      t.quote_message_id = t.id;
      t.quote_user_id = t.user_id;
      delete t.message_content;
      delete t.message_type;
    });

    /* 组装信息，带上发消息人的用户信息 已经引用的那条消息的用户和消息信息 */
    messageInfo.forEach((t: any) => {
      t.user_info = userInfoList.find((k: any) => k.user_id === t.user_id);
      t.quote_info = messageInfoList.find((k) => k.id === t.quote_message_id);
      t.message_status === -1 && (t.message_content = `${t.user_info.user_nick}撤回了一条消息`);
      t.message_status === -1 && (t.message_type = 'info');
      /* 正常消息需要反序列化 message_content */
      if (t.message_content && t.message_status === 1) {
        try {
          t.message_content = JSON.parse(t.message_content);
        } catch (e) {
          // 如果解析失败，保持原样
        }
      }
    });

    return messageInfo.reverse();
  }

  /* 在线搜索表情包 */
  async emoticon(params) {
    const { keyword } = params;
    const url = `https://www.doutupk.com/search?keyword=${encodeURIComponent(keyword)}`;
    const $ = await requestHtml(url);
    const list = [];
    $('.search-result .pic-content .random_picture a').each((index, node) => {
      const url = $(node).find('img').attr('data-original');
      url && list.push(url);
    });
    return list;
  }

  /**
   * @desc 创建个人聊天室
   * @param params
   */
  async createRoom(params, req) {
    const { user_id: room_user_id } = req.payload;
    const { room_id } = params;
    const { user_room_id, user_avatar } = await this.UserModel.findOne({
      where: { id: room_user_id },
      select: ['user_room_id', 'user_avatar'],
    });
    if (user_room_id) {
      throw new HttpException(`您已经创建过了，拒绝重复创建！`, HttpStatus.BAD_REQUEST);
    }
    const count = await this.RoomModel.count({ where: { room_id } });
    if (count) {
      throw new HttpException(`房间ID[${room_id}]已经被注册了，换一个试试吧！`, HttpStatus.BAD_REQUEST);
    }
    /* 客户端没传房间头像就默认使用用户的头像 */
    const room = Object.assign({ room_user_id }, params);
    !room.room_logo && (room.room_logo = user_avatar);
    await this.RoomModel.save(room);
    await this.UserModel.update({ id: room_user_id }, { user_room_id: room_id });
    return true;
  }

  /* 查询房间信息 */
  async roomInfo(params) {
    const { room_id } = params;
    return await this.RoomModel.findOne({
      where: { room_id },
      select: ['room_id', 'room_user_id', 'room_logo', 'room_bg_img', 'room_need_password', 'room_notice', 'room_name'],
    });
  }

  /* 修改自己的房间信息 */
  async updateRoomInfo(params, payload) {
    const { user_id } = payload;
    const { room_id } = params;
    const room = await this.RoomModel.findOne({
      where: { room_user_id: user_id, room_id },
    });
    if (!room) {
      throw new HttpException(`您无权操作当前房间：房间ID[${room_id}]`, HttpStatus.BAD_REQUEST);
    }
    /* 个人修改允许修改这些字段 */
    const whiteListKeys = [
      'room_bg_img',
      'room_name',
      'room_notice',
      'room_need_password',
      'room_password',
      'room_logo',
    ];
    const updateInfo = {};
    whiteListKeys.forEach((key) => Object.keys(params).includes(key) && (updateInfo[key] = params[key]));
    await this.RoomModel.update({ room_id }, updateInfo);
    return true;
  }

  // ==================== 房管管理 ====================
  // 注：addModerator 和 removeModerator 已整合到 /api/admin/users/role

  /**
   * @desc 获取房间的房管列表
   * @param params ModeratorListDto
   */
  async getModeratorList(params) {
    const { room_id } = params;

    const moderators = await this.ModeratorModel.find({
      where: { room_id, status: 1 },
      order: { id: 'ASC' },
    });

    // 获取房管的用户信息
    if (moderators.length === 0) {
      return [];
    }

    const userIds = moderators.map((m) => m.user_id);
    const users = await this.UserModel.find({
      where: { id: In(userIds) },
      select: ['id', 'user_nick', 'user_avatar', 'user_role'],
    });

    // 合并房管信息和用户信息
    return moderators.map((m) => {
      const user = users.find((u) => u.id === m.user_id);
      return {
        id: m.id,
        room_id: m.room_id,
        user_id: m.user_id,
        user_nick: user?.user_nick || '',
        user_avatar: user?.user_avatar || '',
        appointed_by: m.appointed_by,
        remark: m.remark,
        created_at: m.createdAt,
      };
    });
  }

  /**
   * @desc 检查用户是否是指定房间的房管
   * @param room_id 房间ID
   * @param user_id 用户ID
   */
  async isModerator(room_id: number, user_id: number): Promise<boolean> {
    const moderator = await this.ModeratorModel.findOne({
      where: { room_id, user_id, status: 1 },
    });
    return !!moderator;
  }

  /**
   * 获取房间内所有 Bot 的命令列表
   * @param room_id 房间ID
   */
  async getRoomBotCommands(room_id: number): Promise<any[]> {
    const bots = await this.BotModel.find({
      where: { status: 1, approval_status: 'approved' },
      select: ['id', 'bot_name', 'bot_avatar', 'bot_username', 'commands', 'allowed_rooms'],
    });
    const result = [];
    for (const bot of bots) {
      // 检查 bot 是否有权访问此房间
      const rooms = bot.allowed_rooms ? String(bot.allowed_rooms).split(',').map(Number) : [];
      if (rooms.length > 0 && !rooms.includes(room_id)) continue;
      if (!bot.commands || bot.commands.length === 0) continue;
      result.push({
        bot_id: bot.id,
        bot_name: bot.bot_name,
        bot_avatar: bot.bot_avatar,
        bot_username: bot.bot_username,
        commands: bot.commands,
      });
    }
    return result;
  }
}
