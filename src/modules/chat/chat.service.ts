import { RoomEntity } from './room.entity';
import { RoomModeratorEntity } from './room-moderator.entity';
import { UserEntity } from './../user/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { MessageEntity } from './message.entity';
import { Injectable, HttpException, HttpStatus, Logger } from '@nestjs/common';
import { Repository, In } from 'typeorm';
import { requestHtml } from 'src/utils/spider';

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
    const messageInfo = await this.MessageModel.find({
      where: { room_id },
      order: { id: 'DESC' },
      skip: (page - 1) * pagesize,
      take: pagesize,
    });

    /* 收集此次所有的用户id 包含发送消息的和被艾特消息的 */
    const userIds = [];
    const quoteMessageIds = [];

    messageInfo.forEach((t) => {
      !userIds.includes(t.user_id) && userIds.push(t.user_id);
      !userIds.includes(t.quote_user_id) && t.quote_user_id && userIds.push(t.quote_user_id);
      !quoteMessageIds.includes(t.quote_message_id) && t.quote_message_id && quoteMessageIds.push(t.quote_message_id);
    });

    const userInfoList = await this.UserModel.find({
      where: { id: In(userIds) },
      select: ['id', 'user_nick', 'user_avatar', 'user_role'],
    });

    userInfoList.forEach((t: any) => (t.user_id = t.id));

    /* 相关联的引用消息的信息 */
    const messageInfoList = await this.MessageModel.find({
      where: { id: In(quoteMessageIds) },
      select: ['id', 'message_content', 'message_type', 'user_id', 'message_status'],
    });

    /* TODO 消息列表中的用户 */

    /* 对引用消息通过user_id拿到此条消息的user_nick 并修改字段名称 */
    messageInfoList.forEach((t: any) => {
      t.quote_user_nick = userInfoList.find((k: any) => k.user_id === t.user_id)['user_nick'];
      t.quote_message_content = JSON.parse(t.message_content);
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

  /**
   * @desc 添加房管
   * @param params AddModeratorDto
   * @param payload JWT payload
   */
  async addModerator(params, payload) {
    const { room_id, user_id, remark } = params;
    const { user_id: operator_id, user_role } = payload;

    // 检查房间是否存在
    const room = await this.RoomModel.findOne({ where: { room_id } });
    if (!room) {
      throw new HttpException(`房间 [${room_id}] 不存在`, HttpStatus.BAD_REQUEST);
    }

    // 检查操作权限：只有房主、管理员、超管可以添加房管
    const isRoomOwner = room.room_user_id === operator_id;
    const isAdmin = ['super', 'admin'].includes(user_role);
    if (!isRoomOwner && !isAdmin) {
      throw new HttpException('您没有权限为该房间添加房管', HttpStatus.FORBIDDEN);
    }

    // 检查目标用户是否存在
    const targetUser = await this.UserModel.findOne({ where: { id: user_id } });
    if (!targetUser) {
      throw new HttpException(`用户 [${user_id}] 不存在`, HttpStatus.BAD_REQUEST);
    }

    // 不能把自己设为房管
    if (user_id === operator_id) {
      throw new HttpException('不能将自己设为房管', HttpStatus.BAD_REQUEST);
    }

    // 检查是否已经是房管
    const existing = await this.ModeratorModel.findOne({
      where: { room_id, user_id, status: 1 },
    });
    if (existing) {
      throw new HttpException('该用户已经是此房间的房管', HttpStatus.BAD_REQUEST);
    }

    // 添加房管
    await this.ModeratorModel.save({
      room_id,
      user_id,
      appointed_by: operator_id,
      remark: remark || '',
      status: 1,
    });

    return { message: '添加房管成功', user_id, room_id };
  }

  /**
   * @desc 移除房管
   * @param params RemoveModeratorDto
   * @param payload JWT payload
   */
  async removeModerator(params, payload) {
    const { room_id, user_id } = params;
    const { user_id: operator_id, user_role } = payload;

    // 检查房间是否存在
    const room = await this.RoomModel.findOne({ where: { room_id } });
    if (!room) {
      throw new HttpException(`房间 [${room_id}] 不存在`, HttpStatus.BAD_REQUEST);
    }

    // 检查操作权限：只有房主、管理员、超管可以移除房管
    const isRoomOwner = room.room_user_id === operator_id;
    const isAdmin = ['super', 'admin'].includes(user_role);
    if (!isRoomOwner && !isAdmin) {
      throw new HttpException('您没有权限移除该房间的房管', HttpStatus.FORBIDDEN);
    }

    // 检查是否是房管
    const existing = await this.ModeratorModel.findOne({
      where: { room_id, user_id, status: 1 },
    });
    if (!existing) {
      throw new HttpException('该用户不是此房间的房管', HttpStatus.BAD_REQUEST);
    }

    // 移除房管（软删除，将状态设为0）
    await this.ModeratorModel.update({ id: existing.id }, { status: 0 });

    return { message: '移除房管成功', user_id, room_id };
  }

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
}
