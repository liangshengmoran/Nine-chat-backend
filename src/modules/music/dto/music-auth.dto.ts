import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional, IsIn, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 手动提交 Cookie 授权 DTO
 */
export class MusicAuthCookieDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiProperty({
    description: '音乐平台',
    enum: ['kugou', 'netease'],
    example: 'kugou',
  })
  @IsNotEmpty()
  @IsIn(['kugou', 'netease'])
  source: string;

  @ApiProperty({
    description: '平台 Cookie 字符串（酷狗为 token=xxx;userid=xxx 格式，网易云为完整 Cookie）',
    example: 'token=5ef2a2ba...;userid=1189883314',
  })
  @IsNotEmpty({ message: 'Cookie不能为空' })
  @IsString()
  cookie: string;

  @ApiPropertyOptional({
    description: '音乐平台用户ID（酷狗必填，网易云可从Cookie解析）',
    example: '1189883314',
  })
  @IsOptional()
  @IsString()
  userid?: string;

  @ApiPropertyOptional({ description: '平台昵称（展示用）', example: '我的酷狗账号' })
  @IsOptional()
  @IsString()
  nickname?: string;
}

/**
 * 撤销授权 DTO
 */
export class MusicAuthRevokeDto {
  @ApiProperty({ description: '房间ID', example: 888 })
  @IsNotEmpty()
  @Type(() => Number)
  room_id: number;

  @ApiProperty({
    description: '音乐平台',
    enum: ['kugou', 'netease'],
    example: 'kugou',
  })
  @IsNotEmpty()
  @IsIn(['kugou', 'netease'])
  source: string;
}

/**
 * QR 代理请求 DTO
 */
export class MusicAuthQrDto {
  @ApiProperty({
    description: '音乐平台',
    enum: ['kugou', 'netease'],
    example: 'kugou',
  })
  @IsNotEmpty()
  @IsIn(['kugou', 'netease'])
  source: string;
}

/**
 * QR Check + 自动保存 DTO
 */
export class MusicAuthQrCheckDto {
  @ApiProperty({ description: '二维码 Key', example: 'xxx-xxx-xxx' })
  @IsNotEmpty()
  @IsString()
  key: string;

  @ApiProperty({
    description: '音乐平台',
    enum: ['kugou', 'netease'],
    example: 'kugou',
  })
  @IsNotEmpty()
  @IsIn(['kugou', 'netease'])
  source: string;

  @ApiProperty({ description: '房间ID（扫码成功时自动保存授权到此房间）', example: 888 })
  @IsNotEmpty()
  @Type(() => Number)
  room_id: number;
}
