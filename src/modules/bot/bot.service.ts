import { Injectable, HttpException, HttpStatus, Inject, forwardRef } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import axios from 'axios';
import { BotEntity } from './bot.entity';
import { BotManagerEntity } from './bot-manager.entity';
import { MessageEntity } from '../chat/message.entity';
import { RoomEntity } from '../chat/room.entity';
import { CreateBotDto, UpdateBotDto, BotSendMessageDto, BotChooseMusicDto, BotGetMessagesDto } from './dto/bot.dto';
import { WsChatGateway } from '../chat/chat.getaway';
import { AdminService } from '../admin/admin.service';

@Injectable()
export class BotService {
  // 速率限制缓存: { botId: { count: number, resetTime: number } }
  private rateLimitCache: Map<number, { count: number; resetTime: number }> = new Map();

  // Bot点歌冷却缓存: { botId: { room_id: timestamp } }
  private musicCooldownCache: Map<number, Map<number, number>> = new Map();

  constructor(
    @InjectRepository(BotEntity)
    private readonly BotModel: Repository<BotEntity>,
    @InjectRepository(BotManagerEntity)
    private readonly BotManagerModel: Repository<BotManagerEntity>,
    @InjectRepository(MessageEntity)
    private readonly MessageModel: Repository<MessageEntity>,
    @InjectRepository(RoomEntity)
    private readonly RoomModel: Repository<RoomEntity>,
    @Inject(forwardRef(() => WsChatGateway))
    private readonly chatGateway: WsChatGateway,
    @Inject(forwardRef(() => AdminService))
    private readonly adminService: AdminService,
  ) {}

  /**
   * 生成 Bot Token
   * 格式: bot_<时间戳36进制>_<32字符随机>
   */
  generateBotToken(): string {
    const prefix = 'bot';
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(16).toString('hex');
    return `${prefix}_${timestamp}_${random}`;
  }

