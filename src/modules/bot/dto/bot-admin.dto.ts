import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber, IsIn, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';

export class BotRejectDto {
  @ApiPropertyOptional({ description: '拒绝原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BotSuspendDto {
  @ApiPropertyOptional({ description: '暂停原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BotPermissionsDto {
  @ApiPropertyOptional({ description: '允许发送消息' })
  @IsOptional()
  @IsBoolean()
  can_send_message?: boolean;

  @ApiPropertyOptional({ description: '允许发送图片' })
  @IsOptional()
  @IsBoolean()
  can_send_image?: boolean;

  @ApiPropertyOptional({ description: '允许点歌' })
  @IsOptional()
  @IsBoolean()
  can_choose_music?: boolean;

  @ApiPropertyOptional({ description: '允许读取历史消息' })
  @IsOptional()
  @IsBoolean()
  can_read_history?: boolean;

  @ApiPropertyOptional({ description: '允许@用户' })
  @IsOptional()
  @IsBoolean()
  can_mention_users?: boolean;

  @ApiPropertyOptional({ description: '允许置顶消息' })
  @IsOptional()
  @IsBoolean()
  can_pin_message?: boolean;

  @ApiPropertyOptional({ description: '最大消息长度' })
  @IsOptional()
  @IsNumber()
  max_message_length?: number;
}

export class AddBotManagerDto {
  @ApiProperty({ description: '要添加的用户ID' })
  @IsNotEmpty({ message: '用户ID不能为空' })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiPropertyOptional({
    description: '角色: admin(管理员) / operator(操作员)',
    default: 'operator',
    enum: ['admin', 'operator'],
  })
  @IsOptional()
  @IsIn(['admin', 'operator'])
  role?: 'admin' | 'operator';

  @ApiPropertyOptional({ description: '备注' })
  @IsOptional()
  @IsString()
  note?: string;
}
