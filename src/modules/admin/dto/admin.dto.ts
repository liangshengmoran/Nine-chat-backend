import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UserQueryDto {
  @ApiProperty({ required: false, description: '搜索关键词（用户名/昵称）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '用户角色', enum: ['super', 'admin', 'user'] })
  @IsOptional()
  @IsIn(['super', 'admin', 'user'])
  role?: string;

  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class UpdateUserRoleDto {
  @ApiProperty({ description: '用户ID' })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({
    description:
      '角色操作：admin(设为管理员), user(设为普通用户/移除管理员), owner(设为房主), moderator(设为房管), remove_moderator(移除房管)',
    enum: ['admin', 'user', 'owner', 'moderator', 'remove_moderator'],
  })
  @IsIn(['admin', 'user', 'owner', 'moderator', 'remove_moderator'])
  role: string;

  @ApiProperty({
    required: false,
    description: '房间ID（当 role 为 owner, moderator, remove_moderator 时必填）',
  })
  @IsOptional()
  @Type(() => Number)
  room_id?: number;
}

export class BanUserDto {
  @ApiProperty({ description: '用户ID' })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({ required: false, description: '封禁原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RoomQueryDto {
  @ApiProperty({ required: false, description: '搜索关键词（房间名/ID）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class MusicQueryDto {
  @ApiProperty({ required: false, description: '搜索关键词（歌名/歌手）' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '音源', enum: ['kugou', 'netease'] })
  @IsOptional()
  @IsIn(['kugou', 'netease'])
  source?: string;

  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class DeleteMusicDto {
  @ApiProperty({ description: '歌曲ID' })
  @IsNumber()
  @Type(() => Number)
  music_id: number;
}

export class MessageQueryDto {
  @ApiProperty({ required: false, description: '房间ID' })
  @IsOptional()
  @Type(() => Number)
  room_id?: number;

  @ApiProperty({ required: false, description: '用户ID' })
  @IsOptional()
  @Type(() => Number)
  user_id?: number;

  @ApiProperty({ required: false, description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class DeleteMessageDto {
  @ApiProperty({ description: '消息ID' })
  @IsNumber()
  @Type(() => Number)
  message_id: number;
}

export class UpdateRoomDto {
  @ApiProperty({ description: '房间ID' })
  @IsNumber()
  @Type(() => Number)
  room_id: number;

  @ApiProperty({ required: false, description: '房间名称' })
  @IsOptional()
  @IsString()
  room_name?: string;

  @ApiProperty({ required: false, description: '房间公告' })
  @IsOptional()
  @IsString()
  room_notice?: string;

  @ApiProperty({ required: false, description: '是否需要密码: 1-是, 0-否' })
  @IsOptional()
  @Type(() => Number)
  room_need_password?: number;
}

// ==================== 系统公告 DTO ====================

export class CreateAnnouncementDto {
  @ApiProperty({ description: '公告标题' })
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString()
  title: string;

  @ApiProperty({ description: '公告内容' })
  @IsNotEmpty({ message: '内容不能为空' })
  @IsString()
  content: string;

  @ApiProperty({ required: false, description: '公告类型: 0-普通, 1-重要, 2-紧急', default: 0 })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({ required: false, description: '过期时间' })
  @IsOptional()
  expire_at?: Date;
}

export class UpdateAnnouncementDto {
  @ApiProperty({ description: '公告ID' })
  @IsNotEmpty()
  @Type(() => Number)
  id: number;

  @ApiProperty({ required: false, description: '公告标题' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false, description: '公告内容' })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({ required: false, description: '公告状态: 1-显示, 0-隐藏' })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiProperty({ required: false, description: '公告类型: 0-普通, 1-重要, 2-紧急' })
  @IsOptional()
  @Type(() => Number)
  type?: number;
}

export class AnnouncementQueryDto {
  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '状态筛选' })
  @IsOptional()
  @Type(() => Number)
  status?: number;
}

// ==================== 操作日志 DTO ====================

export class OperationLogQueryDto {
  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '操作者ID' })
  @IsOptional()
  @Type(() => Number)
  operator_id?: number;

  @ApiProperty({ required: false, description: '操作类型' })
  @IsOptional()
  @IsString()
  action_type?: string;

  @ApiProperty({ required: false, description: '目标类型' })
  @IsOptional()
  @IsString()
  target_type?: string;
}

// ==================== 批量操作 DTO ====================

export class BatchBanUsersDto {
  @ApiProperty({ description: '用户ID列表', type: [Number] })
  @IsNotEmpty()
  user_ids: number[];

  @ApiProperty({ required: false, description: '封禁原因' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BatchDeleteMessagesDto {
  @ApiProperty({ description: '消息ID列表', type: [Number] })
  @IsNotEmpty()
  message_ids: number[];
}

// ==================== 敏感词 DTO ====================

export class CreateSensitiveWordDto {
  @ApiProperty({ description: '敏感词' })
  @IsNotEmpty({ message: '敏感词不能为空' })
  @IsString()
  word: string;

  @ApiProperty({ required: false, description: '类型: 0-替换为*, 1-直接拒绝发送', default: 0 })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({ required: false, description: '替换文本' })
  @IsOptional()
  @IsString()
  replacement?: string;
}

export class SensitiveWordQueryDto {
  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '搜索关键词' })
  @IsOptional()
  @IsString()
  keyword?: string;
}

// ==================== 用户反馈 DTO ====================

export class CreateFeedbackDto {
  @ApiProperty({ description: '反馈类型: 0-建议, 1-Bug反馈, 2-举报, 3-其他' })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({ description: '反馈标题' })
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString()
  title: string;

  @ApiProperty({ description: '反馈内容' })
  @IsNotEmpty({ message: '内容不能为空' })
  @IsString()
  content: string;

  @ApiProperty({ required: false, description: '附件图片URL' })
  @IsOptional()
  @IsString()
  images?: string;
}

export class ReplyFeedbackDto {
  @ApiProperty({ description: '反馈ID' })
  @IsNotEmpty()
  @Type(() => Number)
  id: number;

  @ApiProperty({ description: '处理状态: 0-待处理, 1-处理中, 2-已解决, 3-已忽略' })
  @IsNotEmpty()
  @Type(() => Number)
  status: number;

  @ApiProperty({ required: false, description: '管理员回复' })
  @IsOptional()
  @IsString()
  reply?: string;
}

export class FeedbackQueryDto {
  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 10 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '处理状态' })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiProperty({ required: false, description: '反馈类型' })
  @IsOptional()
  @Type(() => Number)
  type?: number;
}

// ==================== 邀请码 DTO ====================

export class CreateInviteCodeDto {
  @ApiProperty({ required: false, description: '可使用次数', default: 1 })
  @IsOptional()
  @Type(() => Number)
  max_uses?: number;

  @ApiProperty({ required: false, description: '过期时间' })
  @IsOptional()
  expire_at?: Date;

  @ApiProperty({ required: false, description: '备注' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class InviteCodeQueryDto {
  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '状态: 1-有效, 0-无效' })
  @IsOptional()
  @Type(() => Number)
  status?: number;
}

// ==================== IP黑名单 DTO ====================

export class AddIpBlacklistDto {
  @ApiProperty({ description: 'IP地址' })
  @IsNotEmpty({ message: 'IP地址不能为空' })
  @IsString()
  ip: string;

  @ApiProperty({ required: false, description: '封禁原因' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({ required: false, description: '解封时间（null表示永久封禁）' })
  @IsOptional()
  expire_at?: Date;
}

export class IpBlacklistQueryDto {
  @ApiProperty({ required: false, description: '页码', default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '搜索IP' })
  @IsOptional()
  @IsString()
  ip?: string;
}

// ==================== 数据导出 DTO ====================

export class ExportDataDto {
  @ApiProperty({ description: '导出类型: users, messages, rooms, music' })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({ required: false, description: '开始日期' })
  @IsOptional()
  start_date?: Date;

  @ApiProperty({ required: false, description: '结束日期' })
  @IsOptional()
  end_date?: Date;
}
