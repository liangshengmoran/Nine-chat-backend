import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, IsNumber, IsIn, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class UserQueryDto {
  @ApiProperty({
    required: false,
    description: '搜索关键词，匹配用户名或昵称（模糊搜索）',
    example: '测试',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    required: false,
    description: '按用户角色筛选',
    enum: ['super', 'admin', 'user'],
    example: 'user',
  })
  @IsOptional()
  @IsIn(['super', 'admin', 'user'])
  role?: string;

  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class UpdateUserRoleDto {
  @ApiProperty({ description: '目标用户ID', example: 5 })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({
    description:
      '角色操作类型：admin(设为管理员), user(设为普通用户/移除管理员), owner(设为房主), moderator(设为房管), remove_moderator(移除房管)',
    enum: ['admin', 'user', 'owner', 'moderator', 'remove_moderator'],
    example: 'moderator',
  })
  @IsIn(['admin', 'user', 'owner', 'moderator', 'remove_moderator'])
  role: string;

  @ApiProperty({
    required: false,
    description: '房间ID（当 role 为 owner / moderator / remove_moderator 时必填）',
    example: 888,
  })
  @IsOptional()
  @Type(() => Number)
  room_id?: number;
}

export class BanUserDto {
  @ApiProperty({ description: '目标用户ID', example: 5 })
  @IsNumber()
  @Type(() => Number)
  user_id: number;

  @ApiProperty({ required: false, description: '封禁原因', example: '违规发言' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class RoomQueryDto {
  @ApiProperty({
    required: false,
    description: '搜索关键词，匹配房间名称或房间ID',
    example: '官方',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class MusicQueryDto {
  @ApiProperty({
    required: false,
    description: '搜索关键词，匹配歌名或歌手名称（模糊搜索）',
    example: '周杰伦',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({
    required: false,
    description: '按音源筛选',
    enum: ['kugou', 'netease'],
    example: 'kugou',
  })
  @IsOptional()
  @IsIn(['kugou', 'netease'])
  source?: string;

  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class DeleteMusicDto {
  @ApiProperty({ description: '要删除的歌曲ID（数据库主键）', example: 1 })
  @IsNumber()
  @Type(() => Number)
  music_id: number;
}

export class MessageQueryDto {
  @ApiProperty({ required: false, description: '按房间ID筛选', example: 888 })
  @IsOptional()
  @Type(() => Number)
  room_id?: number;

  @ApiProperty({ required: false, description: '按发送者用户ID筛选', example: 1 })
  @IsOptional()
  @Type(() => Number)
  user_id?: number;

  @ApiProperty({
    required: false,
    description: '搜索关键词，匹配消息内容（模糊搜索）',
    example: 'Hello',
  })
  @IsOptional()
  @IsString()
  keyword?: string;

  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

export class DeleteMessageDto {
  @ApiProperty({ description: '要删除的消息ID', example: 123 })
  @IsNumber()
  @Type(() => Number)
  message_id: number;
}

export class UpdateRoomDto {
  @ApiProperty({ description: '目标房间ID', example: 888 })
  @IsNumber()
  @Type(() => Number)
  room_id: number;

  @ApiProperty({ required: false, description: '新的房间名称（不超过20字符）', example: '新聊天室' })
  @IsOptional()
  @IsString()
  room_name?: string;

  @ApiProperty({
    required: false,
    description: '房间公告内容（支持换行符）',
    example: '欢迎来到聊天室，请遵守规则！',
  })
  @IsOptional()
  @IsString()
  room_notice?: string;

  @ApiProperty({
    required: false,
    description: '是否需要密码进入：1=需要密码，0=无需密码',
    example: 0,
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  room_need_password?: number;
}

// ==================== 系统公告 DTO ====================

export class CreateAnnouncementDto {
  @ApiProperty({ description: '公告标题', example: '系统维护通知' })
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '公告正文内容（支持 Markdown 格式）',
    example: '系统将于今晚 22:00 - 23:00 进行维护，届时服务将暂停，请提前保存数据。',
  })
  @IsNotEmpty({ message: '内容不能为空' })
  @IsString()
  content: string;

  @ApiProperty({
    required: false,
    description: '公告优先级类型：0=普通（灰色），1=重要（橙色），2=紧急（红色）',
    default: 0,
    example: 1,
    enum: [0, 1, 2],
  })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({
    required: false,
    description: '过期时间（ISO 8601 格式），过期后自动隐藏，不填则永不过期',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  expire_at?: Date;
}

export class UpdateAnnouncementDto {
  @ApiProperty({ description: '公告ID', example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  id: number;

  @ApiProperty({ required: false, description: '新的公告标题', example: '系统维护通知（更新）' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({
    required: false,
    description: '新的公告内容（支持 Markdown）',
    example: '维护时间调整为 23:00 - 00:00',
  })
  @IsOptional()
  @IsString()
  content?: string;

  @ApiProperty({
    required: false,
    description: '公告显示状态：1=显示，0=隐藏',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiProperty({
    required: false,
    description: '公告优先级类型：0=普通，1=重要，2=紧急',
    example: 0,
    enum: [0, 1, 2],
  })
  @IsOptional()
  @Type(() => Number)
  type?: number;
}

export class AnnouncementQueryDto {
  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({
    required: false,
    description: '按显示状态筛选：1=显示，0=隐藏',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  status?: number;
}

// ==================== 操作日志 DTO ====================

export class OperationLogQueryDto {
  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({ required: false, description: '按操作者用户ID筛选', example: 1 })
  @IsOptional()
  @Type(() => Number)
  operator_id?: number;

  @ApiProperty({
    required: false,
    description: '按操作类型筛选（如 ban_user / delete_message / update_role）',
    example: 'ban_user',
  })
  @IsOptional()
  @IsString()
  action_type?: string;

  @ApiProperty({
    required: false,
    description: '按目标类型筛选（如 user / room / message / music）',
    example: 'user',
  })
  @IsOptional()
  @IsString()
  target_type?: string;
}

// ==================== 批量操作 DTO ====================

export class BatchBanUsersDto {
  @ApiProperty({
    description: '要封禁的用户ID数组',
    type: [Number],
    example: [3, 5, 8],
  })
  @IsNotEmpty()
  user_ids: number[];

  @ApiProperty({ required: false, description: '封禁原因', example: '批量清理违规账号' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class BatchDeleteMessagesDto {
  @ApiProperty({
    description: '要删除的消息ID数组',
    type: [Number],
    example: [101, 102, 103],
  })
  @IsNotEmpty()
  message_ids: number[];
}

// ==================== 敏感词 DTO ====================

export class CreateSensitiveWordDto {
  @ApiProperty({ description: '敏感词内容', example: '违规词汇' })
  @IsNotEmpty({ message: '敏感词不能为空' })
  @IsString()
  word: string;

  @ApiProperty({
    required: false,
    description: '触发行为：0=替换为指定文本（默认替换为*），1=直接拒绝发送消息',
    default: 0,
    example: 0,
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({
    required: false,
    description: '替换文本（仅 type=0 时生效），不填则默认替换为等长度的 ***',
    example: '***',
  })
  @IsOptional()
  @IsString()
  replacement?: string;
}

export class SensitiveWordQueryDto {
  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({
    required: false,
    description: '搜索关键词，匹配敏感词内容（模糊搜索）',
    example: '违规',
  })
  @IsOptional()
  @IsString()
  keyword?: string;
}

// ==================== 用户反馈 DTO ====================

export class CreateFeedbackDto {
  @ApiProperty({
    required: false,
    description: '反馈类型：0=建议，1=Bug反馈，2=举报，3=其他',
    default: 0,
    example: 1,
    enum: [0, 1, 2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  type?: number;

  @ApiProperty({ description: '反馈标题', example: '搜索功能建议' })
  @IsNotEmpty({ message: '标题不能为空' })
  @IsString()
  title: string;

  @ApiProperty({
    description: '反馈详细内容',
    example: '希望在歌曲搜索中支持按专辑筛选，目前只能按歌名和歌手搜索。',
  })
  @IsNotEmpty({ message: '内容不能为空' })
  @IsString()
  content: string;

  @ApiProperty({
    required: false,
    description: '附件截图URL（多张图片用逗号分隔）',
    example: '/uploads/feedback/screenshot1.png',
  })
  @IsOptional()
  @IsString()
  images?: string;
}

export class ReplyFeedbackDto {
  @ApiProperty({ description: '反馈ID', example: 1 })
  @IsNotEmpty()
  @Type(() => Number)
  id: number;

  @ApiProperty({
    description: '处理状态：0=待处理，1=处理中，2=已解决，3=已忽略',
    example: 2,
    enum: [0, 1, 2, 3],
  })
  @IsNotEmpty()
  @Type(() => Number)
  status: number;

  @ApiProperty({
    required: false,
    description: '管理员回复内容',
    example: '感谢反馈，该功能已列入开发计划。',
  })
  @IsOptional()
  @IsString()
  reply?: string;
}

export class FeedbackQueryDto {
  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 10, example: 10 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({
    required: false,
    description: '按处理状态筛选：0=待处理，1=处理中，2=已解决，3=已忽略',
    example: 0,
    enum: [0, 1, 2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  status?: number;

  @ApiProperty({
    required: false,
    description: '按反馈类型筛选：0=建议，1=Bug反馈，2=举报，3=其他',
    example: 1,
    enum: [0, 1, 2, 3],
  })
  @IsOptional()
  @Type(() => Number)
  type?: number;
}

// ==================== 邀请码 DTO ====================

export class CreateInviteCodeDto {
  @ApiProperty({
    required: false,
    description: '该邀请码最多可使用次数，默认为1次',
    default: 1,
    example: 10,
  })
  @IsOptional()
  @Type(() => Number)
  max_uses?: number;

  @ApiProperty({
    required: false,
    description: '过期时间（ISO 8601 格式），不填则永不过期',
    example: '2026-03-01T00:00:00.000Z',
  })
  @IsOptional()
  expire_at?: Date;

  @ApiProperty({ required: false, description: '备注说明（方便管理识别用途）', example: '活动专用邀请码' })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class InviteCodeQueryDto {
  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({
    required: false,
    description: '按邀请码状态筛选：1=有效，0=已禁用',
    example: 1,
    enum: [0, 1],
  })
  @IsOptional()
  @Type(() => Number)
  status?: number;
}

// ==================== IP黑名单 DTO ====================

export class AddIpBlacklistDto {
  @ApiProperty({ description: 'IP地址（支持 IPv4 和 IPv6）', example: '192.168.1.100' })
  @IsNotEmpty({ message: 'IP地址不能为空' })
  @IsString()
  ip: string;

  @ApiProperty({ required: false, description: '封禁原因', example: '恶意攻击' })
  @IsOptional()
  @IsString()
  reason?: string;

  @ApiProperty({
    required: false,
    description: '解封时间（ISO 8601 格式），不填表示永久封禁',
    example: '2026-06-01T00:00:00.000Z',
  })
  @IsOptional()
  expire_at?: Date;
}

export class IpBlacklistQueryDto {
  @ApiProperty({ required: false, description: '页码（从 1 开始）', default: 1, example: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ required: false, description: '每页数量', default: 20, example: 20 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiProperty({
    required: false,
    description: '按IP地址搜索（模糊匹配）',
    example: '192.168',
  })
  @IsOptional()
  @IsString()
  ip?: string;
}

// ==================== 数据导出 DTO ====================

export class ExportDataDto {
  @ApiProperty({
    description: '导出数据类型',
    enum: ['users', 'messages', 'rooms', 'music'],
    example: 'users',
  })
  @IsNotEmpty()
  @IsString()
  type: string;

  @ApiProperty({
    required: false,
    description: '数据起始日期（ISO 8601 格式），用于按时间范围筛选',
    example: '2026-01-01T00:00:00.000Z',
  })
  @IsOptional()
  start_date?: Date;

  @ApiProperty({
    required: false,
    description: '数据截止日期（ISO 8601 格式），用于按时间范围筛选',
    example: '2026-02-13T23:59:59.000Z',
  })
  @IsOptional()
  end_date?: Date;
}
