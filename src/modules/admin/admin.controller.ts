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

@ApiTags('Admin - 管理后台')
@Controller('admin')
@UseGuards(AdminGuard)
export class AdminController {
  constructor(private readonly AdminService: AdminService) {}

  // ==================== 仪表盘 ====================

  @Get('/dashboard')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取仪表盘数据',
    description: '获取系统统计数据，包括用户数、房间数、歌曲数、消息数等',
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
    description: '分页获取用户列表，支持按关键词和角色筛选',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getUserList(@Query() params: UserQueryDto) {
    return this.AdminService.getUserList(params);
  }

  @Get('/users/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取用户详情',
    description: '获取指定用户的详细信息，包括收藏数、消息数等',
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
    summary: '更新用户角色',
    description: '修改用户的角色权限（仅超管可设置admin）',
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '无权限操作' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  updateUserRole(@Body() params: UpdateUserRoleDto, @Request() req) {
    return this.AdminService.updateUserRole(params, req.payload);
  }

  @Post('/users/ban')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '封禁/解封用户',
    description: '切换用户的封禁状态',
  })
  @ApiResponse({ status: 200, description: '操作成功' })
  @ApiResponse({ status: 403, description: '不能封禁管理员' })
  @ApiResponse({ status: 404, description: '用户不存在' })
  toggleUserBan(@Body() params: BanUserDto, @Request() req) {
    return this.AdminService.toggleUserBan(params, req.payload);
  }

  // ==================== 房间管理 ====================

  @Get('/rooms')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取房间列表',
    description: '分页获取房间列表，支持按关键词筛选',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getRoomList(@Query() params: RoomQueryDto) {
    return this.AdminService.getRoomList(params);
  }

  @Get('/rooms/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取房间详情',
    description: '获取指定房间的详细信息，包括房主、房管、消息数等',
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
    description: '分页获取曲库歌曲列表，支持按关键词和音源筛选',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMusicList(@Query() params: MusicQueryDto) {
    return this.AdminService.getMusicList(params);
  }

  @Post('/music/delete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除曲库歌曲',
    description: '从曲库中删除指定歌曲',
  })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 404, description: '歌曲不存在' })
  deleteMusic(@Body() params: DeleteMusicDto, @Request() req) {
    return this.AdminService.deleteMusic(params, req.payload);
  }

  @Get('/music/stats')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取收藏统计',
    description: '获取收藏最多的歌曲排行',
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
    description: '分页获取消息列表，支持按房间、用户、关键词筛选',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  getMessageList(@Query() params: MessageQueryDto) {
    return this.AdminService.getMessageList(params);
  }

  @Post('/messages/delete')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除消息',
    description: '管理员删除违规消息',
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
    description: '管理员更新任意房间信息',
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
    description: '管理员删除房间（官方房间不可删除）',
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
    description: '管理员创建系统公告',
  })
  @ApiResponse({ status: 200, description: '创建成功' })
  createAnnouncement(@Request() req, @Body() params: CreateAnnouncementDto) {
    return this.AdminService.createAnnouncement(params, req.payload);
  }

  @Post('/announcements/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新公告',
    description: '管理员更新公告信息',
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
    description: '获取当前有效的公告列表（前端展示用，无需权限）',
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
    description: '获取管理员操作日志列表（分页）',
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
    description: '批量封禁多个用户账号',
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
    description: '批量删除多条消息',
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
    description: '获取今日新增用户、今日消息数等统计信息',
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
    description: '添加需要过滤的敏感词',
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
    description: '用户提交反馈或建议',
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
    description: '管理员回复处理用户反馈',
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
    description: '管理员生成新的邀请码',
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
    description: '禁用指定邀请码',
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
    description: '封禁指定IP地址',
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
    description: '导出用户、消息、房间或音乐数据',
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
    description: '手动触发清理过期公告、邀请码、IP黑名单和操作日志',
  })
  @ApiResponse({ status: 200, description: '清理完成' })
  cleanupExpiredData() {
    return this.AdminService.cleanupExpiredData();
  }
}