  /**
   * 生成 Webhook Secret
   */
  generateWebhookSecret(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  /**
   * 创建 Bot
   */
  async createBot(ownerId: number, params: CreateBotDto): Promise<BotEntity> {
    // 检查用户名是否已存在
    const existingBot = await this.BotModel.findOne({ where: { bot_username: params.bot_username } });
    if (existingBot) {
      throw new HttpException(`用户名 @${params.bot_username} 已被使用`, HttpStatus.CONFLICT);
    }

    const bot = new BotEntity();
    bot.bot_name = params.bot_name;
    bot.bot_username = params.bot_username;
    bot.bot_token = this.generateBotToken();
    bot.owner_id = ownerId;
    bot.bot_avatar = params.bot_avatar || null;
    bot.bot_description = params.bot_description || null;
    bot.allowed_rooms = params.allowed_rooms?.join(',') || null;
    bot.rate_limit = params.rate_limit || 60;
    bot.music_cooldown = params.music_cooldown ?? 8;

    // 审批机制: 默认为待审批状态
    bot.approval_status = 'pending';

    // 默认权限配置
    bot.permissions = {
      can_send_message: true,
      can_send_image: false,
      can_choose_music: true,
      can_read_history: true,
      can_mention_users: false,
      can_pin_message: false,
      max_message_length: 2000,
    };

    if (params.webhook_url) {
      bot.webhook_url = params.webhook_url;
      bot.webhook_secret = this.generateWebhookSecret();
    }

    return this.BotModel.save(bot);
  }

  /**
   * 验证 Bot Token
   */
  async validateToken(token: string): Promise<BotEntity | null> {
    if (!token || !token.startsWith('bot_')) {
      return null;
    }

    const bot = await this.BotModel.findOne({ where: { bot_token: token } });
    if (!bot) {
      return null;
    }

    // 更新最后活跃时间和请求次数
    await this.BotModel.update(bot.id, {
      last_active_at: new Date(),
      total_requests: () => 'total_requests + 1',
      today_requests: () => 'today_requests + 1',
    });

    return bot;
  }

  /**
   * 检查速率限制
   */
  checkRateLimit(bot: BotEntity): boolean {
    const now = Date.now();
    const cached = this.rateLimitCache.get(bot.id);

    if (!cached || now > cached.resetTime) {
      // 重置计数器
      this.rateLimitCache.set(bot.id, { count: 1, resetTime: now + 60000 });
      return true;
    }

    if (cached.count >= bot.rate_limit) {
      return false;
    }

    cached.count++;
    return true;
  }

  /**
   * 检查 Bot 是否有权访问房间
   */
  checkRoomAccess(bot: BotEntity, roomId: number): boolean {
    // allowed_rooms 是 simple-array 类型，存储为逗号分隔的字符串
    const rooms = bot.allowed_rooms;

    if (!rooms || rooms === '' || rooms.length === 0) {
      return true; // 未配置白名单,允许所有房间
    }

    // TypeORM simple-array 会自动转为数组，但也可能是字符串
    const roomsStr = String(rooms);
    const allowedRooms = roomsStr
      .split(',')
      .map(Number)
      .filter((n) => !isNaN(n));

    return allowedRooms.length === 0 || allowedRooms.includes(roomId);
  }

  /**
   * 检查点歌冷却
   */
  checkMusicCooldown(bot: BotEntity, roomId: number): { allowed: boolean; remainingSeconds?: number } {
    if (bot.music_cooldown === -1) {
      return { allowed: false }; // 禁止点歌
    }

    if (bot.music_cooldown === 0) {
      return { allowed: true }; // 无冷却
    }

    const now = Date.now();
    const botCooldowns = this.musicCooldownCache.get(bot.id);

    if (!botCooldowns) {
      this.musicCooldownCache.set(bot.id, new Map([[roomId, now]]));
      return { allowed: true };
    }

    const lastChoose = botCooldowns.get(roomId);
    if (!lastChoose) {
      botCooldowns.set(roomId, now);
      return { allowed: true };
    }

    const elapsed = (now - lastChoose) / 1000;
    if (elapsed >= bot.music_cooldown) {
      botCooldowns.set(roomId, now);
      return { allowed: true };
    }

    return { allowed: false, remainingSeconds: Math.ceil(bot.music_cooldown - elapsed) };
  }

  /**
   * Bot 发送消息
   */
  async sendMessage(bot: BotEntity, params: BotSendMessageDto): Promise<any> {
    const { room_id, message_type, message_content } = params;

    // 检查房间访问权限
    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    // 检查房间是否存在
    const room = await this.RoomModel.findOne({ where: { room_id } });
    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 敏感词过滤 (仅文本消息)
    let finalContent = message_content;
    if (message_type === 'text' && typeof message_content === 'string') {
      const filterResult = await this.adminService.filterSensitiveWords(message_content);
      if (filterResult.blocked) {
        throw new HttpException('消息包含违禁词汇', HttpStatus.BAD_REQUEST);
      }
      finalContent = filterResult.filtered;
    }

    // 保存消息到数据库
    const message = new MessageEntity();
    message.user_id = -bot.id; // 负数ID标识Bot
    message.room_id = room_id;
    message.message_type = message_type;
    message.message_content = typeof finalContent === 'string' ? finalContent : JSON.stringify(finalContent);
    message.message_status = 1;

    const savedMessage = await this.MessageModel.save(message);

    // 构造Bot用户信息
    const botUserInfo = {
      id: -bot.id,
      user_nick: bot.bot_name,
      user_username: bot.bot_username, // @username 格式
      user_avatar: bot.bot_avatar || '/images/default-bot-avatar.png',
      user_role: 'bot',
      is_bot: true,
      bot_id: bot.id,
    };

    // 广播消息到房间
    const messageData = {
      id: savedMessage.id,
      user_id: -bot.id,
      room_id,
      message_type,
      message_content: finalContent,
      message_status: 1,
      user_info: botUserInfo,
      createdAt: savedMessage.createdAt,
    };

    this.chatGateway.broadcastBotMessage(room_id, messageData);

    return { message_id: savedMessage.id, success: true };
  }

  /**
   * Bot 点歌
   */
  async chooseMusic(bot: BotEntity, params: BotChooseMusicDto): Promise<any> {
    const { room_id, music_mid, source = 'kugou' } = params;

    // 检查房间访问权限
    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    // 检查点歌冷却
    const cooldownCheck = this.checkMusicCooldown(bot, room_id);
    if (!cooldownCheck.allowed) {
      throw new HttpException(`点歌冷却中，请${cooldownCheck.remainingSeconds}秒后再试`, HttpStatus.TOO_MANY_REQUESTS);
    }

    // 调用 ChatGateway 的点歌逻辑
    const botUserInfo = {
      id: -bot.id,
      user_nick: bot.bot_name,
      user_avatar: bot.bot_avatar,
      is_bot: true,
    };

    await this.chatGateway.handleBotChooseMusic(room_id, music_mid, source, botUserInfo);

    return { success: true };
  }

  /**
   * 获取消息历史
   */
  async getMessages(bot: BotEntity, params: BotGetMessagesDto): Promise<any> {
    const { room_id, page = 1, pagesize = 20 } = params;

    // 检查房间访问权限
    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    const [messages, total] = await this.MessageModel.findAndCount({
      where: { room_id, message_status: 1 },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pagesize,
      take: pagesize,
    });

    return { messages, total, page, pagesize };
  }

  /**
   * 获取 Bot 信息
   */
  async getBotInfo(bot: BotEntity): Promise<any> {
    return {
      id: bot.id,
      bot_name: bot.bot_name,
      bot_username: bot.bot_username,
      bot_avatar: bot.bot_avatar,
      bot_description: bot.bot_description,
      status: bot.status,
      rate_limit: bot.rate_limit,
      music_cooldown: bot.music_cooldown,
      allowed_rooms: bot.allowed_rooms?.split(',').map(Number) || [],
      webhook_configured: !!bot.webhook_url,
      last_active_at: bot.last_active_at,
      total_requests: bot.total_requests,
    };
  }

  /**
   * 列出用户的 Bot
   */
  async listBots(ownerId: number): Promise<BotEntity[]> {
    return this.BotModel.find({ where: { owner_id: ownerId } });
  }

  /**
   * 更新 Bot
   */
  async updateBot(botId: number, ownerId: number, params: UpdateBotDto): Promise<BotEntity> {
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    if (params.bot_name) bot.bot_name = params.bot_name;
    if (params.bot_avatar !== undefined) bot.bot_avatar = params.bot_avatar;
    if (params.bot_description !== undefined) bot.bot_description = params.bot_description;
    if (params.allowed_rooms) bot.allowed_rooms = params.allowed_rooms.join(',');
    if (params.rate_limit !== undefined) bot.rate_limit = params.rate_limit;
    if (params.music_cooldown !== undefined) bot.music_cooldown = params.music_cooldown;
    if (params.webhook_url !== undefined) {
      bot.webhook_url = params.webhook_url;
      if (params.webhook_url && !bot.webhook_secret) {
        bot.webhook_secret = this.generateWebhookSecret();
      }
    }
    if (params.status !== undefined) bot.status = params.status;

    return this.BotModel.save(bot);
  }

  /**
   * 重新生成 Token
   */
  async regenerateToken(botId: number, ownerId: number): Promise<{ token: string }> {
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    bot.bot_token = this.generateBotToken();
    await this.BotModel.save(bot);

    return { token: bot.bot_token };
  }

  /**
   * 删除 Bot
   */
  async deleteBot(botId: number, ownerId: number): Promise<void> {
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    await this.BotModel.softDelete(botId);
  }

  /**
   * Webhook 推送消息
   */
  async pushWebhook(bot: BotEntity, event: string, data: any): Promise<void> {
    if (!bot.webhook_url) return;

    try {
      const payload = {
        event,
        data,
        timestamp: Date.now(),
        bot_id: bot.id,
      };

      const signature = crypto
        .createHmac('sha256', bot.webhook_secret || '')
        .update(JSON.stringify(payload))
        .digest('hex');

      await axios.post(bot.webhook_url, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-Bot-Signature': signature,
        },
        timeout: 5000,
      });

      // 更新 webhook 状态为正常
      if (bot.webhook_status !== 1) {
        await this.BotModel.update(bot.id, { webhook_status: 1 });
      }
    } catch (error) {
      // 更新 webhook 状态为失败
      await this.BotModel.update(bot.id, { webhook_status: -1 });
    }
  }

  /**
   * 获取房间中配置了 Webhook 的 Bot 列表
   */
  async getWebhookBots(roomId: number): Promise<BotEntity[]> {
    const bots = await this.BotModel.find({
      where: { status: 1 },
    });

    return bots.filter((bot) => {
      if (!bot.webhook_url) return false;
      if (!bot.allowed_rooms) return true;
      return bot.allowed_rooms.split(',').map(Number).includes(roomId);
    });
  }

  // ==================== Admin 管理方法 ====================

  /**
   * [Admin] 获取所有 Bot 列表
   */
  async adminListBots(params: { page?: number; pagesize?: number; status?: number }): Promise<any> {
    const { page = 1, pagesize = 20, status } = params;

    const query = this.BotModel.createQueryBuilder('bot');

    if (status !== undefined) {
      query.where('bot.status = :status', { status });
    }

    const [bots, total] = await query
      .orderBy('bot.createdAt', 'DESC')
      .skip((page - 1) * pagesize)
      .take(pagesize)
      .getManyAndCount();

    return { bots, total, page, pagesize };
  }

  /**
   * [Admin] 禁用 Bot
   */
  async adminDisableBot(botId: number): Promise<void> {
    await this.BotModel.update(botId, { status: 0 });
  }

  /**
   * [Admin] 启用 Bot
   */
  async adminEnableBot(botId: number): Promise<void> {
    await this.BotModel.update(botId, { status: 1 });
  }

  /**
   * [Admin] 删除 Bot
   */
  async adminDeleteBot(botId: number): Promise<void> {
    await this.BotModel.softDelete(botId);
  }

  /**
   * [Admin] 更新 Bot 配置
   */
  async adminUpdateBot(botId: number, params: UpdateBotDto): Promise<BotEntity> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      throw new HttpException('Bot不存在', HttpStatus.NOT_FOUND);
    }

    if (params.rate_limit !== undefined) bot.rate_limit = params.rate_limit;
    if (params.music_cooldown !== undefined) bot.music_cooldown = params.music_cooldown;
    if (params.status !== undefined) bot.status = params.status;

    return this.BotModel.save(bot);
  }

  /**
   * 重置今日请求计数 (定时任务调用)
   */
  async resetDailyRequests(): Promise<void> {
    await this.BotModel.update({}, { today_requests: 0 });
  }

  // ==================== Admin 审批相关方法 ====================

  /**
   * [Admin] 获取待审批的 Bot 列表
   */
  async adminGetPendingBots(page = 1, pageSize = 20): Promise<{ list: BotEntity[]; total: number }> {
    const [list, total] = await this.BotModel.findAndCount({
      where: { approval_status: 'pending' },
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'ASC' },
    });
    return { list, total };
  }

  /**
   * [Admin] 获取所有 Bot 列表 (支持筛选)
   */
  async adminGetAllBots(
    page = 1,
    pageSize = 20,
    filters?: { approval_status?: string; status?: number },
  ): Promise<{ list: BotEntity[]; total: number }> {
    const where: any = {};
    if (filters?.approval_status) where.approval_status = filters.approval_status;
    if (filters?.status !== undefined) where.status = filters.status;

    const [list, total] = await this.BotModel.findAndCount({
      where,
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });
    return { list, total };
  }

  /**
   * [Admin] 审批通过 Bot
   */
  async adminApproveBot(botId: number, adminId: number): Promise<BotEntity> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      throw new HttpException('Bot不存在', HttpStatus.NOT_FOUND);
    }

    if (bot.approval_status === 'approved') {
      throw new HttpException('Bot已经是审批通过状态', HttpStatus.BAD_REQUEST);
    }

    bot.approval_status = 'approved';
    bot.approved_by = adminId;
    bot.approved_at = new Date();
    bot.rejection_reason = null;

    return this.BotModel.save(bot);
  }

  /**
   * [Admin] 拒绝 Bot
   */
  async adminRejectBot(botId: number, adminId: number, reason: string): Promise<BotEntity> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      throw new HttpException('Bot不存在', HttpStatus.NOT_FOUND);
    }

    bot.approval_status = 'rejected';
    bot.approved_by = adminId;
    bot.approved_at = new Date();
    bot.rejection_reason = reason;

    return this.BotModel.save(bot);
  }

  /**
   * [Admin] 暂停 Bot
   */
  async adminSuspendBot(botId: number, adminId: number, reason: string): Promise<BotEntity> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      throw new HttpException('Bot不存在', HttpStatus.NOT_FOUND);
    }

    bot.approval_status = 'suspended';
    bot.approved_by = adminId;
    bot.approved_at = new Date();
    bot.rejection_reason = reason;

    return this.BotModel.save(bot);
  }

  /**
   * [Admin] 更新 Bot 权限
   */
  async adminUpdateBotPermissions(botId: number, permissions: Partial<BotEntity['permissions']>): Promise<BotEntity> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      throw new HttpException('Bot不存在', HttpStatus.NOT_FOUND);
    }

    bot.permissions = {
      ...bot.permissions,
      ...permissions,
    };

    return this.BotModel.save(bot);
  }

  // ==================== 共享管理权相关方法 ====================

  /**
   * 添加 Bot 管理员
   */
  async addBotManager(
    botId: number,
    ownerId: number,
    targetUserId: number,
    role: 'admin' | 'operator' = 'operator',
    note?: string,
  ): Promise<BotManagerEntity> {
    // 验证 Bot 归属权
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    // 检查是否已存在
    const existing = await this.BotManagerModel.findOne({
      where: { bot_id: botId, user_id: targetUserId },
    });
    if (existing) {
      throw new HttpException('该用户已是管理员', HttpStatus.CONFLICT);
    }

    const manager = new BotManagerEntity();
    manager.bot_id = botId;
    manager.user_id = targetUserId;
    manager.role = role;
    manager.granted_by = ownerId;
    manager.note = note;

    return this.BotManagerModel.save(manager);
  }

  /**
   * 移除 Bot 管理员
   */
  async removeBotManager(botId: number, ownerId: number, targetUserId: number): Promise<void> {
    // 验证 Bot 归属权
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    await this.BotManagerModel.delete({ bot_id: botId, user_id: targetUserId });
  }

  /**
   * 获取 Bot 管理员列表
   */
  async getBotManagers(botId: number, ownerId: number): Promise<BotManagerEntity[]> {
    // 验证 Bot 归属权
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    return this.BotManagerModel.find({ where: { bot_id: botId } });
  }

  /**
   * 检查用户是否有权限操作 Bot (Owner 或 Manager)
   */
  async checkUserHasAccess(botId: number, userId: number): Promise<{ hasAccess: boolean; role: string }> {
    // 检查是否是 Owner
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      return { hasAccess: false, role: null };
    }

    if (bot.owner_id === userId) {
      return { hasAccess: true, role: 'owner' };
    }

    // 检查是否是 Manager
    const manager = await this.BotManagerModel.findOne({ where: { bot_id: botId, user_id: userId } });
    if (manager) {
      return { hasAccess: true, role: manager.role };
    }

    return { hasAccess: false, role: null };
  }
}
