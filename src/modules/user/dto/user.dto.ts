import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class UserQueryDto {
  @ApiProperty({ description: '用户ID', required: true })
  @IsNumber()
  @Type(() => Number)
  id: number;
}

export class UserUpdateDto {
  @ApiPropertyOptional({ description: '用户名' })
  @IsOptional()
  @IsString()
  user_name?: string;

  @ApiPropertyOptional({ description: '用户昵称' })
  @IsOptional()
  @IsString()
  user_nick?: string;

  @ApiPropertyOptional({ description: '用户性别' })
  @IsOptional()
  user_sex?: any;

  @ApiPropertyOptional({ description: '个人签名' })
  @IsOptional()
  @IsString()
  user_sign?: string;

  @ApiPropertyOptional({ description: '用户头像URL' })
  @IsOptional()
  @IsString()
  user_avatar?: string;

  @ApiPropertyOptional({ description: '房间背景图URL' })
  @IsOptional()
  @IsString()
  user_room_bg?: string;
}
