import { Injectable, HttpException, HttpStatus, Inject, forwardRef, Logger } from '@nestjs/common';
import { Interval } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import axios from 'axios';
import { BotEntity } from './bot.entity';
import { BotManagerEntity } from './bot-manager.entity';
import { BotUpdateEntity } from './bot-update.entity';
import { BotScheduledMessageEntity } from './bot-scheduled-message.entity';
import { MessageEntity } from '../chat/message.entity';
import { RoomEntity } from '../chat/room.entity';
import {
  CreateBotDto,
  UpdateBotDto,
  BotSendMessageDto,
  BotChooseMusicDto,
  BotGetMessagesDto,
  BotEditMessageDto,
  BotDeleteMessageDto,
  BotChatActionDto,
  BotGetUpdatesDto,
  BotAnswerCallbackDto,
  BotPinMessageDto,
  BotScheduleMessageDto,
  BotSendDocumentDto,
} from './dto/bot.dto';
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
    @InjectRepository(BotUpdateEntity)
    private readonly BotUpdateModel: Repository<BotUpdateEntity>,
    @InjectRepository(BotScheduledMessageEntity)
    private readonly BotScheduledMessageModel: Repository<BotScheduledMessageEntity>,
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
    const { room_id, message_type, message_content, reply_to_message_id } = params;

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

    // Bot 扩展字段持久化
    if (params.reply_markup) {
      message.reply_markup = params.reply_markup;
    }
    if (params.mentions && params.mentions.length > 0) {
      message.mentions = params.mentions;
    }
    if (params.parse_mode) {
      message.parse_mode = params.parse_mode;
    }

    // 处理回复消息
    let quoteInfo = null;
    if (reply_to_message_id) {
      const quotedMessage = await this.MessageModel.findOne({ where: { id: reply_to_message_id } });
      if (quotedMessage) {
        message.quote_message_id = reply_to_message_id;
        message.quote_user_id = quotedMessage.user_id;
        quoteInfo = {
          quote_message_id: reply_to_message_id,
          quote_user_id: quotedMessage.user_id,
          quote_message_content: quotedMessage.message_content,
          quote_message_type: quotedMessage.message_type,
          quote_message_status: quotedMessage.message_status,
        };
      }
    }

    const savedMessage = await this.MessageModel.save(message);

    // 构造Bot用户信息
    const botUserInfo = {
      id: -bot.id,
      user_nick: bot.bot_name,
      user_username: bot.bot_username,
      user_avatar: bot.bot_avatar || '/images/default-bot-avatar.png',
      user_role: 'bot',
      is_bot: true,
      bot_id: bot.id,
    };

    // 广播消息到房间
    const messageData: any = {
      id: savedMessage.id,
      user_id: -bot.id,
      room_id,
      message_type,
      message_content: finalContent,
      message_status: 1,
      user_info: botUserInfo,
      createdAt: savedMessage.createdAt,
    };
    if (quoteInfo) {
      messageData.quote_info = quoteInfo;
    }
    if (params.reply_markup) {
      messageData.reply_markup = params.reply_markup;
    }
    if (params.mentions && params.mentions.length > 0) {
      messageData.mentions = params.mentions;
    }
    if (params.parse_mode) {
      messageData.parse_mode = params.parse_mode;
    }

    this.chatGateway.broadcastBotMessage(room_id, messageData);

    // 向没有 webhook 的 Bot 队列写入事件 (用于 getUpdates)
    // 此处不写入, 因为 sendMessage 是 Bot 自己发的

    return { message_id: savedMessage.id, success: true };
  }

  /**
   * Bot 编辑消息
   */
  async editMessage(bot: BotEntity, params: BotEditMessageDto): Promise<any> {
    const { message_id, message_content } = params;

    const message = await this.MessageModel.findOne({ where: { id: message_id } });
    if (!message) {
      throw new HttpException('消息不存在', HttpStatus.NOT_FOUND);
    }

    // 校验: Bot 只能编辑自己发的消息
    if (message.user_id !== -bot.id) {
      throw new HttpException('Bot只能编辑自己发送的消息', HttpStatus.FORBIDDEN);
    }

    // 更新消息内容
    const newContent = typeof message_content === 'string' ? message_content : JSON.stringify(message_content);
    await this.MessageModel.update(message_id, { message_content: newContent });

    // 广播消息编辑事件
    this.chatGateway.broadcastMessageUpdate(message.room_id, {
      id: message_id,
      message_content: message_content,
      edited: true,
      edited_at: new Date(),
    });

    return { success: true, message_id };
  }

  /**
   * Bot 撤回/删除消息
   */
  async deleteMessage(bot: BotEntity, params: BotDeleteMessageDto): Promise<any> {
    const { message_id } = params;

    const message = await this.MessageModel.findOne({ where: { id: message_id } });
    if (!message) {
      throw new HttpException('消息不存在', HttpStatus.NOT_FOUND);
    }

    // 校验: Bot 只能撤回自己发的消息
    if (message.user_id !== -bot.id) {
      throw new HttpException('Bot只能撤回自己发送的消息', HttpStatus.FORBIDDEN);
    }

    // 设为撤回状态
    await this.MessageModel.update(message_id, { message_status: -1 });

    // 广播消息撤回事件
    this.chatGateway.broadcastMessageDelete(message.room_id, {
      id: message_id,
      user_nick: bot.bot_name,
    });

    return { success: true, message_id };
  }

  /**
   * Bot 发送聊天动作 (如: 正在输入)
   */
  async sendChatAction(bot: BotEntity, params: BotChatActionDto): Promise<any> {
    const { room_id, action } = params;

    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    const botInfo = {
      id: -bot.id,
      user_nick: bot.bot_name,
      user_avatar: bot.bot_avatar || '/images/default-bot-avatar.png',
      is_bot: true,
    };

    this.chatGateway.broadcastBotTyping(room_id, botInfo, action);

    return { success: true };
  }

  /**
   * 注册 Bot 命令
   */
  async registerCommands(
    botId: number,
    ownerId: number,
    commands: { command: string; description: string }[],
  ): Promise<any> {
    const bot = await this.BotModel.findOne({ where: { id: botId, owner_id: ownerId } });
    if (!bot) {
      throw new HttpException('Bot不存在或无权限', HttpStatus.NOT_FOUND);
    }

    // 校验命令格式: 只允许小写字母、数字、下划线
    for (const cmd of commands) {
      if (!/^[a-z0-9_]+$/.test(cmd.command)) {
        throw new HttpException(
          `命令 "${cmd.command}" 格式错误: 只能包含小写字母、数字、下划线`,
          HttpStatus.BAD_REQUEST,
        );
      }
      if (cmd.command.length > 32) {
        throw new HttpException(`命令 "${cmd.command}" 过长: 最多32个字符`, HttpStatus.BAD_REQUEST);
      }
    }

    bot.commands = commands;
    await this.BotModel.save(bot);

    return { success: true, commands };
  }

  /**
   * 获取 Bot 命令列表
   */
  async getCommands(botId: number): Promise<any> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot) {
      throw new HttpException('Bot不存在', HttpStatus.NOT_FOUND);
    }
    return bot.commands || [];
  }

  // ==================== Phase 2: getUpdates / Inline Keyboard / Pin ====================

  /**
   * 写入 Bot 更新队列 (供 getUpdates 消费)
   * 仅对 没有配置 Webhook 的 Bot 写入
   */
  async queueUpdate(botId: number, updateType: string, payload: any): Promise<void> {
    const bot = await this.BotModel.findOne({ where: { id: botId } });
    if (!bot || bot.webhook_url) return; // 有 Webhook 就不写队列

    const update = new BotUpdateEntity();
    update.bot_id = botId;
    update.update_type = updateType;
    update.payload = payload;
    update.consumed = false;
    await this.BotUpdateModel.save(update);
  }

  /**
   * Bot getUpdates 长轮询
   */
  async getUpdates(bot: BotEntity, params: BotGetUpdatesDto): Promise<any> {
    const { offset = 0, limit = 20, timeout = 0 } = params;

    // 如果配置了 Webhook, 不允许使用 getUpdates
    if (bot.webhook_url) {
      throw new HttpException('已配置Webhook，不能同时使用getUpdates。请先移除Webhook配置', HttpStatus.CONFLICT);
    }

    const fetchUpdates = async () => {
      const qb = this.BotUpdateModel.createQueryBuilder('u')
        .where('u.bot_id = :botId', { botId: bot.id })
        .andWhere('u.consumed = false');
      if (offset > 0) {
        qb.andWhere('u.id > :offset', { offset });
      }
      qb.orderBy('u.id', 'ASC').take(limit);
      return qb.getMany();
    };

    let updates = await fetchUpdates();

    // 长轮询: 如果没有更新且 timeout > 0, 等待
    if (updates.length === 0 && timeout > 0) {
      const pollInterval = 1000; // 1秒轮询一次
      const endTime = Date.now() + timeout * 1000;
      while (Date.now() < endTime) {
        await new Promise((r) => setTimeout(r, pollInterval));
        updates = await fetchUpdates();
        if (updates.length > 0) break;
      }
    }

    // 标记为已消费
    if (updates.length > 0) {
      const ids = updates.map((u) => u.id);
      await this.BotUpdateModel.update(ids, { consumed: true });
    }

    return {
      ok: true,
      result: updates.map((u) => ({
        update_id: u.id,
        update_type: u.update_type,
        ...u.payload,
        created_at: u.createdAt,
      })),
    };
  }

  /**
   * 回应 Callback Query (用户点击 Inline Keyboard 按钮后)
   */
  async answerCallbackQuery(bot: BotEntity, params: BotAnswerCallbackDto): Promise<any> {
    const { callback_query_id, text, show_alert } = params;

    // 广播 callback 回应给前端
    // callback_query_id 格式: cb_<room_id>_<timestamp>
    const parts = callback_query_id.split('_');
    if (parts.length >= 3) {
      const room_id = Number(parts[1]);
      this.chatGateway.broadcastBotMessage(room_id, {
        type: 'callback_answer',
        callback_query_id,
        text: text || '',
        show_alert: show_alert || false,
        bot_id: bot.id,
        bot_name: bot.bot_name,
      });
    }

    return { success: true };
  }

  /**
   * Bot 置顶消息
   */
  async pinMessage(bot: BotEntity, params: BotPinMessageDto): Promise<any> {
    const { room_id, message_id } = params;

    // 检查权限
    if (bot.permissions && !bot.permissions.can_pin_message) {
      throw new HttpException('Bot没有置顶消息的权限', HttpStatus.FORBIDDEN);
    }
    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    const message = await this.MessageModel.findOne({ where: { id: message_id } });
    if (!message) {
      throw new HttpException('消息不存在', HttpStatus.NOT_FOUND);
    }

    // 更新房间的置顶消息
    await this.RoomModel.update({ room_id }, { pinned_message_id: message_id } as any);

    // 广播置顶事件
    this.chatGateway.broadcastBotMessage(room_id, {
      type: 'pin_message',
      message_id,
      room_id,
      pinned_by: bot.bot_name,
    });

    return { success: true, message_id };
  }

  /**
   * Bot 取消置顶消息
   */
  async unpinMessage(bot: BotEntity, room_id: number): Promise<any> {
    if (bot.permissions && !bot.permissions.can_pin_message) {
      throw new HttpException('Bot没有置顶消息的权限', HttpStatus.FORBIDDEN);
    }
    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    await this.RoomModel.update({ room_id }, { pinned_message_id: null } as any);

    this.chatGateway.broadcastBotMessage(room_id, {
      type: 'unpin_message',
      room_id,
      unpinned_by: bot.bot_name,
    });

    return { success: true };
  }

  // ==================== Phase 3: Markdown / File / Schedule ====================

  /**
   * 获取房间在线成员列表
   */
  async getRoomMembers(bot: BotEntity, room_id: number): Promise<any> {
    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }
    const roomMap = this.chatGateway.getRoomListMap();
    const roomData = roomMap[room_id];
    if (!roomData || !roomData.on_line_user_list) {
      return { room_id, online_count: 0, members: [] };
    }
    const members = roomData.on_line_user_list.map((u: any) => ({
      user_id: u.id,
      user_nick: u.user_nick,
      user_avatar: u.user_avatar,
      user_role: u.user_role,
    }));
    return { room_id, online_count: members.length, members };
  }

  /**
   * Bot 发送文件消息
   */
  async sendDocument(bot: BotEntity, params: BotSendDocumentDto): Promise<any> {
    const { room_id, file_url, file_name, caption } = params;

    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    const room = await this.RoomModel.findOne({ where: { room_id } });
    if (!room) {
      throw new HttpException('房间不存在', HttpStatus.NOT_FOUND);
    }

    // 保存文件消息
    const content = JSON.stringify({
      file_url,
      file_name: file_name || file_url.split('/').pop(),
      caption: caption || '',
    });
    const message = new MessageEntity();
    message.user_id = -bot.id;
    message.room_id = room_id;
    message.message_type = 'file';
    message.message_content = content;
    message.message_status = 1;
    const savedMessage = await this.MessageModel.save(message);

    const botUserInfo = {
      id: -bot.id,
      user_nick: bot.bot_name,
      user_username: bot.bot_username,
      user_avatar: bot.bot_avatar || '/images/default-bot-avatar.png',
      user_role: 'bot',
      is_bot: true,
      bot_id: bot.id,
    };

    const messageData = {
      id: savedMessage.id,
      user_id: -bot.id,
      room_id,
      message_type: 'file',
      message_content: { file_url, file_name: file_name || file_url.split('/').pop(), caption: caption || '' },
      message_status: 1,
      user_info: botUserInfo,
      createdAt: savedMessage.createdAt,
    };

    this.chatGateway.broadcastBotMessage(room_id, messageData);
    return { message_id: savedMessage.id, success: true };
  }

  /**
   * Bot 创建定时消息
   */
  async scheduleMessage(bot: BotEntity, params: BotScheduleMessageDto): Promise<any> {
    const {
      room_id,
      message_type,
      message_content,
      send_at,
      repeat = 'once',
      parse_mode,
      timezone = '+08:00',
    } = params;

    if (!this.checkRoomAccess(bot, room_id)) {
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }

    // 处理时区: 如果 send_at 没有时区后缀, 追加用户指定的 timezone
    let timeStr = send_at;
    if (!/[Zz]/.test(timeStr) && !/[+-]\d{2}:\d{2}$/.test(timeStr)) {
      timeStr = timeStr + timezone;
    }
    const sendDate = new Date(timeStr);
    if (sendDate <= new Date()) {
      throw new HttpException('发送时间必须在将来', HttpStatus.BAD_REQUEST);
    }

    const scheduled = new BotScheduledMessageEntity();
    scheduled.bot_id = bot.id;
    scheduled.room_id = room_id;
    scheduled.message_type = message_type;
    scheduled.message_content = typeof message_content === 'string' ? message_content : JSON.stringify(message_content);
    scheduled.repeat = repeat;
    scheduled.parse_mode = parse_mode;
    scheduled.next_send_at = sendDate;
    scheduled.status = 1;
    scheduled.sent_count = 0;

    const saved = await this.BotScheduledMessageModel.save(scheduled);
    return { success: true, scheduled_id: saved.id, next_send_at: saved.next_send_at };
  }

  /**
   * Bot 取消定时消息
   */
  async cancelScheduledMessage(bot: BotEntity, scheduledId: number): Promise<any> {
    const scheduled = await this.BotScheduledMessageModel.findOne({ where: { id: scheduledId, bot_id: bot.id } });
    if (!scheduled) {
      throw new HttpException('定时消息不存在', HttpStatus.NOT_FOUND);
    }
    scheduled.status = 0;
    await this.BotScheduledMessageModel.save(scheduled);
    return { success: true };
  }

  /**
   * 获取 Bot 的定时消息列表
   */
  async getScheduledMessages(bot: BotEntity): Promise<any> {
    const list = await this.BotScheduledMessageModel.find({
      where: { bot_id: bot.id, status: 1 },
      order: { next_send_at: 'ASC' },
    });
    return list;
  }

  private readonly logger = new Logger('BotScheduler');

  /**
   * 执行到期的定时消息 (每30秒检查一次)
   */
  @Interval(30000)
  async executeScheduledMessages(): Promise<void> {
    const now = new Date();
    this.logger.log(`[定时任务] 检查到期消息... 当前时间: ${now.toISOString()}`);
    const dueMessages = await this.BotScheduledMessageModel.createQueryBuilder('s')
      .where('s.status = 1')
      .andWhere('s.next_send_at <= :now', { now })
      .getMany();
    this.logger.log(`[定时任务] 找到 ${dueMessages.length} 条到期消息`);

    for (const scheduled of dueMessages) {
      try {
        const bot = await this.BotModel.findOne({ where: { id: scheduled.bot_id, status: 1 } });
        if (!bot) {
          scheduled.status = 0;
          await this.BotScheduledMessageModel.save(scheduled);
          continue;
        }

        // 发送消息
        await this.sendMessage(bot, {
          room_id: scheduled.room_id,
          message_type: scheduled.message_type,
          message_content: scheduled.message_content,
          parse_mode: scheduled.parse_mode,
        });

        scheduled.sent_count += 1;

        // 更新下次发送时间或标记完成
        if (scheduled.repeat === 'daily') {
          scheduled.next_send_at = new Date(scheduled.next_send_at.getTime() + 24 * 60 * 60 * 1000);
        } else if (scheduled.repeat === 'weekly') {
          scheduled.next_send_at = new Date(scheduled.next_send_at.getTime() + 7 * 24 * 60 * 60 * 1000);
        } else {
          scheduled.status = 2; // 单次任务完成
        }

        await this.BotScheduledMessageModel.save(scheduled);
      } catch (e) {
        // 单条失败不影响其他
      }
    }
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
