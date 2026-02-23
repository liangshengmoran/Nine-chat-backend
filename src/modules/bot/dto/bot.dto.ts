import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsBoolean,
  IsUrl,
  MaxLength,
  Min,
  Max,
  IsArray,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

/**
 * 创建Bot DTO
 */
export class CreateBotDto {
  @ApiProperty({ description: 'Bot名称 (显示名)', example: '音乐小助手' })
  @IsNotEmpty({ message: 'Bot名称不能为空' })
  @IsString()
  @MaxLength(50)
  bot_name: string;

  @ApiProperty({
    description: 'Bot用户名 (唯一标识，必须以_bot结尾)',
    example: 'music_bot',
  })
  @IsNotEmpty({ message: 'Bot用户名不能为空' })
  @IsString()
  @MinLength(5, { message: 'Bot用户名至少5个字符' })
  @MaxLength(32, { message: 'Bot用户名最多32个字符' })
  @Matches(/^[a-z][a-z0-9_]*_bot$/, {
    message: 'Bot用户名格式错误: 只能包含小写字母、数字、下划线，且必须以_bot结尾 (例: music_bot)',
  })
  bot_username: string;

  @ApiPropertyOptional({ description: 'Bot头像URL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bot_avatar?: string;

  @ApiPropertyOptional({ description: 'Bot描述' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bot_description?: string;

  @ApiPropertyOptional({ description: '允许接入的房间ID列表', type: [Number] })
  @IsOptional()
  @IsArray()
  allowed_rooms?: number[];

  @ApiPropertyOptional({ description: '每分钟请求限制', default: 60 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  rate_limit?: number;

  @ApiPropertyOptional({ description: '点歌冷却时间(秒)', default: 8 })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(300)
  music_cooldown?: number;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  webhook_url?: string;
}

/**
 * 更新Bot DTO
 */
export class UpdateBotDto {
  @ApiPropertyOptional({ description: 'Bot名称' })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  bot_name?: string;

  @ApiPropertyOptional({ description: 'Bot头像URL' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  bot_avatar?: string;

  @ApiPropertyOptional({ description: 'Bot描述' })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  bot_description?: string;

  @ApiPropertyOptional({ description: '允许接入的房间ID列表', type: [Number] })
  @IsOptional()
  @IsArray()
  allowed_rooms?: number[];

  @ApiPropertyOptional({ description: '每分钟请求限制' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  rate_limit?: number;

  @ApiPropertyOptional({ description: '点歌冷却时间(秒)' })
  @IsOptional()
  @IsNumber()
  @Min(-1)
  @Max(300)
  music_cooldown?: number;

  @ApiPropertyOptional({ description: 'Webhook URL' })
  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  webhook_url?: string;

  @ApiPropertyOptional({ description: 'Bot状态: 1-启用, 0-禁用' })
  @IsOptional()
  @IsNumber()
  status?: number;
}

/**
 * Bot发送消息 DTO
 */
export class BotSendMessageDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @IsNumber()
  room_id: number;

  @ApiProperty({ description: '消息类型', example: 'text', enum: ['text', 'img'] })
  @IsNotEmpty({ message: '消息类型不能为空' })
  @IsString()
  message_type: string;

  @ApiProperty({ description: '消息内容', example: 'Hello from Bot!' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  message_content: any;

  @ApiPropertyOptional({ description: '回复的消息ID', example: 123 })
  @IsOptional()
  @IsNumber()
  reply_to_message_id?: number;

  @ApiPropertyOptional({
    description: '内联键盘 (消息按钮)',
    example: {
      inline_keyboard: [
        [
          { text: '👍 赞同', callback_data: 'vote_yes' },
          { text: '👎 反对', callback_data: 'vote_no' },
        ],
        [{ text: '🔗 查看详情', url: 'https://example.com' }],
      ],
    },
  })
  @IsOptional()
  reply_markup?: {
    inline_keyboard: { text: string; callback_data?: string; url?: string }[][];
  };

  @ApiPropertyOptional({ description: '@提及的用户ID列表', example: [1, 2, 3], type: [Number] })
  @IsOptional()
  @IsArray()
  mentions?: number[];

  @ApiPropertyOptional({ description: '消息解析模式', example: 'markdown', enum: ['text', 'markdown', 'html'] })
  @IsOptional()
  @IsString()
  parse_mode?: string;
}

/**
 * Bot点歌 DTO
 */
export class BotChooseMusicDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @IsNumber()
  room_id: number;

  @ApiProperty({ description: '歌曲ID (酷狗hash/网易云id)' })
  @IsNotEmpty({ message: '歌曲ID不能为空' })
  @IsString()
  music_mid: string;

  @ApiPropertyOptional({ description: '音源', default: 'kugou', enum: ['kugou', 'netease'] })
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * 获取消息 DTO
 */
export class BotGetMessagesDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  @IsNumber()
  room_id: number;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  pagesize?: number;
}

/**
 * Bot编辑消息 DTO
 */
export class BotEditMessageDto {
  @ApiProperty({ description: '要编辑的消息ID', example: 123 })
  @IsNotEmpty({ message: '消息ID不能为空' })
  @IsNumber()
  message_id: number;

  @ApiProperty({ description: '新的消息内容', example: '修改后的内容' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  message_content: any;
}

/**
 * Bot删除/撤回消息 DTO
 */
export class BotDeleteMessageDto {
  @ApiProperty({ description: '要删除的消息ID', example: 123 })
  @IsNotEmpty({ message: '消息ID不能为空' })
  @IsNumber()
  message_id: number;
}

/**
 * Bot发送聊天动作 DTO
 */
export class BotChatActionDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @IsNumber()
  room_id: number;

  @ApiProperty({ description: '动作类型', example: 'typing', enum: ['typing'] })
  @IsNotEmpty({ message: '动作类型不能为空' })
  @IsString()
  action: string;
}

/**
 * Bot注册命令 DTO
 */
export class BotRegisterCommandsDto {
  @ApiProperty({
    description: '命令列表',
    example: [
      { command: 'help', description: '显示帮助信息' },
      { command: 'music', description: '随机点歌' },
    ],
  })
  @IsNotEmpty({ message: '命令列表不能为空' })
  @IsArray()
  commands: { command: string; description: string }[];
}

// ==================== Phase 2 DTOs ====================

/**
 * Bot getUpdates 长轮询 DTO
 */
export class BotGetUpdatesDto {
  @ApiPropertyOptional({ description: '获取 offset 之后的更新 (排除已确认的)', example: 0 })
  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  offset?: number;

  @ApiPropertyOptional({ description: '返回的最大更新数量', default: 20, example: 20 })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number;

  @ApiPropertyOptional({ description: '长轮询超时时间(秒), 0表示立即返回', default: 0, example: 30 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(60)
  @Type(() => Number)
  timeout?: number;
}

/**
 * Bot 回应 Callback Query DTO
 */
export class BotAnswerCallbackDto {
  @ApiProperty({ description: 'Callback Query ID', example: 'cb_123456' })
  @IsNotEmpty({ message: 'callback_query_id 不能为空' })
  @IsString()
  callback_query_id: string;

  @ApiPropertyOptional({ description: '显示提示文本', example: '你选择了赞同！' })
  @IsOptional()
  @IsString()
  text?: string;

  @ApiPropertyOptional({ description: '是否显示为弹窗 (否则为顶部提示)', default: false })
  @IsOptional()
  @IsBoolean()
  show_alert?: boolean;
}

/**
 * Bot 置顶消息 DTO
 */
export class BotPinMessageDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @IsNumber()
  room_id: number;

  @ApiProperty({ description: '要置顶的消息ID', example: 123 })
  @IsNotEmpty({ message: '消息ID不能为空' })
  @IsNumber()
  message_id: number;
}

// ==================== Phase 3 DTOs ====================

/**
 * Bot 定时消息 DTO
 */
export class BotScheduleMessageDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @IsNumber()
  room_id: number;

  @ApiProperty({ description: '消息类型', example: 'text', enum: ['text', 'img'] })
  @IsNotEmpty({ message: '消息类型不能为空' })
  @IsString()
  message_type: string;

  @ApiProperty({ description: '消息内容', example: '早上好！每日提醒' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  message_content: any;

  @ApiProperty({ description: '发送时间 (ISO 8601 格式，如 2026-02-11T08:00:00)', example: '2026-02-11T08:00:00' })
  @IsNotEmpty({ message: '发送时间不能为空' })
  @IsString()
  send_at: string;

  @ApiPropertyOptional({ description: '时区偏移 (默认北京时间 +08:00)', example: '+08:00', default: '+08:00' })
  @IsOptional()
  @IsString()
  timezone?: string;

  @ApiPropertyOptional({ description: '重复模式', example: 'daily', enum: ['once', 'daily', 'weekly'] })
  @IsOptional()
  @IsString()
  repeat?: string;

  @ApiPropertyOptional({ description: '消息解析模式', enum: ['text', 'markdown', 'html'] })
  @IsOptional()
  @IsString()
  parse_mode?: string;
}

/**
 * Bot 发送文件 DTO
 */
export class BotSendDocumentDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @IsNumber()
  room_id: number;

  @ApiProperty({ description: '文件URL', example: 'https://example.com/report.pdf' })
  @IsNotEmpty({ message: '文件URL不能为空' })
  @IsString()
  file_url: string;

  @ApiPropertyOptional({ description: '文件名', example: 'report.pdf' })
  @IsOptional()
  @IsString()
  file_name?: string;

  @ApiPropertyOptional({ description: '文件说明', example: '今日报告' })
  @IsOptional()
  @IsString()
  caption?: string;
}
