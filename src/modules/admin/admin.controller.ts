import { Controller, Get, Post, Body, Query, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from 'src/guard/admin.guard';
import {
  UserQueryDto,
  UpdateUserRoleDto,
  BanUserDto,
  RoomQueryDto,
  MusicQueryDto,
  DeleteMusicDto,
  MessageQueryDto,
  DeleteMessageDto,
  UpdateRoomDto,
  CreateAnnouncementDto,
  UpdateAnnouncementDto,
  AnnouncementQueryDto,
  OperationLogQueryDto,
  BatchBanUsersDto,
  BatchDeleteMessagesDto,
  CreateSensitiveWordDto,
  SensitiveWordQueryDto,
  CreateFeedbackDto,
  ReplyFeedbackDto,
  FeedbackQueryDto,
  CreateInviteCodeDto,
  InviteCodeQueryDto,
  AddIpBlacklistDto,
  IpBlacklistQueryDto,
  ExportDataDto,
} from './dto/admin.dto';

@ApiTags('Admin')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly AdminService: AdminService) {}

  // ==================== 仪表盘 ====================

  @Get('/dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取仪表盘数据',
    description: `获取管理后台首页统计数据。

**返回内容：**
- 总用户数、今日新增用户
- 总房间数、活跃房间数
- 曲库歌曲数、总收藏数
- 总消息数、今日消息数
- 在线用户数`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 403, description: '无权限访问' })
  getDashboard() {
    return this.AdminService.getDashboard();
  }

  // ==================== 用户管理 ====================

  @Get('/users')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取用户列表',
    description: `分页获取用户列表。

**查询参数：**
- \`page\`: 页码（默认1）
- \`pagesize\`: 每页数量（默认20）
- \`keyword\`: 搜索关键词（匹配用户名/昵称）
- \`role\`: 筛选角色（super/admin/user）`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUserList(@Query() params: UserQueryDto) {
    return this.AdminService.getUserList(params);
  }

  @Get('/users/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取用户详情',
    description: `获取指定用户的详细信息。

**返回内容：**
- 基本信息：用户名、昵称、头像、邮箱、角色、状态
- 统计数据：歌曲收藏数、发送消息数
- 房间信息：拥有的房间、担任房管的房间
- 时间信息：注册时间、最后登录时间`,
  })
  @ApiParam({ name: 'id', description: '用户ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  getUserDetail(@Param('id') id: number) {
    return this.AdminService.getUserDetail(Number(id));
  }

  @Post('/users/role')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '角色管理（统一接口）',
    description: `统一的角色管理接口，支持设置/移除各类角色。

**可用角色类型：**
- \`admin\`: 设为管理员（仅超管可操作）
- \`user\`: 设为普通用户 / 移除管理员身份
- \`owner\`: 设为房主（需要 room_id）
- \`moderator\`: 设为房管（需要 room_id）
- \`remove_moderator\`: 移除房管（需要 room_id）

**权限规则：**
| 操作者 | 可设置的角色 |
|--------|-------------|
| 超管 | admin, user, owner, moderator, remove_moderator |
| 管理员 | user, owner, moderator, remove_moderator |
| 房主 | owner（可转让给他人）, moderator, remove_moderator |

**特殊说明：**
- 房主转让房间后，原房主会自动降级为 user（超管/管理员除外）
- 设置 owner/moderator/remove_moderator 时必须提供有效的 room_id
`,
  })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 400, description: '参数错误（如房间角色缺少 room_id）' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  updateUserRole(@Body() params: UpdateUserRoleDto, @Request() req) {
    return this.AdminService.updateUserRole(params, req.payload);
  }

  @Post('/users/ban')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '封禁/解封用户',
    description: `切换用户的封禁状态（toggle）。

**业务规则：**
- 不能封禁超管或管理员
- 封禁后用户无法登录和发送消息
- 再次调用可解除封禁

**请求参数：**
- \`user_id\`: 目标用户ID
- \`reason\`: 封禁原因（可选）`,
  })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 403, description: '不能封禁管理员' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  toggleUserBan(@Body() params: BanUserDto) {
    return this.AdminService.toggleUserBan(params);
  }

  // ==================== 房间管理 ====================

  @Get('/rooms')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取房间列表',
    description: `分页获取房间列表。

**查询参数：**
- \`page\`: 页码（默认1）
- \`pagesize\`: 每页数量（默认20）
- \`keyword\`: 搜索关键词（匹配房间名称）

**返回内容：**
- 房间ID、名称、密码状态、公告
- 房主信息、在线人数
- 创建时间`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getRoomList(@Query() params: RoomQueryDto) {
    return this.AdminService.getRoomList(params);
  }

  @Get('/rooms/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取房间详情',
    description: `获取指定房间的详细信息。

**返回内容：**
- 基本信息：房间名、公告、背景图、密码状态
- 房主信息：用户ID、昵称、头像
- 房管列表：所有房管的信息
- 统计数据：在线人数、消息总数`,
  })
  @ApiParam({ name: 'id', description: '房间ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 404, description: '房间不存在' })
  getRoomDetail(@Param('id') id: number) {
    return this.AdminService.getRoomDetail(Number(id));
  }

  // ==================== 曲库管理 ====================

  @Get('/music')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取曲库列表',
    description: `分页获取曲库歌曲列表。

**查询参数：**
- \`page\`: 页码
- \`pagesize\`: 每页数量
- \`keyword\`: 搜索关键词（匹配歌名/歌手）
- \`source\`: 音源筛选（kugou/netease）

**返回内容：**
- 歌曲ID、名称、歌手、封面
- 音源、收藏数
- 添加时间`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMusicList(@Query() params: MusicQueryDto) {
    return this.AdminService.getMusicList(params);
  }

  @Post('/music/delete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除曲库歌曲',
    description: `从曲库中删除指定歌曲。

**注意：**
- 删除后用户的收藏也会一并清除
- 正在播放的歌曲不会立即中断
- 操作不可恢复`,
  })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '歌曲不存在' })
  deleteMusic(@Body() params: DeleteMusicDto) {
    return this.AdminService.deleteMusic(params);
  }

  @Get('/music/stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取收藏统计',
    description: `获取曲库收藏统计数据。

**返回内容：**
- 收藏数 Top 10 歌曲排行
- 每首歌的收藏数量`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getCollectStats() {
    return this.AdminService.getCollectStats();
  }

  // ==================== 消息管理 ====================

  @Get('/messages')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取消息列表',
    description: `分页获取消息列表。

**查询参数：**
- \`page\`: 页码
- \`pagesize\`: 每页数量
- \`room_id\`: 筛选房间ID
- \`user_id\`: 筛选用户ID
- \`keyword\`: 搜索消息内容

**返回内容：**
- 消息ID、内容、类型、状态
- 发送者信息、房间信息
- 发送时间`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMessageList(@Query() params: MessageQueryDto) {
    return this.AdminService.getMessageList(params);
  }

  @Post('/messages/delete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除消息',
    description: `管理员删除违规消息。

**业务规则：**
- 删除后消息状态变为 -2（管理员删除）
- 前端不再显示该消息
- 操作不可恢复`,
  })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  deleteMessage(@Body() params: DeleteMessageDto) {
    return this.AdminService.deleteMessage(params);
  }

  // ==================== 房间管理扩展 ====================

  @Post('/rooms/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新房间信息',
    description: `管理员更新任意房间信息。

**可修改字段：**
- \`room_name\`: 房间名称
- \`room_notice\`: 房间公告
- \`room_need_password\`: 是否需要密码（1-是, 0-否）`,
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '房间不存在' })
  updateRoom(@Body() params: UpdateRoomDto) {
    return this.AdminService.updateRoom(params);
  }

  @Post('/rooms/delete/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除房间',
    description: `管理员删除房间。

**业务规则：**
- 官方默认房间（room_id=888）不可删除
- 删除后房间内的消息一并删除
- 房主的 user_room_id 会被清空
- 操作不可恢复`,
  })
  @ApiParam({ name: 'id', description: '房间ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '不能删除官方房间' })
  @ApiResponse({ status: 404, description: '房间不存在' })
  deleteRoom(@Param('id') id: number) {
    return this.AdminService.deleteRoom(Number(id));
  }

  // ==================== 系统公告 ====================

  @Post('/announcements/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建公告',
    description: `管理员创建系统公告。

**请求参数：**
- \`title\`: 公告标题（必填）
- \`content\`: 公告内容（必填，支持 Markdown）
- \`type\`: 公告类型（0-普通, 1-重要, 2-紧急，默认0）
- \`expire_at\`: 过期时间（可选）`,
  })
  @ApiResponse({ status: 200, description: '创建成功' })
  createAnnouncement(@Request() req, @Body() params: CreateAnnouncementDto) {
    return this.AdminService.createAnnouncement(params, req.payload);
  }

  @Post('/announcements/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新公告',
    description: `管理员更新公告信息。

**可修改字段：**
- \`id\`: 公告ID（必填）
- \`title\`: 公告标题
- \`content\`: 公告内容
- \`type\`: 公告类型（0-普通, 1-重要, 2-紧急）
- \`status\`: 状态（1=显示, 0=隐藏）`,
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 404, description: '公告不存在' })
  updateAnnouncement(@Request() req, @Body() params: UpdateAnnouncementDto) {
    return this.AdminService.updateAnnouncement(params, req.payload);
  }

  @Post('/announcements/delete/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除公告',
    description: '管理员删除公告',
  })
  @ApiParam({ name: 'id', description: '公告ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '公告不存在' })
  deleteAnnouncement(@Request() req, @Param('id') id: number) {
    return this.AdminService.deleteAnnouncement(Number(id), req.payload);
  }

  @Get('/announcements')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取公告列表',
    description: '管理员获取所有公告列表（分页）',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getAnnouncementList(@Query() params: AnnouncementQueryDto) {
    return this.AdminService.getAnnouncementList(params);
  }

  @Get('/announcements/active')
  @ApiOperation({
    summary: '获取有效公告',
    description: `获取当前有效的公告列表（前端展示用）。

**特点：**
- 无需登录即可访问
- 只返回未过期且启用的公告
- 按优先级排序（高优先级在前）`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getActiveAnnouncements() {
    return this.AdminService.getActiveAnnouncements();
  }

  // ==================== 操作日志 ====================

  @Get('/logs')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取操作日志',
    description: `获取管理员操作日志列表。

**查询参数：**
- \`page\`: 页码
- \`pagesize\`: 每页数量
- \`operator_id\`: 筛选操作者ID
- \`action_type\`: 筛选操作类型
- \`target_type\`: 筛选目标类型

**返回内容：**
- 操作者信息、操作类型、操作详情
- 目标对象、操作时间`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getOperationLogs(@Query() params: OperationLogQueryDto) {
    return this.AdminService.getOperationLogs(params);
  }

  // ==================== 批量操作 ====================

  @Post('/users/batch-ban')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '批量封禁用户',
    description: `批量封禁多个用户账号。

**请求参数：**
- \`user_ids\`: 用户ID数组
- \`reason\`: 封禁原因（可选）

**业务规则：**
- 不能封禁超管或管理员
- 批量操作中遇到管理员会跳过`,
  })
  @ApiResponse({ status: 200, description: '封禁成功' })
  @ApiResponse({ status: 403, description: '不能封禁管理员' })
  batchBanUsers(@Request() req, @Body() params: BatchBanUsersDto) {
    return this.AdminService.batchBanUsers(params, req.payload);
  }

  @Post('/messages/batch-delete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '批量删除消息',
    description: `批量删除多条消息。

**请求参数：**
- \`message_ids\`: 消息ID数组

**操作结果：**
- 消息状态变为 -2（管理员删除）
- 返回成功删除的数量`,
  })
  @ApiResponse({ status: 200, description: '删除成功' })
  batchDeleteMessages(@Request() req, @Body() params: BatchDeleteMessagesDto) {
    return this.AdminService.batchDeleteMessages(params, req.payload);
  }

  // ==================== 在线统计 ====================

  @Get('/stats/online')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取在线统计',
    description: `获取实时在线统计信息。

**返回内容：**
- 今日新增用户数
- 今日消息数
- 当前在线用户数
- 各房间在线人数`,
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getOnlineStats() {
    return this.AdminService.getOnlineStats();
  }

  // ==================== 敏感词管理 ====================

  @Post('/sensitive-words/add')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '添加敏感词',
    description: `添加需要过滤的敏感词。

**请求参数：**
- \`word\`: 敏感词内容（必填）
- \`type\`: 类型（0=替换为*, 1=直接拒绝发送，默认0）
- \`replacement\`: 替换文本（可选，type=0 时生效）

**功能说明：**
- 用户发送包含敏感词的消息时会触发过滤`,
  })
  @ApiResponse({ status: 200, description: '添加成功' })
  addSensitiveWord(@Body() params: CreateSensitiveWordDto) {
    return this.AdminService.addSensitiveWord(params);
  }

  @Post('/sensitive-words/delete/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除敏感词',
    description: '删除敏感词',
  })
  @ApiParam({ name: 'id', description: '敏感词ID' })
  @ApiResponse({ status: 200, description: '删除成功' })
  deleteSensitiveWord(@Param('id') id: number) {
    return this.AdminService.deleteSensitiveWord(Number(id));
  }

  @Get('/sensitive-words')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取敏感词列表',
    description: '分页获取敏感词列表',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getSensitiveWordList(@Query() params: SensitiveWordQueryDto) {
    return this.AdminService.getSensitiveWordList(params);
  }

  // ==================== 用户反馈 ====================

  @Post('/feedback/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '提交反馈',
    description: `用户提交反馈或建议。

**请求参数：**
- \`title\`: 反馈标题（必填）
- \`content\`: 反馈内容（必填）
- \`type\`: 类型（0-建议, 1-Bug反馈, 2-举报, 3-其他，可选）
- \`images\`: 附件图片URL（可选）`,
  })
  @ApiResponse({ status: 200, description: '提交成功' })
  createFeedback(@Request() req, @Body() params: CreateFeedbackDto) {
    return this.AdminService.createFeedback(params, req.payload);
  }

  @Get('/feedback')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取反馈列表',
    description: '管理员获取所有反馈列表',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getFeedbackList(@Query() params: FeedbackQueryDto) {
    return this.AdminService.getFeedbackList(params);
  }

  @Post('/feedback/reply')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '回复反馈',
    description: `管理员回复处理用户反馈。

**请求参数：**
- \`id\`: 反馈ID（必填）
- \`status\`: 处理状态（0-待处理, 1-处理中, 2-已解决, 3-已忽略，必填）
- \`reply\`: 管理员回复（可选）`,
  })
  @ApiResponse({ status: 200, description: '处理成功' })
  replyFeedback(@Request() req, @Body() params: ReplyFeedbackDto) {
    return this.AdminService.replyFeedback(params, req.payload);
  }

  @Get('/feedback/my')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取我的反馈',
    description: '用户获取自己提交的反馈列表',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMyFeedbackList(@Request() req, @Query() params: FeedbackQueryDto) {
    return this.AdminService.getMyFeedbackList(params, req.payload);
  }

  // ==================== 邀请码管理 ====================

  @Post('/invite-codes/create')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '生成邀请码',
    description: `管理员生成新的邀请码。

**请求参数：**
- \`max_uses\`: 可使用次数（默认1次）
- \`expire_at\`: 过期时间（可选）
- \`remark\`: 备注（可选）

**返回内容：**
- 生成的邀请码信息`,
  })
  @ApiResponse({ status: 200, description: '生成成功' })
  createInviteCode(@Request() req, @Body() params: CreateInviteCodeDto) {
    return this.AdminService.createInviteCode(params, req.payload);
  }

  @Get('/invite-codes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取邀请码列表',
    description: '分页获取邀请码列表',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getInviteCodeList(@Query() params: InviteCodeQueryDto) {
    return this.AdminService.getInviteCodeList(params);
  }

  @Post('/invite-codes/disable/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '禁用邀请码',
    description: `禁用指定邀请码。

**业务规则：**
- 禁用后该邀请码不能再被使用
- 已被使用过的记录不受影响`,
  })
  @ApiParam({ name: 'id', description: '邀请码ID' })
  @ApiResponse({ status: 200, description: '禁用成功' })
  disableInviteCode(@Param('id') id: number) {
    return this.AdminService.disableInviteCode(Number(id));
  }

  // ==================== IP黑名单 ====================

  @Post('/ip-blacklist/add')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '添加IP到黑名单',
    description: `封禁指定IP地址。

**请求参数：**
- \`ip\`: IP地址（支持IPv4/IPv6）
- \`reason\`: 封禁原因
- \`expire_at\`: 过期时间（可选，不填则永久封禁）

**功能说明：**
- 被封禁的IP无法访问系统`,
  })
  @ApiResponse({ status: 200, description: '添加成功' })
  addIpBlacklist(@Request() req, @Body() params: AddIpBlacklistDto) {
    return this.AdminService.addIpBlacklist(params, req.payload);
  }

  @Post('/ip-blacklist/remove/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '从黑名单移除IP',
    description: '解除IP封禁',
  })
  @ApiParam({ name: 'id', description: '黑名单记录ID' })
  @ApiResponse({ status: 200, description: '移除成功' })
  removeIpBlacklist(@Param('id') id: number) {
    return this.AdminService.removeIpBlacklist(Number(id));
  }

  @Get('/ip-blacklist')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取IP黑名单',
    description: '分页获取IP黑名单列表',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getIpBlacklistList(@Query() params: IpBlacklistQueryDto) {
    return this.AdminService.getIpBlacklistList(params);
  }

  // ==================== 数据导出 ====================

  @Post('/export')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '导出数据',
    description: `导出系统数据。

**请求参数：**
- \`type\`: 数据类型（users/messages/rooms/music，必填）
- \`start_date\`: 开始日期（可选）
- \`end_date\`: 结束日期（可选）

**返回内容：**
- 导出的数据内容`,
  })
  @ApiResponse({ status: 200, description: '导出成功' })
  exportData(@Body() params: ExportDataDto) {
    return this.AdminService.exportData(params);
  }

  // ==================== 定时清理 ====================

  @Post('/cleanup')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '清理过期数据',
    description: `手动触发清理过期数据。

**清理范围：**
- 过期公告
- 过期邀请码
- 过期IP黑名单记录
- 30天前的操作日志

**返回内容：**
- 各类型清理的记录数`,
  })
  @ApiResponse({ status: 200, description: '清理完成' })
  cleanupExpiredData() {
    return this.AdminService.cleanupExpiredData();
  }
}
