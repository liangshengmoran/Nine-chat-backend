import { Injectable, HttpException, HttpStatus } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like, In } from 'typeorm';
import { UserEntity } from '../user/user.entity';
import { RoomEntity } from '../chat/room.entity';
import { RoomModeratorEntity } from '../chat/room-moderator.entity';
import { MessageEntity } from '../chat/message.entity';
import { MusicEntity } from '../music/music.entity';
import { CollectEntity } from '../music/collect.entity';
import { AnnouncementEntity } from './announcement.entity';
import { OperationLogEntity } from './operation-log.entity';
import { SensitiveWordEntity } from './sensitive-word.entity';
import { FeedbackEntity } from './feedback.entity';
import { InviteCodeEntity } from './invite-code.entity';
import { IpBlacklistEntity } from './ip-blacklist.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly UserModel: Repository<UserEntity>,
    @InjectRepository(RoomEntity)
    private readonly RoomModel: Repository<RoomEntity>,
    @InjectRepository(RoomModeratorEntity)
    private readonly ModeratorModel: Repository<RoomModeratorEntity>,
    @InjectRepository(MessageEntity)
    private readonly MessageModel: Repository<MessageEntity>,
    @InjectRepository(MusicEntity)
    private readonly MusicModel: Repository<MusicEntity>,
    @InjectRepository(CollectEntity)
    private readonly CollectModel: Repository<CollectEntity>,
    @InjectRepository(AnnouncementEntity)
    private readonly AnnouncementModel: Repository<AnnouncementEntity>,
    @InjectRepository(OperationLogEntity)
    private readonly OperationLogModel: Repository<OperationLogEntity>,
    @InjectRepository(SensitiveWordEntity)
    private readonly SensitiveWordModel: Repository<SensitiveWordEntity>,
    @InjectRepository(FeedbackEntity)
    private readonly FeedbackModel: Repository<FeedbackEntity>,
    @InjectRepository(InviteCodeEntity)
    private readonly InviteCodeModel: Repository<InviteCodeEntity>,
    @InjectRepository(IpBlacklistEntity)
    private readonly IpBlacklistModel: Repository<IpBlacklistEntity>,
  ) {}

  // ==================== 仪表盘统计 ====================

  /**
   * 获取仪表盘统计数据
   */
  async getDashboard() {
    const [userCount, roomCount, musicCount, messageCount] = await Promise.all([
      this.UserModel.count(),
      this.RoomModel.count(),
      this.MusicModel.count(),
      this.MessageModel.count(),
    ]);

    // 获取最近7天的消息统计
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 获取最近注册的用户
    const recentUsers = await this.UserModel.find({
      order: { id: 'DESC' },
      take: 5,
      select: ['id', 'user_name', 'user_nick', 'user_avatar', 'createdAt'],
    });

    // 获取热门房间
    const rooms = await this.RoomModel.find({
      order: { id: 'ASC' },
      take: 5,
      select: ['room_id', 'room_name', 'room_logo'],
    });

    return {
      stats: {
        userCount,
        roomCount,
        musicCount,
        messageCount,
      },
      recentUsers,
      topRooms: rooms,
    };
  }

  // ==================== 用户管理 ====================

  /**
   * 获取用户列表
   */
  async getUserList(params) {
    const { keyword, role, page = 1, pagesize = 20 } = params;

    const where: any = {};
    if (keyword) {
      where.user_nick = Like(`%${keyword}%`);
    }
    if (role) {
      where.user_role = role;
    }

    const [list, total] = await this.UserModel.findAndCount({
      where,
      order: { id: 'DESC' },
      skip: (page - 1) * pagesize,
      take: pagesize,
      select: ['id', 'user_name', 'user_nick', 'user_avatar', 'user_role', 'user_room_id', 'user_status', 'createdAt'],
    });

    return {
      list,
      total,
      page: Number(page),
      pagesize: Number(pagesize),
      totalPages: Math.ceil(total / pagesize),
    };
  }

  /**
   * 获取用户详情
   */
  async getUserDetail(userId: number) {
    const user = await this.UserModel.findOne({
      where: { id: userId },
      select: [
        'id',
        'user_name',
        'user_nick',
        'user_avatar',
        'user_role',
        'user_room_id',
        'user_status',
        'createdAt',
        'updatedAt',
      ],
    });

    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    // 获取用户的收藏数
    const collectCount = await this.CollectModel.count({ where: { user_id: userId } });

    // 获取用户的消息数
    const messageCount = await this.MessageModel.count({ where: { user_id: userId } });

    // 获取用户管理的房间
    const moderatorRooms = await this.ModeratorModel.find({
      where: { user_id: userId, status: 1 },
    });

    return {
      ...user,
      collectCount,
      messageCount,
      moderatorRoomIds: moderatorRooms.map((m) => m.room_id),
    };
  }

  /**
   * 更新用户角色
   * 角色类型：
   * - admin/user: 系统角色，不需要 room_id
   * - owner: 房间房主，需要 room_id
   * - moderator: 设为房管，需要 room_id
   * - remove_moderator: 移除房管，需要 room_id
   *
   * 权限规则：
   * - 超管可控制：管理员、房主、房管
   * - 管理员可控制：房主、房管
   * - 房主可控制：房主（转让给他人）、房管
   */
  async updateUserRole(params, operatorPayload) {
    const { user_id, role, room_id } = params;
    const { user_id: operator_id, user_role: operatorRole } = operatorPayload;

    const user = await this.UserModel.findOne({ where: { id: user_id } });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    // 不能修改超管
    if (user.user_role === 'super') {
      throw new HttpException('不能修改超级管理员', HttpStatus.FORBIDDEN);
    }

    // ========== 处理房间角色：owner, moderator, remove_moderator ==========
    if (['owner', 'moderator', 'remove_moderator'].includes(role)) {
      if (!room_id) {
        throw new HttpException(`操作 ${role} 必须提供 room_id`, HttpStatus.BAD_REQUEST);
      }

      const room = await this.RoomModel.findOne({ where: { room_id } });
      if (!room) {
        throw new HttpException(`房间 [${room_id}] 不存在`, HttpStatus.BAD_REQUEST);
      }

      const isRoomOwner = room.room_user_id === operator_id;
      const isAdmin = ['super', 'admin'].includes(operatorRole);

      // 权限检查：超管/管理员 或 当前房主可以操作
      if (!isAdmin && !isRoomOwner) {
        throw new HttpException('只有超管、管理员或当前房主可以设置/移除房主/房管', HttpStatus.FORBIDDEN);
      }

      if (role === 'owner') {
        // ===== 设置房主 =====
        if (room.room_user_id === user_id) {
          return { message: '该用户已经是此房间的房主' };
        }

        const oldOwnerId = room.room_user_id;

        // 更新房主
        await this.RoomModel.update({ room_id }, { room_user_id: user_id });

        // 更新新房主的 user_room_id
        await this.UserModel.update({ id: user_id }, { user_room_id: room_id });

        // 清除旧房主的 user_room_id（如果他没有其他房间）
        const otherRooms = await this.RoomModel.count({ where: { room_user_id: oldOwnerId } });
        if (otherRooms === 0) {
          await this.UserModel.update({ id: oldOwnerId }, { user_room_id: null });
        }

        // 如果是房主自己转让，将原房主角色降级为 user（除非原房主是超管/管理员）
        if (isRoomOwner && !isAdmin) {
          const oldOwner = await this.UserModel.findOne({ where: { id: oldOwnerId } });
          if (oldOwner && !['super', 'admin'].includes(oldOwner.user_role)) {
            await this.UserModel.update({ id: oldOwnerId }, { user_role: 'user' });
          }
        }

        return {
          message: '房主更换成功',
          old_owner_id: oldOwnerId,
          new_owner_id: user_id,
        };
      } else if (role === 'moderator') {
        // ===== 设置房管 =====
        const existing = await this.ModeratorModel.findOne({
          where: { room_id, user_id, status: 1 },
        });
        if (existing) {
          return { message: '该用户已经是此房间的房管' };
        }

        await this.ModeratorModel.save({
          room_id,
          user_id,
          appointed_by: operator_id,
          remark: '',
          status: 1,
        });

        return { message: '房管设置成功', user_id, room_id };
      } else {
        // ===== 移除房管 (remove_moderator) =====
        const existing = await this.ModeratorModel.findOne({
          where: { room_id, user_id, status: 1 },
        });
        if (!existing) {
          return { message: '该用户不是此房间的房管' };
        }

        // 软删除
        await this.ModeratorModel.update({ id: existing.id }, { status: 0 });

        return { message: '房管已移除', user_id, room_id };
      }
    }

    // ========== 处理系统角色：admin, user ==========
    // 只有超管可以设置管理员
    if (role === 'admin' && operatorRole !== 'super') {
      throw new HttpException('只有超级管理员可以设置管理员', HttpStatus.FORBIDDEN);
    }

    // 更新用户角色
    await this.UserModel.update({ id: user_id }, { user_role: role });

    return { message: '角色更新成功' };
  }

  /**
   * 封禁/解封用户
   */
  async toggleUserBan(params, _operatorPayload) {
    const { user_id } = params;

    const user = await this.UserModel.findOne({ where: { id: user_id } });
    if (!user) {
      throw new HttpException('用户不存在', HttpStatus.NOT_FOUND);
    }

    // 不能封禁超管或管理员
    if (['super', 'admin'].includes(user.user_role)) {
      throw new HttpException('不能封禁管理员', HttpStatus.FORBIDDEN);
    }

    const newStatus = user.user_status === 1 ? 0 : 1;
    await this.UserModel.update({ id: user_id }, { user_status: newStatus });

    return {
      message: newStatus === 0 ? '用户已封禁' : '用户已解封',
      user_status: newStatus,
    };
  }

  // ==================== 房间管理 ====================

  /**
   * 获取房间列表
   */
  async getRoomList(params) {
    const { keyword, page = 1, pagesize = 20 } = params;

    const queryBuilder = this.RoomModel.createQueryBuilder('room');

    if (keyword) {
      queryBuilder.where('room.room_name LIKE :keyword OR room.room_id LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    const [list, total] = await queryBuilder
      .orderBy('room.id', 'ASC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    // 获取房主信息
    const ownerIds = list.map((r) => r.room_user_id);
    const owners = await this.UserModel.find({
      where: { id: In(ownerIds) },
      select: ['id', 'user_nick', 'user_avatar'],
    });

    const listWithOwner = list.map((room) => ({
      ...room,
      owner: owners.find((o) => o.id === room.room_user_id) || null,
    }));

    return {
      list: listWithOwner,
      total,
      page: Number(page),
      pagesize: Number(pagesize),
      totalPages: Math.ceil(total / pagesize),
    };
  }

  /**
   * 获取房间详情
   */
  async getRoomDetail(roomId: number) {
    const room = await this.RoomModel.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 获取房主信息
    const owner = await this.UserModel.findOne({
      where: { id: room.room_user_id },
      select: ['id', 'user_nick', 'user_avatar'],
    });

    // 获取房管列表
    const moderators = await this.ModeratorModel.find({
      where: { room_id: roomId, status: 1 },
    });
    const moderatorIds = moderators.map((m) => m.user_id);
    const moderatorUsers =
      moderatorIds.length > 0
        ? await this.UserModel.find({
            where: { id: In(moderatorIds) },
            select: ['id', 'user_nick', 'user_avatar'],
          })
        : [];

    // 获取消息数
    const messageCount = await this.MessageModel.count({ where: { room_id: roomId } });

    return {
      ...room,
      owner,
      moderators: moderatorUsers,
      messageCount,
    };
  }

  // ==================== 曲库管理 ====================

  /**
   * 获取曲库列表
   */
  async getMusicList(params) {
    const { keyword, source, page = 1, pagesize = 20 } = params;

    const where: any = {};
    if (keyword) {
      // TypeORM 不直接支持 OR，需要用 QueryBuilder
    }
    if (source) {
      where.source = source;
    }

    const queryBuilder = this.MusicModel.createQueryBuilder('music');

    if (keyword) {
      queryBuilder.where('music.music_name LIKE :keyword OR music.music_singer LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }
    if (source) {
      queryBuilder.andWhere('music.source = :source', { source });
    }

    const [list, total] = await queryBuilder
      .orderBy('music.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return {
      list,
      total,
      page: Number(page),
      pagesize: Number(pagesize),
      totalPages: Math.ceil(total / pagesize),
    };
  }

  /**
   * 删除曲库歌曲
   */
  async deleteMusic(params, _operatorPayload) {
    const { music_id } = params;

    const music = await this.MusicModel.findOne({ where: { id: music_id } });
    if (!music) {
      throw new HttpException('歌曲不存在', HttpStatus.NOT_FOUND);
    }

    await this.MusicModel.delete({ id: music_id });
    return { message: '歌曲已从曲库删除' };
  }

  /**
   * 获取收藏统计
   */
  async getCollectStats() {
    // 获取收藏最多的歌曲
    const topCollected = await this.CollectModel.createQueryBuilder('collect')
      .select('collect.music_mid', 'music_mid')
      .addSelect('collect.music_name', 'music_name')
      .addSelect('collect.music_singer', 'music_singer')
      .addSelect('COUNT(*)', 'collect_count')
      .groupBy('collect.music_mid')
      .orderBy('collect_count', 'DESC')
      .limit(10)
      .getRawMany();

    return { topCollected };
  }

  // ==================== 消息管理 ====================

  /**
   * 获取消息列表
   */
  async getMessageList(params) {
    const { room_id, user_id, keyword, page = 1, pagesize = 20 } = params;

    const queryBuilder = this.MessageModel.createQueryBuilder('message');

    if (room_id) {
      queryBuilder.andWhere('message.room_id = :room_id', { room_id });
    }
    if (user_id) {
      queryBuilder.andWhere('message.user_id = :user_id', { user_id });
    }
    if (keyword) {
      queryBuilder.andWhere('message.message_content LIKE :keyword', {
        keyword: `%${keyword}%`,
      });
    }

    const [list, total] = await queryBuilder
      .orderBy('message.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    // 获取用户信息
    const userIds = [...new Set(list.map((m) => m.user_id))];
    const users =
      userIds.length > 0
        ? await this.UserModel.find({
            where: { id: In(userIds) },
            select: ['id', 'user_nick', 'user_avatar'],
          })
        : [];

    const listWithUser = list.map((msg) => ({
      ...msg,
      user: users.find((u) => u.id === msg.user_id) || null,
    }));

    return {
      list: listWithUser,
      total,
      page: Number(page),
      pagesize: Number(pagesize),
      totalPages: Math.ceil(total / pagesize),
    };
  }

  /**
   * 删除消息
   */
  async deleteMessage(params) {
    const { message_id } = params;

    const message = await this.MessageModel.findOne({ where: { id: message_id } });
    if (!message) {
      throw new HttpException('消息不存在', HttpStatus.NOT_FOUND);
    }

    // 将消息状态设为已删除
    await this.MessageModel.update({ id: message_id }, { message_status: -2 });
    return { message: '消息已删除' };
  }

  // ==================== 房间管理扩展 ====================

  /**
   * 管理员更新房间信息
   */
  async updateRoom(params) {
    const { room_id, ...updateData } = params;

    const room = await this.RoomModel.findOne({ where: { room_id } });
    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 过滤空值
    const filteredData = {};
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        filteredData[key] = updateData[key];
      }
    });

    if (Object.keys(filteredData).length === 0) {
      throw new HttpException('没有需要更新的内容', HttpStatus.BAD_REQUEST);
    }

    await this.RoomModel.update({ room_id }, filteredData);
    return { message: '房间信息更新成功' };
  }

  /**
   * 删除房间
   */
  async deleteRoom(roomId: number) {
    const room = await this.RoomModel.findOne({ where: { room_id: roomId } });
    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 官方房间不能删除
    if (roomId === 888) {
      throw new HttpException('不能删除官方房间', HttpStatus.FORBIDDEN);
    }

    // 删除房间的房管记录
    await this.ModeratorModel.delete({ room_id: roomId });

    // 清除房主的房间关联
    await this.UserModel.update({ user_room_id: String(roomId) }, { user_room_id: null });

    // 删除房间
    await this.RoomModel.delete({ room_id: roomId });

    return { message: '房间已删除' };
  }

  // ==================== 系统公告管理 ====================

  /**
   * 创建公告
   */
  async createAnnouncement(params, operatorPayload) {
    const { title, content, type = 0, expire_at } = params;
    const { user_id, user_nick } = operatorPayload;

    const announcement = await this.AnnouncementModel.save({
      title,
      content,
      type,
      expire_at,
      publisher_id: user_id,
      publisher_nick: user_nick,
    });

    // 记录操作日志
    await this.logOperation(operatorPayload, 'announcement_create', '创建公告', announcement.id, 'announcement');

    return { message: '公告创建成功', id: announcement.id };
  }

  /**
   * 更新公告
   */
  async updateAnnouncement(params, operatorPayload) {
    const { id, ...updateData } = params;

    const announcement = await this.AnnouncementModel.findOne({ where: { id } });
    if (!announcement) {
      throw new HttpException('公告不存在', HttpStatus.NOT_FOUND);
    }

    const filteredData = {};
    Object.keys(updateData).forEach((key) => {
      if (updateData[key] !== undefined && updateData[key] !== null) {
        filteredData[key] = updateData[key];
      }
    });

    await this.AnnouncementModel.update({ id }, filteredData);

    // 记录操作日志
    await this.logOperation(operatorPayload, 'announcement_update', '更新公告', id, 'announcement');

    return { message: '公告更新成功' };
  }

  /**
   * 删除公告
   */
  async deleteAnnouncement(id: number, operatorPayload) {
    const announcement = await this.AnnouncementModel.findOne({ where: { id } });
    if (!announcement) {
      throw new HttpException('公告不存在', HttpStatus.NOT_FOUND);
    }

    await this.AnnouncementModel.delete({ id });

    // 记录操作日志
    await this.logOperation(operatorPayload, 'announcement_delete', '删除公告', id, 'announcement');

    return { message: '公告已删除' };
  }

  /**
   * 获取公告列表（管理端）
   */
  async getAnnouncementList(params) {
    const { page = 1, pagesize = 10, status } = params;

    const queryBuilder = this.AnnouncementModel.createQueryBuilder('announcement');

    if (status !== undefined) {
      queryBuilder.andWhere('announcement.status = :status', { status });
    }

    const [list, total] = await queryBuilder
      .orderBy('announcement.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return {
      list,
      total,
      page: Number(page),
      pagesize: Number(pagesize),
      totalPages: Math.ceil(total / pagesize),
    };
  }

  /**
   * 获取有效公告（前端展示用）
   */
  async getActiveAnnouncements() {
    const now = new Date();
    const list = await this.AnnouncementModel.createQueryBuilder('announcement')
      .where('announcement.status = :status', { status: 1 })
      .andWhere('(announcement.expire_at IS NULL OR announcement.expire_at > :now)', { now })
      .orderBy('announcement.type', 'DESC')
      .addOrderBy('announcement.id', 'DESC')
      .getMany();

    return { list };
  }

  // ==================== 操作日志 ====================

  /**
   * 记录操作日志
   */
  private async logOperation(
    operatorPayload,
    actionType: string,
    actionDesc: string,
    targetId?: number,
    targetType?: string,
    actionDetail?: any,
  ) {
    const { user_id, user_nick } = operatorPayload;

    await this.OperationLogModel.save({
      operator_id: user_id,
      operator_nick: user_nick,
      action_type: actionType,
      action_desc: actionDesc,
      target_id: targetId,
      target_type: targetType,
      action_detail: actionDetail ? JSON.stringify(actionDetail) : null,
    });
  }

  /**
   * 获取操作日志列表
   */
  async getOperationLogs(params) {
    const { page = 1, pagesize = 20, operator_id, action_type, target_type } = params;

    const queryBuilder = this.OperationLogModel.createQueryBuilder('log');

    if (operator_id) {
      queryBuilder.andWhere('log.operator_id = :operator_id', { operator_id });
    }
    if (action_type) {
      queryBuilder.andWhere('log.action_type = :action_type', { action_type });
    }
    if (target_type) {
      queryBuilder.andWhere('log.target_type = :target_type', { target_type });
    }

    const [list, total] = await queryBuilder
      .orderBy('log.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return {
      list,
      total,
      page: Number(page),
      pagesize: Number(pagesize),
      totalPages: Math.ceil(total / pagesize),
    };
  }

  // ==================== 批量操作 ====================

  /**
   * 批量封禁用户
   */
  async batchBanUsers(params, operatorPayload) {
    const { user_ids, reason } = params;

    if (!user_ids || user_ids.length === 0) {
      throw new HttpException('用户ID列表不能为空', HttpStatus.BAD_REQUEST);
    }

    // 不能封禁管理员
    const admins = await this.UserModel.find({
      where: { id: In(user_ids), user_role: In(['super', 'admin']) },
    });

    if (admins.length > 0) {
      throw new HttpException('不能封禁管理员账号', HttpStatus.FORBIDDEN);
    }

    await this.UserModel.update({ id: In(user_ids) }, { user_status: 0 });

    // 记录操作日志
    await this.logOperation(operatorPayload, 'batch_ban_users', `批量封禁 ${user_ids.length} 个用户`, null, 'user', {
      user_ids,
      reason,
    });

    return { message: `成功封禁 ${user_ids.length} 个用户` };
  }

  /**
   * 批量删除消息
   */
  async batchDeleteMessages(params, operatorPayload) {
    const { message_ids } = params;

    if (!message_ids || message_ids.length === 0) {
      throw new HttpException('消息ID列表不能为空', HttpStatus.BAD_REQUEST);
    }

    await this.MessageModel.update({ id: In(message_ids) }, { message_status: -2 });

    // 记录操作日志
    await this.logOperation(
      operatorPayload,
      'batch_delete_messages',
      `批量删除 ${message_ids.length} 条消息`,
      null,
      'message',
      { message_ids },
    );

    return { message: `成功删除 ${message_ids.length} 条消息` };
  }

  // ==================== 在线统计 ====================

  /**
   * 获取在线统计信息
   * 注意：实际在线用户数由 WebSocket Gateway 管理
   * 这里提供一个 API 接口供管理后台调用
   */
  async getOnlineStats() {
    // 这个数据需要从 WebSocket Gateway 获取
    // 暂时返回统计数据
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayNewUsers, todayMessages] = await Promise.all([
      this.UserModel.createQueryBuilder('user').where('user.createdAt >= :todayStart', { todayStart }).getCount(),
      this.MessageModel.createQueryBuilder('message')
        .where('message.createdAt >= :todayStart', { todayStart })
        .getCount(),
    ]);

    return {
      todayNewUsers,
      todayMessages,
      // onlineUsers 需要从 WebSocket Gateway 注入或通过其他方式获取
    };
  }

  // ==================== 敏感词管理 ====================

  /**
   * 添加敏感词
   */
  async addSensitiveWord(params) {
    const { word, type = 0, replacement } = params;

    const existing = await this.SensitiveWordModel.findOne({ where: { word } });
    if (existing) {
      throw new HttpException('该敏感词已存在', HttpStatus.BAD_REQUEST);
    }

    await this.SensitiveWordModel.save({ word, type, replacement });
    return { message: '敏感词添加成功' };
  }

  /**
   * 删除敏感词
   */
  async deleteSensitiveWord(id: number) {
    await this.SensitiveWordModel.delete({ id });
    return { message: '敏感词已删除' };
  }

  /**
   * 获取敏感词列表
   */
  async getSensitiveWordList(params) {
    const { page = 1, pagesize = 20, keyword } = params;

    const queryBuilder = this.SensitiveWordModel.createQueryBuilder('word');

    if (keyword) {
      queryBuilder.andWhere('word.word LIKE :keyword', { keyword: `%${keyword}%` });
    }

    const [list, total] = await queryBuilder
      .orderBy('word.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return { list, total, page: Number(page), pagesize: Number(pagesize) };
  }

  /**
   * 过滤敏感词（供聊天模块调用）
   */
  async filterSensitiveWords(text: string): Promise<{ filtered: string; blocked: boolean }> {
    const words = await this.SensitiveWordModel.find({ where: { status: 1 } });

    let filtered = text;
    let blocked = false;

    for (const word of words) {
      if (text.includes(word.word)) {
        if (word.type === 1) {
          blocked = true;
          break;
        }
        const replacement = word.replacement || '*'.repeat(word.word.length);
        filtered = filtered.split(word.word).join(replacement);
      }
    }

    return { filtered, blocked };
  }

  // ==================== 用户反馈管理 ====================

  /**
   * 提交反馈
   */
  async createFeedback(params, userPayload) {
    const { type = 0, title, content, images } = params;
    const { user_id, user_nick } = userPayload;

    await this.FeedbackModel.save({
      user_id,
      user_nick,
      type,
      title,
      content,
      images,
    });

    return { message: '反馈提交成功' };
  }

  /**
   * 获取反馈列表（管理端）
   */
  async getFeedbackList(params) {
    const { page = 1, pagesize = 10, status, type } = params;

    const queryBuilder = this.FeedbackModel.createQueryBuilder('feedback');

    if (status !== undefined) {
      queryBuilder.andWhere('feedback.status = :status', { status });
    }
    if (type !== undefined) {
      queryBuilder.andWhere('feedback.type = :type', { type });
    }

    const [list, total] = await queryBuilder
      .orderBy('feedback.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return { list, total, page: Number(page), pagesize: Number(pagesize) };
  }

  /**
   * 回复/处理反馈
   */
  async replyFeedback(params, operatorPayload) {
    const { id, status, reply } = params;
    const { user_id, user_nick } = operatorPayload;

    const feedback = await this.FeedbackModel.findOne({ where: { id } });
    if (!feedback) {
      throw new HttpException('反馈不存在', HttpStatus.NOT_FOUND);
    }

    await this.FeedbackModel.update(
      { id },
      {
        status,
        reply,
        handler_id: user_id,
        handler_nick: user_nick,
        handled_at: new Date(),
      },
    );

    return { message: '反馈处理成功' };
  }

  /**
   * 获取用户自己的反馈列表
   */
  async getMyFeedbackList(params, userPayload) {
    const { page = 1, pagesize = 10 } = params;
    const { user_id } = userPayload;

    const [list, total] = await this.FeedbackModel.findAndCount({
      where: { user_id },
      order: { id: 'DESC' },
      skip: (page - 1) * pagesize,
      take: pagesize,
    });

    return { list, total, page: Number(page), pagesize: Number(pagesize) };
  }

  // ==================== 邀请码管理 ====================

  /**
   * 生成邀请码
   */
  async createInviteCode(params, operatorPayload) {
    const { max_uses = 1, expire_at, remark } = params;
    const { user_id, user_nick } = operatorPayload;

    // 生成随机邀请码
    const code = this.generateRandomCode(8);

    await this.InviteCodeModel.save({
      code,
      creator_id: user_id,
      creator_nick: user_nick,
      max_uses,
      expire_at,
      remark,
    });

    return { message: '邀请码创建成功', code };
  }

  /**
   * 生成随机码
   */
  private generateRandomCode(length: number): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  /**
   * 获取邀请码列表
   */
  async getInviteCodeList(params) {
    const { page = 1, pagesize = 20, status } = params;

    const queryBuilder = this.InviteCodeModel.createQueryBuilder('code');

    if (status !== undefined) {
      queryBuilder.andWhere('code.status = :status', { status });
    }

    const [list, total] = await queryBuilder
      .orderBy('code.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return { list, total, page: Number(page), pagesize: Number(pagesize) };
  }

  /**
   * 禁用邀请码
   */
  async disableInviteCode(id: number) {
    await this.InviteCodeModel.update({ id }, { status: 0 });
    return { message: '邀请码已禁用' };
  }

  /**
   * 验证邀请码（供注册时调用）
   */
  async validateInviteCode(code: string): Promise<boolean> {
    const inviteCode = await this.InviteCodeModel.findOne({ where: { code, status: 1 } });

    if (!inviteCode) {
      return false;
    }

    // 检查是否过期
    if (inviteCode.expire_at && new Date() > inviteCode.expire_at) {
      return false;
    }

    // 检查使用次数
    if (inviteCode.used_count >= inviteCode.max_uses) {
      return false;
    }

    return true;
  }

  /**
   * 使用邀请码（注册成功后调用）
   */
  async useInviteCode(code: string) {
    const inviteCode = await this.InviteCodeModel.findOne({ where: { code } });
    if (inviteCode) {
      await this.InviteCodeModel.update({ id: inviteCode.id }, { used_count: inviteCode.used_count + 1 });
    }
  }

  // ==================== IP黑名单管理 ====================

  /**
   * 添加IP到黑名单
   */
  async addIpBlacklist(params, operatorPayload) {
    const { ip, reason, expire_at } = params;
    const { user_id, user_nick } = operatorPayload;

    const existing = await this.IpBlacklistModel.findOne({ where: { ip } });
    if (existing) {
      throw new HttpException('该IP已在黑名单中', HttpStatus.BAD_REQUEST);
    }

    await this.IpBlacklistModel.save({
      ip,
      reason,
      expire_at,
      operator_id: user_id,
      operator_nick: user_nick,
    });

    return { message: 'IP已添加到黑名单' };
  }

  /**
   * 从黑名单移除IP
   */
  async removeIpBlacklist(id: number) {
    await this.IpBlacklistModel.update({ id }, { status: 0 });
    return { message: 'IP已从黑名单移除' };
  }

  /**
   * 获取IP黑名单列表
   */
  async getIpBlacklistList(params) {
    const { page = 1, pagesize = 20, ip } = params;

    const queryBuilder = this.IpBlacklistModel.createQueryBuilder('blacklist');
    queryBuilder.andWhere('blacklist.status = :status', { status: 1 });

    if (ip) {
      queryBuilder.andWhere('blacklist.ip LIKE :ip', { ip: `%${ip}%` });
    }

    const [list, total] = await queryBuilder
      .orderBy('blacklist.id', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return { list, total, page: Number(page), pagesize: Number(pagesize) };
  }

  /**
   * 检查IP是否在黑名单中
   */
  async isIpBlocked(ip: string): Promise<boolean> {
    const now = new Date();

    // 精确匹配
    const exact = await this.IpBlacklistModel.findOne({
      where: { ip, status: 1 },
    });

    if (exact && (!exact.expire_at || exact.expire_at > now)) {
      return true;
    }

    // 通配符匹配（如 192.168.1.*）
    const wildcardRecords = await this.IpBlacklistModel.find({
      where: { status: 1 },
    });

    for (const record of wildcardRecords) {
      if (record.ip.includes('*')) {
        const pattern = record.ip.replace(/\./g, '\\.').replace(/\*/g, '.*');
        const regex = new RegExp(`^${pattern}$`);
        if (regex.test(ip) && (!record.expire_at || record.expire_at > now)) {
          return true;
        }
      }
    }

    return false;
  }

  // ==================== 数据导出 ====================

  /**
   * 导出数据
   */
  async exportData(params) {
    const { type, start_date, end_date } = params;

    let data = [];
    const dateFilter = {};

    if (start_date) {
      dateFilter['createdAt'] = { $gte: new Date(start_date) };
    }

    switch (type) {
      case 'users':
        const usersQuery = this.UserModel.createQueryBuilder('user').select([
          'user.id',
          'user.user_name',
          'user.user_nick',
          'user.user_email',
          'user.user_role',
          'user.user_status',
          'user.createdAt',
        ]);
        if (start_date) usersQuery.andWhere('user.createdAt >= :start', { start: new Date(start_date) });
        if (end_date) usersQuery.andWhere('user.createdAt <= :end', { end: new Date(end_date) });
        data = await usersQuery.getMany();
        break;

      case 'messages':
        const msgQuery = this.MessageModel.createQueryBuilder('msg');
        if (start_date) msgQuery.andWhere('msg.createdAt >= :start', { start: new Date(start_date) });
        if (end_date) msgQuery.andWhere('msg.createdAt <= :end', { end: new Date(end_date) });
        data = await msgQuery.orderBy('msg.id', 'DESC').take(10000).getMany();
        break;

      case 'rooms':
        data = await this.RoomModel.find();
        break;

      case 'music':
        const musicQuery = this.MusicModel.createQueryBuilder('music');
        if (start_date) musicQuery.andWhere('music.createdAt >= :start', { start: new Date(start_date) });
        if (end_date) musicQuery.andWhere('music.createdAt <= :end', { end: new Date(end_date) });
        data = await musicQuery.getMany();
        break;

      default:
        throw new HttpException('不支持的导出类型', HttpStatus.BAD_REQUEST);
    }

    return {
      type,
      count: data.length,
      data,
      exported_at: new Date(),
    };
  }

  // ==================== 定时清理任务 ====================

  /**
   * 清理过期数据（可由定时任务调用）
   */
  async cleanupExpiredData() {
    const now = new Date();

    // 清理过期公告（标记为隐藏）
    await this.AnnouncementModel.createQueryBuilder()
      .update()
      .set({ status: 0 })
      .where('expire_at < :now', { now })
      .andWhere('expire_at IS NOT NULL')
      .andWhere('status = :status', { status: 1 })
      .execute();

    // 清理过期邀请码（标记为无效）
    await this.InviteCodeModel.createQueryBuilder()
      .update()
      .set({ status: 0 })
      .where('expire_at < :now', { now })
      .andWhere('expire_at IS NOT NULL')
      .andWhere('status = :status', { status: 1 })
      .execute();

    // 清理过期IP黑名单（标记为解除）
    await this.IpBlacklistModel.createQueryBuilder()
      .update()
      .set({ status: 0 })
      .where('expire_at < :now', { now })
      .andWhere('expire_at IS NOT NULL')
      .andWhere('status = :status', { status: 1 })
      .execute();

    // 清理30天前的操作日志
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    await this.OperationLogModel.createQueryBuilder()
      .delete()
      .where('createdAt < :date', { date: thirtyDaysAgo })
      .execute();

    return { message: '过期数据清理完成' };
  }
}
