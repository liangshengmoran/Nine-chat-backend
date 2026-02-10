import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateRoomDto {
  @ApiProperty({ example: 10001, description: '房间ID' })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiPropertyOptional({ description: '房间名称' })
  @IsOptional()
  @IsString()
  room_name?: string;

  @ApiPropertyOptional({ description: '房间Logo URL' })
  @IsOptional()
  @IsString()
  room_logo?: string;

  @ApiPropertyOptional({ description: '房间公告' })
  @IsOptional()
  @IsString()
  room_notice?: string;

  @ApiPropertyOptional({ description: '是否需要密码: 1-是, 0-否' })
  @IsOptional()
  @Type(() => Number)
  room_need_password?: number;

  @ApiPropertyOptional({ description: '房间密码' })
  @IsOptional()
  @IsString()
  room_password?: string;
}

export class UpdateRoomInfoDto {
  @ApiProperty({ example: 10001, description: '房间ID' })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiPropertyOptional({ description: '房间背景图URL' })
  @IsOptional()
  @IsString()
  room_bg_img?: string;

  @ApiPropertyOptional({ description: '房间名称' })
  @IsOptional()
  @IsString()
  room_name?: string;

  @ApiPropertyOptional({ description: '房间公告' })
  @IsOptional()
  @IsString()
  room_notice?: string;

  @ApiPropertyOptional({ description: '是否需要密码: 1-是, 0-否' })
  @IsOptional()
  @Type(() => Number)
  room_need_password?: number;

  @ApiPropertyOptional({ description: '房间密码' })
  @IsOptional()
  @IsString()
  room_password?: string;

  @ApiPropertyOptional({ description: '房间Logo URL' })
  @IsOptional()
  @IsString()
  room_logo?: string;
}

export class ModeratorListDto {
  @ApiProperty({ example: 888, description: '房间ID' })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;
}
