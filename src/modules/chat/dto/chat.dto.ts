import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 创建聊天房间 DTO
 */
export class CreateRoomDto {
  @ApiProperty({
    description: '房间名称（最多20字符）',
    example: '我的音乐聊天室',
    maxLength: 20,
  })
  @IsNotEmpty({ message: '房间名称不能为空' })
  @IsString()
  @MaxLength(20)
  room_name: string;

  @ApiPropertyOptional({
    description: '房间密码（设置后需要输入密码才能进入房间），留空则为无密码房间',
    example: '123456',
  })
  @IsOptional()
  @IsString()
  room_password?: string;

  @ApiPropertyOptional({
    description: '房间公告（显示在房间顶部，支持换行符）',
    example: '欢迎来到我的聊天室！请遵守规则~',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  room_notice?: string;
}

/**
 * 更新房间信息 DTO
 */
export class UpdateRoomInfoDto {
  @ApiProperty({ description: '目标房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiPropertyOptional({
    description: '新的房间名称',
    example: '更新后的聊天室名',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  room_name?: string;

  @ApiPropertyOptional({
    description: '新的房间公告（支持换行符）',
    example: '更新后的公告内容',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  room_notice?: string;

  @ApiPropertyOptional({
    description: '新的房间背景图 URL',
    example: '/uploads/room_bg/bg1.jpg',
  })
  @IsOptional()
  @IsString()
  room_bg?: string;

  @ApiPropertyOptional({
    description: '新的房间密码（留空或 null 表示取消密码）',
    example: 'newPassword',
  })
  @IsOptional()
  @IsString()
  room_password?: string;
}

/**
 * 房管列表查询 DTO
 */
export class ModeratorListDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;
}
