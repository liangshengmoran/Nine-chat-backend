import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsNumber,
  IsUrl,
  MaxLength,
  Min,
  Max,
  IsArray,
  Matches,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiProperty({ description: '消息内容' })
  @IsNotEmpty({ message: '消息内容不能为空' })
  message_content: any;
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
  @IsNumber()
  room_id: number;

  @ApiPropertyOptional({ description: '页码', default: 1 })
  @IsOptional()
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ description: '每页数量', default: 20 })
  @IsOptional()
  @IsNumber()
  pagesize?: number;
}
