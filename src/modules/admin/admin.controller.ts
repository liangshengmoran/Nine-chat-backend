import { Controller, Get, Post, Body, Query, Param, Request, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiParam } from '@nestjs/swagger';
import { AdminService } from './admin.service';
import { AdminGuard } from '../../guard/admin.guard';
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          totalUsers: 100,
          todayNewUsers: 5,
          totalRooms: 10,
          activeRooms: 3,
          totalMusic: 200,
          totalCollects: 500,
          totalMessages: 10000,
          todayMessages: 150,
          onlineUsers: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              user_id: 1,
              user_name: 'admin',
              user_nick: '管理员',
              user_avatar: '/avatars/1.png',
              user_role: 'admin',
              user_status: 1,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 100,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiParam({ name: 'id', description: '用户ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          user_id: 1,
          user_name: 'testuser',
          user_nick: '测试用户',
          user_avatar: '/avatars/1.png',
          user_email: 'test@example.com',
          user_role: 'user',
          user_status: 1,
          collectCount: 10,
          messageCount: 500,
          ownedRoom: { room_id: 1001, room_name: '我的房间' },
          moderatorRooms: [],
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
- 设置 owner/moderator/remove_moderator 时必须提供有效的 room_id`,
  })
  @ApiResponse({
    status: 200,
    description: '操作成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, message: '角色更新成功' },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '操作成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, user_status: 0, message: '用户已被封禁' },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              room_id: 888,
              room_name: '官方聊天室',
              room_notice: '欢迎',
              room_need_password: 0,
              room_user_id: 1,
              owner_nick: '管理员',
              online_count: 5,
              createdAt: '2026-01-01T00:00:00.000Z',
            },
          ],
          total: 10,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiParam({ name: 'id', description: '房间ID', example: 888 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          room_id: 888,
          room_name: '官方聊天室',
          room_notice: '欢迎来到官方聊天室',
          room_need_password: 0,
          owner: { user_id: 1, user_nick: '管理员', user_avatar: '/avatars/1.png' },
          moderators: [{ user_id: 2, user_nick: '房管小王' }],
          online_count: 5,
          message_count: 10000,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              music_mid: 'abc123',
              music_name: '晴天',
              music_singer: '周杰伦',
              music_cover: 'https://...',
              source: 'kugou',
              collect_count: 15,
              createdAt: '2026-01-15T00:00:00.000Z',
            },
          ],
          total: 200,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          { music_name: '晴天', music_singer: '周杰伦', collect_count: 50 },
          { music_name: '稻香', music_singer: '周杰伦', collect_count: 42 },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 123,
              message_content: 'Hello!',
              message_type: 'text',
              message_status: 1,
              user_id: 1,
              user_nick: '测试用户',
              room_id: 888,
              createdAt: '2026-02-06T10:00:00.000Z',
            },
          ],
          total: 10000,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiParam({ name: 'id', description: '房间ID', example: 1001 })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: {
      example: {
        code: 200,
        data: {
          id: 1,
          title: '系统维护通知',
          content: '今晚22:00进行系统维护...',
          type: 1,
          status: 1,
          createdAt: '2026-02-13T10:00:00.000Z',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '公告不存在' })
  updateAnnouncement(@Request() req, @Body() params: UpdateAnnouncementDto) {
    return this.AdminService.updateAnnouncement(params, req.payload);
  }

  @Post('/announcements/delete/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除公告',
    description: '管理员删除系统公告，操作不可恢复',
  })
  @ApiParam({ name: 'id', description: '公告ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '公告不存在' })
  deleteAnnouncement(@Request() req, @Param('id') id: number) {
    return this.AdminService.deleteAnnouncement(Number(id), req.payload);
  }

  @Get('/announcements')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取公告列表',
    description: '管理员获取所有公告列表（分页），包含已过期和已隐藏的公告',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              title: '系统维护通知',
              content: '今晚22:00进行系统维护...',
              type: 1,
              status: 1,
              creator_nick: '管理员',
              expire_at: '2026-03-01T00:00:00.000Z',
              createdAt: '2026-02-13T10:00:00.000Z',
            },
          ],
          total: 5,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            id: 1,
            title: '系统维护通知',
            content: '今晚22:00进行系统维护...',
            type: 1,
            createdAt: '2026-02-13T10:00:00.000Z',
          },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              operator_id: 1,
              operator_nick: '管理员',
              action_type: 'ban_user',
              target_type: 'user',
              target_id: 5,
              detail: '封禁用户: 违规发言',
              createdAt: '2026-02-13T10:00:00.000Z',
            },
          ],
          total: 200,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '封禁成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, banned_count: 3, skipped_count: 1 },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, deleted_count: 5 },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          todayNewUsers: 5,
          todayMessages: 150,
          onlineUsers: 20,
          roomStats: [{ room_id: 888, room_name: '官方聊天室', online: 15 }],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '添加成功',
    schema: {
      example: {
        code: 200,
        data: { id: 1, word: '违规词', type: 0, replacement: '***' },
        success: true,
        message: '请求成功',
      },
    },
  })
  addSensitiveWord(@Body() params: CreateSensitiveWordDto) {
    return this.AdminService.addSensitiveWord(params);
  }

  @Post('/sensitive-words/delete/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除敏感词',
    description: '从敏感词库中删除指定敏感词',
  })
  @ApiParam({ name: 'id', description: '敏感词ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  deleteSensitiveWord(@Param('id') id: number) {
    return this.AdminService.deleteSensitiveWord(Number(id));
  }

  @Get('/sensitive-words')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取敏感词列表',
    description: '分页获取敏感词列表，包含敏感词内容、类型和替换文本',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [{ id: 1, word: '违规词', type: 0, replacement: '***', createdAt: '2026-02-01T00:00:00.000Z' }],
          total: 20,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '提交成功',
    schema: {
      example: {
        code: 200,
        data: { id: 1, title: '功能建议', status: 0 },
        success: true,
        message: '请求成功',
      },
    },
  })
  createFeedback(@Request() req, @Body() params: CreateFeedbackDto) {
    return this.AdminService.createFeedback(params, req.payload);
  }

  @Get('/feedback')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取反馈列表',
    description: '管理员获取所有反馈列表，支持按状态筛选和分页',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              title: '功能建议',
              content: '希望添加暗色模式',
              type: 0,
              status: 0,
              user_nick: '测试用户',
              createdAt: '2026-02-10T00:00:00.000Z',
            },
          ],
          total: 10,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '处理成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '反馈不存在' })
  replyFeedback(@Request() req, @Body() params: ReplyFeedbackDto) {
    return this.AdminService.replyFeedback(params, req.payload);
  }

  @Get('/feedback/my')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取我的反馈',
    description: '用户获取自己提交的反馈列表及处理状态',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              title: '功能建议',
              content: '希望添加暗色模式',
              type: 0,
              status: 2,
              reply: '已在开发计划中',
              createdAt: '2026-02-10T00:00:00.000Z',
            },
          ],
          total: 3,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '生成成功',
    schema: {
      example: {
        code: 200,
        data: {
          id: 1,
          invite_code: 'ABC12345',
          max_uses: 10,
          used_count: 0,
          expire_at: '2026-03-01T00:00:00.000Z',
          remark: '活动专用',
          createdAt: '2026-02-13T10:00:00.000Z',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  createInviteCode(@Request() req, @Body() params: CreateInviteCodeDto) {
    return this.AdminService.createInviteCode(params, req.payload);
  }

  @Get('/invite-codes')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取邀请码列表',
    description: '分页获取邀请码列表，包含使用情况、过期时间等',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              invite_code: 'ABC12345',
              max_uses: 10,
              used_count: 3,
              status: 1,
              remark: '活动专用',
              creator_nick: '管理员',
              expire_at: '2026-03-01T00:00:00.000Z',
              createdAt: '2026-02-13T10:00:00.000Z',
            },
          ],
          total: 5,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiParam({ name: 'id', description: '邀请码ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '禁用成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '添加成功',
    schema: {
      example: {
        code: 200,
        data: { id: 1, ip: '192.168.1.100', reason: '恶意攻击' },
        success: true,
        message: '请求成功',
      },
    },
  })
  addIpBlacklist(@Request() req, @Body() params: AddIpBlacklistDto) {
    return this.AdminService.addIpBlacklist(params, req.payload);
  }

  @Post('/ip-blacklist/remove/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '从黑名单移除IP',
    description: '解除IP封禁，立即生效',
  })
  @ApiParam({ name: 'id', description: '黑名单记录ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '移除成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  removeIpBlacklist(@Param('id') id: number) {
    return this.AdminService.removeIpBlacklist(Number(id));
  }

  @Get('/ip-blacklist')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取IP黑名单',
    description: '分页获取IP黑名单列表，包含IP地址、封禁原因、过期时间',
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              ip: '192.168.1.100',
              reason: '恶意攻击',
              operator_nick: '管理员',
              expire_at: null,
              createdAt: '2026-02-13T10:00:00.000Z',
            },
          ],
          total: 3,
          page: 1,
          pagesize: 20,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '导出成功',
    schema: {
      example: {
        code: 200,
        data: {
          type: 'users',
          count: 100,
          records: ['...（数据内容）'],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '清理完成',
    schema: {
      example: {
        code: 200,
        data: {
          announcements: 2,
          inviteCodes: 5,
          ipBlacklist: 1,
          operationLogs: 100,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  cleanupExpiredData() {
    return this.AdminService.cleanupExpiredData();
  }

  // ==================== 动态权限管理 (RBAC) ====================

  @Get('/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取角色列表',
    description: `获取系统中所有角色列表（含内置角色和自定义角色）。

**内置角色（不可删除）：**
| role_key | 名称 | 等级 |
|----------|------|------|
| guest | 游客 | 0 |
| bot | 机器人 | 1 |
| user | 普通用户 | 1 |
| moderator | 房间管理员 | 2 |
| owner | 房主 | 3 |
| admin | 管理员 | 4 |
| super | 超级管理员 | 5 |

**返回内容：**
- 角色列表按等级升序排列
- 每个角色包含：id, role_key, role_name, role_color, role_level, is_system, description, status`,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              role_key: 'guest',
              role_name: '游客',
              role_color: '#cccccc',
              role_level: 0,
              is_system: true,
              description: '游客 - 仅限浏览',
              status: 1,
            },
            {
              id: 3,
              role_key: 'user',
              role_name: '用户',
              role_color: '#999999',
              role_level: 1,
              is_system: true,
              description: '普通用户',
              status: 1,
            },
            {
              id: 8,
              role_key: 'vip',
              role_name: 'VIP用户',
              role_color: '#e74c3c',
              role_level: 1,
              is_system: false,
              description: 'VIP会员 - 享受更短冷却时间',
              status: 1,
            },
          ],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  getRoles() {
    return this.AdminService.getRoles();
  }

  @Post('/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建自定义角色',
    description: `创建一个新的自定义角色。创建后需要通过"批量更新角色权限"接口为其分配权限。

**请求参数：**
- \`role_key\`: 角色标识符（唯一，只允许小写字母和下划线，如 \`vip\`、\`trial_admin\`）
- \`role_name\`: 显示名称（如 "VIP用户"）
- \`role_color\`: 显示颜色（如 "#e74c3c"，可选，默认 #999999）
- \`role_level\`: 角色等级（数值越高权限越大，用于"不能操作同级或更高级别用户"的判断）
- \`description\`: 角色描述（可选）

**使用示例：**
创建一个"VIP用户"角色：
\`\`\`json
{
  "role_key": "vip",
  "role_name": "VIP用户",
  "role_color": "#e74c3c",
  "role_level": 1,
  "description": "VIP会员 - 享受更短冷却时间和更长消息上限"
}
\`\`\`

创建一个"公告编辑员"角色：
\`\`\`json
{
  "role_key": "announcement_editor",
  "role_name": "公告编辑员",
  "role_color": "#3498db",
  "role_level": 2,
  "description": "仅可管理系统公告"
}
\`\`\`

**注意：**
- role_key 必须唯一，不能与已有角色重复
- 新角色默认没有任何权限，需要手动分配
- is_system 自动设为 false（自定义角色可删除）`,
  })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: {
      example: {
        code: 200,
        data: {
          id: 8,
          role_key: 'vip',
          role_name: 'VIP用户',
          role_color: '#e74c3c',
          role_level: 1,
          is_system: false,
          description: 'VIP会员',
          status: 1,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '角色标识符已存在' })
  createRole(@Body() params) {
    return this.AdminService.createRole(params);
  }

  @Post('/roles/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新角色信息',
    description: `更新角色的显示信息。

**请求参数：**
- \`id\`: 角色ID（必填）
- \`role_name\`: 新的显示名称（可选）
- \`role_color\`: 新的显示颜色（可选）
- \`role_level\`: 新的角色等级（可选）
- \`description\`: 新的描述（可选）
- \`status\`: 状态 1-启用 0-禁用（可选）

**使用示例：**
\`\`\`json
{
  "id": 8,
  "role_name": "超级VIP用户",
  "role_color": "#ff6b6b",
  "description": "超级VIP - 无冷却时间"
}
\`\`\`

**注意：**
- 系统内置角色不允许修改 role_key
- 修改后会自动清除所有权限缓存`,
  })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 404, description: '角色不存在' })
  updateRoleInfo(@Body() params) {
    return this.AdminService.updateRole(params);
  }

  @Post('/roles/delete/:id')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除自定义角色',
    description: `删除一个自定义角色。

**业务规则：**
- 系统内置角色（is_system=true）不可删除
- 删除角色会同时删除：
  - 该角色的所有权限绑定（tb_role_permission）
  - 该角色的所有用户绑定（tb_user_role）
- 已被分配此角色的用户将失去该角色的所有权限
- 操作不可恢复

**注意：** 删除前请确认没有用户正在依赖此角色的权限。`,
  })
  @ApiParam({ name: 'id', description: '角色ID', example: 8 })
  @ApiResponse({
    status: 200,
    description: '删除成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 403, description: '不能删除系统内置角色' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  deleteRole(@Param('id') id: number) {
    return this.AdminService.deleteRole(Number(id));
  }

  @Get('/permissions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取所有权限项列表',
    description: `获取系统中定义的所有权限项（共 7 组 45 项）。

**权限分组：**
| 分组 | 数量 | 作用域 | 说明 |
|------|------|--------|------|
| chat | 10 | room | 聊天相关权限 |
| music | 8 | room | 音乐相关权限 |
| room | 11 | room | 房间管理权限 |
| user | 5 | global | 用户管理权限 |
| bot | 5 | global | Bot管理权限 |
| admin | 11 | global | 后台管理权限 |
| system | 3 | global | 系统最高权限 |

**返回格式：**
- \`list\`: 所有权限项的平铺列表
- \`grouped\`: 按 perm_group 分组的权限项

**可配置参数的权限项：**
部分权限项有 config_schema，表示可以为不同角色设置不同的参数值：
- \`chat.send_text\`: \`{ max_length: 500 }\` 消息长度上限
- \`chat.send_image\`: \`{ max_size_kb: 5120 }\` 图片大小上限
- \`chat.recall_own\`: \`{ time_limit_sec: 120 }\` 撤回时间限制
- \`music.choose\`: \`{ cooldown_sec: 8 }\` 点歌冷却时间
- \`chat.view_history\`: \`{ max_pages: -1 }\` 历史消息页数限制(-1=无限)`,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              perm_key: 'chat.send_text',
              perm_name: '发送文本消息',
              perm_group: 'chat',
              description: '允许发送文字消息',
              scope_type: 'room',
              config_schema: { max_length: 500 },
            },
            {
              id: 11,
              perm_key: 'music.choose',
              perm_name: '点歌',
              perm_group: 'music',
              description: '允许在房间内点歌',
              scope_type: 'room',
              config_schema: { cooldown_sec: 8 },
            },
          ],
          grouped: {
            chat: ['...10 items'],
            music: ['...8 items'],
            room: ['...11 items'],
            user: ['...5 items'],
            bot: ['...5 items'],
            admin: ['...11 items'],
            system: ['...3 items'],
          },
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  getPermissions() {
    return this.AdminService.getPermissions();
  }

  @Get('/roles/:id/permissions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取角色的权限配置',
    description: `获取指定角色已绑定的权限列表及其配置参数。

**返回内容：**
每条记录包含：
- \`role_id\`: 角色ID
- \`permission_id\`: 权限项ID
- \`scope_value\`: 作用域（\`*\` = 所有房间，具体数字 = 指定房间ID）
- \`config\`: 配置参数（如 \`{ "cooldown_sec": 3 }\`）
- \`status\`: 1-启用 0-禁用
- \`permission\`: 关联的权限项详情

**使用场景：**
在管理后台的"角色权限配置"页面，加载角色当前的权限勾选状态和配置参数。`,
  })
  @ApiParam({ name: 'id', description: '角色ID', example: 3 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 1,
              role_id: 3,
              permission_id: 1,
              scope_value: '*',
              config: { max_length: 500 },
              status: 1,
              permission: {
                id: 1,
                perm_key: 'chat.send_text',
                perm_name: '发送文本消息',
                perm_group: 'chat',
                scope_type: 'room',
              },
            },
            {
              id: 5,
              role_id: 3,
              permission_id: 11,
              scope_value: '*',
              config: { cooldown_sec: 8 },
              status: 1,
              permission: {
                id: 11,
                perm_key: 'music.choose',
                perm_name: '点歌',
                perm_group: 'music',
                scope_type: 'room',
              },
            },
          ],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  getRolePermissions(@Param('id') id: number) {
    return this.AdminService.getRolePermissions(Number(id));
  }

  @Post('/roles/:id/permissions')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '批量更新角色权限',
    description: `像搭积木一样为角色勾选/取消具体的操作权限，支持设置每个权限的配置参数。

**请求参数：**
\`\`\`json
{
  "permissions": [
    {
      "permission_id": 11,
      "scope_value": "*",
      "config": { "cooldown_sec": 3 },
      "enabled": true
    },
    {
      "permission_id": 29,
      "scope_value": "*",
      "config": null,
      "enabled": false
    }
  ]
}
\`\`\`

**字段说明：**
- \`permission_id\`: 权限项ID（从 GET /admin/permissions 获取）
- \`scope_value\`: 作用域值
  - \`"*"\` = 对所有房间生效（默认值）
  - \`"888"\` = 仅对房间ID为888的房间生效
- \`config\`: 配置参数（可选，仅针对有 config_schema 的权限项）
  - 例如为VIP设置更短的点歌冷却：\`{ "cooldown_sec": 3 }\`
  - 例如为VIP设置更长的消息上限：\`{ "max_length": 2000 }\`
- \`enabled\`: true=启用此权限，false=禁用此权限

**典型用法1 - 创建VIP角色：**
先用 POST /admin/roles 创建VIP角色，然后用本接口分配权限：
\`\`\`json
{
  "permissions": [
    { "permission_id": 1, "enabled": true, "config": { "max_length": 2000 } },
    { "permission_id": 11, "enabled": true, "config": { "cooldown_sec": 3 } },
    { "permission_id": 7, "enabled": true, "config": { "time_limit_sec": 300 } }
  ]
}
\`\`\`

**典型用法2 - 创建公告编辑员角色：**
只给 admin.manage_announcements 权限：
\`\`\`json
{
  "permissions": [
    { "permission_id": 45, "enabled": true }
  ]
}
\`\`\`
其中 permission_id=45 对应 \`admin.manage_announcements\`（实际ID以 GET /admin/permissions 返回为准）

**注意：**
- 更新后会自动清除所有用户的权限缓存
- 未提及的权限项不受影响（只更新传入的条目）`,
  })
  @ApiParam({ name: 'id', description: '角色ID', example: 8 })
  @ApiResponse({
    status: 200,
    description: '更新成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 404, description: '角色不存在' })
  updateRolePermissions(@Param('id') id: number, @Body() params) {
    return this.AdminService.updateRolePermissions(Number(id), params);
  }

  @Get('/users/:id/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取用户角色列表',
    description: `获取指定用户当前拥有的角色列表。

**返回内容：**
每条记录包含：
- 角色基本信息（role_key, role_name, role_color, role_level 等）
- \`scope_value\`: 角色作用域（\`*\` = 全局生效，房间ID = 仅在该房间生效）
- \`assigned_by\`: 分配者用户ID
- \`source\`: 角色来源
  - \`"dynamic"\`: 通过 RBAC 系统动态分配的角色
  - \`"default"\`: 从用户表 user_role 字段回退的默认角色

**业务逻辑：**
- 如果用户在 tb_user_role 表中有动态分配的角色，返回这些角色
- 如果没有动态角色，回退到 user_role 字段映射的内置角色
- 用户可以同时拥有多个角色，最终权限 = 所有角色权限的并集`,
  })
  @ApiParam({ name: 'id', description: '用户ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          list: [
            {
              id: 3,
              role_key: 'user',
              role_name: '用户',
              role_color: '#999999',
              role_level: 1,
              scope_value: '*',
              source: 'default',
            },
          ],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  getUserRoles(@Param('id') id: number) {
    return this.AdminService.getUserRoles(Number(id));
  }

  @Post('/users/:id/roles')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '给用户分配角色',
    description: `将指定角色分配给用户。用户可以同时拥有多个角色，最终权限取所有角色权限的并集。

**请求参数：**
- \`role_id\`: 要分配的角色ID（必填，从 GET /admin/roles 获取）
- \`scope_value\`: 作用域值（可选）
  - \`"*"\` = 全局生效（默认值，用于系统级角色如 admin、vip）
  - \`"888"\` = 仅在房间ID为888的房间内生效（用于房间级角色如 moderator）

**使用示例1 - 给用户分配VIP角色（全局）：**
\`\`\`json
{ "role_id": 8 }
\`\`\`

**使用示例2 - 给用户分配房管角色（指定房间）：**
\`\`\`json
{ "role_id": 4, "scope_value": "888" }
\`\`\`

**使用示例3 - 给用户分配公告编辑员角色（全局）：**
\`\`\`json
{ "role_id": 9, "scope_value": "*" }
\`\`\`

**注意：**
- 同一用户不能重复分配相同角色+相同作用域的组合
- 如果之前撤销过相同绑定，会自动恢复
- 分配后立即生效（清除该用户权限缓存）`,
  })
  @ApiParam({ name: 'id', description: '用户ID', example: 5 })
  @ApiResponse({
    status: 200,
    description: '分配成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 400, description: '用户已拥有此角色' })
  @ApiResponse({ status: 404, description: '角色不存在' })
  assignUserRole(@Param('id') id: number, @Body() params, @Request() req) {
    return this.AdminService.assignUserRole(Number(id), params, req.payload);
  }

  @Post('/users/:id/roles/remove/:roleId')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '撤销用户角色',
    description: `撤销用户的指定角色。

**业务规则：**
- 撤销后该用户立即失去该角色对应的所有权限
- 如果用户只有这一个动态角色，会自动回退到 user_role 字段的默认角色
- 撤销操作是软删除（status 设为 0），可以通过重新分配恢复
- 撤销后立即生效（清除该用户权限缓存）

**典型场景：**
- 用户VIP过期 → 撤销VIP角色
- 房管违规 → 撤销该房间的 moderator 角色
- 公告编辑员离职 → 撤销 announcement_editor 角色`,
  })
  @ApiParam({ name: 'id', description: '用户ID', example: 5 })
  @ApiParam({ name: 'roleId', description: '角色ID', example: 8 })
  @ApiResponse({
    status: 200,
    description: '撤销成功',
    schema: { example: { code: 200, data: { success: true, affected: 1 }, success: true, message: '请求成功' } },
  })
  removeUserRole(@Param('id') id: number, @Param('roleId') roleId: number) {
    return this.AdminService.removeUserRole(Number(id), Number(roleId));
  }
}
