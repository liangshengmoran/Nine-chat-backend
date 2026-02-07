import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { BotEntity } from '../modules/bot/bot.entity';

/**
 * Bot Token 认证守卫
 * 用于保护 Bot API 端点
 */
@Injectable()
export class BotGuard implements CanActivate {
  // 速率限制缓存
  private rateLimitCache: Map<number, { count: number; resetTime: number }> = new Map();

  constructor(
    @InjectRepository(BotEntity)
    private readonly BotModel: Repository<BotEntity>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    // 支持两种认证方式:
    // 1. X-Bot-Token: bot_xxx (Swagger 使用)
    // 2. Authorization: Bot bot_xxx (cURL/外部客户端使用)
    let token: string = null;

    const xBotToken = request.headers['x-bot-token'];
    const authHeader = request.headers.authorization;

    if (xBotToken) {
      // Swagger 方式: X-Bot-Token 头
      token = xBotToken.trim();
    } else if (authHeader && authHeader.startsWith('Bot ')) {
      // Authorization: Bot xxx 方式
      token = authHeader.substring(4).trim();
    }

    if (!token) {
      throw new UnauthorizedException('Missing Bot token. Use X-Bot-Token header or Authorization: Bot <token>');
    }

    // 验证 Token 格式
    if (!token.startsWith('bot_')) {
      throw new UnauthorizedException('Invalid Bot token format. Token must start with bot_');
    }

    // 查询 Bot
    const bot = await this.BotModel.findOne({ where: { bot_token: token } });
    if (!bot) {
      throw new UnauthorizedException('Bot not found');
    }

    // 检查 Bot 状态
    if (bot.status !== 1) {
      throw new UnauthorizedException('Bot is disabled');
    }

    // 检查审批状态
    if (bot.approval_status !== 'approved') {
      const statusMessages = {
        pending: 'Bot is pending approval',
        rejected: 'Bot has been rejected',
        suspended: 'Bot has been suspended',
      };
      throw new HttpException(statusMessages[bot.approval_status] || 'Bot is not approved', HttpStatus.FORBIDDEN);
    }

    // 检查速率限制
    if (!this.checkRateLimit(bot)) {
      throw new HttpException(
        `Rate limit exceeded. Maximum ${bot.rate_limit} requests per minute.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 更新最后活跃时间和请求计数
    this.updateBotActivity(bot.id);

    // 将 Bot 信息注入到请求对象
    request.bot = bot;

    return true;
  }

  /**
   * 检查速率限制
   */
  private checkRateLimit(bot: BotEntity): boolean {
    const now = Date.now();
    const cached = this.rateLimitCache.get(bot.id);

    if (!cached || now > cached.resetTime) {
      // 重置计数器 (每分钟重置)
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
   * 异步更新 Bot 活跃状态
   */
  private async updateBotActivity(botId: number): Promise<void> {
    try {
      await this.BotModel.update(botId, {
        last_active_at: new Date(),
      });
      // 增加请求计数通过原始SQL避免并发问题
      await this.BotModel.increment({ id: botId }, 'total_requests', 1);
      await this.BotModel.increment({ id: botId }, 'today_requests', 1);
    } catch (error) {
      // 静默处理更新失败,不影响请求
      console.error('Failed to update bot activity:', error.message);
    }
  }
}
