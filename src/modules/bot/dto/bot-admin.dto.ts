import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * Bot审核拒绝 DTO
 */
export class BotRejectDto {
  @ApiPropertyOptional({
    description: '拒绝原因（会通知Bot所有者）',
    example: 'Bot功能描述不完整，请补充后重新提交',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Bot暂停 DTO
 */
export class BotSuspendDto {
  @ApiPropertyOptional({
    description: '暂停原因（如违规行为说明）',
    example: '发送大量垃圾消息，临时暂停',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}

/**
 * Bot权限配置 DTO
 */
export class BotPermissionsDto {
  @ApiPropertyOptional({ description: '是否允许发送文字消息', example: true })
  @IsOptional()
  @IsBoolean()
  can_send_message?: boolean;

  @ApiPropertyOptional({ description: '是否允许发送图片消息', example: false })
  @IsOptional()
  @IsBoolean()
  can_send_image?: boolean;

  @ApiPropertyOptional({ description: '是否允许在房间点歌', example: true })
  @IsOptional()
  @IsBoolean()
  can_choose_music?: boolean;

  @ApiPropertyOptional({ description: '是否允许读取房间历史消息', example: true })
  @IsOptional()
  @IsBoolean()
  can_read_history?: boolean;

  @ApiPropertyOptional({ description: '是否允许在消息中 @提及 用户', example: false })
  @IsOptional()
  @IsBoolean()
  can_mention_users?: boolean;

  @ApiPropertyOptional({ description: '是否允许置顶消息', example: false })
  @IsOptional()
  @IsBoolean()
  can_pin_message?: boolean;

  @ApiPropertyOptional({
    description: '单条消息最大字符长度',
    example: 2000,
    default: 2000,
  })
  @IsOptional()
  @IsNumber()
  max_message_length?: number;
}

/**
 * 添加Bot管理员 DTO
 */
export class AddBotManagerDto {
  @ApiProperty({ description: '要添加为Bot管理员的用户ID', example: 2 })
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiPropertyOptional({
    description: '角色类型：admin=管理员（可修改Bot设置），operator=操作员（仅可查看和使用Bot）',
    default: 'operator',
    example: 'operator',
    enum: ['admin', 'operator'],
  })
  @IsOptional()
  @IsIn(['admin', 'operator'])
  role?: 'admin' | 'operator';

  @ApiPropertyOptional({
    description: '备注说明（方便识别管理员职责）',
    example: '负责日常运营',
  })
  @IsOptional()
  @IsString()
  note?: string;
}
