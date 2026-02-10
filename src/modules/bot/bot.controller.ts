import { Controller, Get, Post, Put, Delete, Body, Param, Query, Req, UseGuards, ParseIntPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { BotGuard } from 'src/guard/bot.guard';
import { AuthGuard } from '../../guard/auth.guard';
import { CreateBotDto, UpdateBotDto, BotSendMessageDto, BotChooseMusicDto, BotGetMessagesDto } from './dto/bot.dto';
import { BotRejectDto, BotSuspendDto, BotPermissionsDto, AddBotManagerDto } from './dto/bot-admin.dto';

@ApiTags('Bot')
@Controller('bot')
export class BotController {
  constructor(private readonly botService: BotService) {}

  // ==================== 用户管理Bot (JWT认证) ====================

  @Post('create')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建Bot',
    description: `创建一个新的Bot应用。

**创建流程：**
1. 提供Bot名称（必填）和其他可选配置
2. 系统自动生成唯一的Bot Token
3. 返回完整的Bot信息，包含Token

**Token格式：**
\`\`\`
bot_<时间戳36进制>_<32字符随机hex>
例: bot_m5x2k8_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
\`\`\`

**重要提示：**
- Token只在创建时显示一次，请妥善保存
- 如需重置Token，请使用 \`/:id/regenerate-token\` 接口

**房间白名单：**
- 如果设置 \`allowed_rooms\`，Bot只能在指定房间发送消息
- 留空表示可以访问所有房间`,
  })
  @ApiResponse({
    status: 201,
    description: 'Bot创建成功',
    schema: {
      example: {
        code: 200,
        data: {
          id: 1,
          bot_name: 'My Awesome Bot',
          bot_username: 'awesome_bot',
          bot_token: 'bot_m5x2k8_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6',
          owner_id: 123,
          bot_avatar: null,
          bot_description: null,
          allowed_rooms: '888,999',
          rate_limit: 60,
          music_cooldown: 8,
          status: 1,
          approval_status: 'pending',
          permissions: {
            can_send_message: true,
            can_send_image: false,
            can_choose_music: true,
            can_read_history: true,
            can_mention_users: false,
            can_pin_message: false,
            max_message_length: 2000,
          },
          createdAt: '2026-02-06T10:00:00.000Z',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权，请先登录' })
  async createBot(@Req() req, @Body() params: CreateBotDto) {
    const { user_id } = req.payload;
    return this.botService.createBot(user_id, params);
  }

  @Get('list')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取我的Bot列表',
    description: `获取当前登录用户创建的所有Bot列表。

**返回内容：**
- Bot基本信息（不包含Token）
- Bot状态和统计数据
- 创建时间和最后活跃时间`,
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
            bot_name: 'My Bot',
            bot_username: 'my_bot',
            bot_avatar: '/avatars/bot.png',
            bot_description: '一个聊天Bot',
            status: 1,
            approval_status: 'approved',
            allowed_rooms: '888,999',
            rate_limit: 60,
            music_cooldown: 8,
            total_requests: 1234,
            today_requests: 56,
            owner_id: 123,
            createdAt: '2026-02-01T00:00:00.000Z',
            last_active_at: '2026-02-06T10:00:00.000Z',
          },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  async listMyBots(@Req() req) {
    const { user_id } = req.payload;
    return this.botService.listBots(user_id);
  }

  @Put(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新Bot信息',
    description: `更新指定Bot的配置信息。

**可更新字段：**
- \`bot_name\` - Bot名称
- \`bot_avatar\` - Bot头像URL
- \`bot_description\` - Bot描述
- \`allowed_rooms\` - 允许访问的房间ID列表
- \`rate_limit\` - 每分钟请求限制 (1-1000)
- \`music_cooldown\` - 点歌冷却时间(秒)
- \`webhook_url\` - Webhook回调URL
- \`status\` - 启用/禁用 (1/0)

**注意：** 只有Bot所有者才能更新`,
  })
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 403, description: '无权限操作此Bot' })
  @ApiResponse({ status: 404, description: 'Bot不存在' })
  async updateBot(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() params: UpdateBotDto) {
    const { user_id } = req.payload;
    return this.botService.updateBot(id, user_id, params);
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '删除Bot',
    description: `永久删除指定的Bot。

**警告：**
- 删除后Bot Token将立即失效
- 该操作不可恢复
- 只有Bot所有者才能删除`,
  })
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({ status: 200, description: '删除成功' })
  @ApiResponse({ status: 403, description: '无权限操作此Bot' })
  @ApiResponse({ status: 404, description: 'Bot不存在' })
  async deleteBot(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { user_id } = req.payload;
    await this.botService.deleteBot(id, user_id);
    return { success: true };
  }

  @Post(':id/regenerate-token')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '重新生成Bot Token',
    description: `重新生成Bot的访问Token。

**使用场景：**
- Token泄露需要更换
- 定期轮换Token保证安全

**注意事项：**
- 旧Token立即失效
- 新Token只显示一次，请妥善保存`,
  })
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: 'Token重新生成成功',
    schema: {
      example: {
        code: 200,
        data: {
          token: 'bot_m5x3k9_new1token2here3',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  async regenerateToken(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { user_id } = req.payload;
    return this.botService.regenerateToken(id, user_id);
  }

  // ==================== Bot API (Token认证) ====================

  @Get('info')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: '获取Bot信息',
    description: `获取当前Bot的详细信息。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**返回内容：**
- Bot基本信息
- 配置参数
- 使用统计`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          id: 1,
          bot_name: 'My Bot',
          bot_username: 'my_bot',
          bot_avatar: '/avatars/bot.png',
          bot_description: '一个聊天Bot',
          status: 1,
          rate_limit: 60,
          music_cooldown: 8,
          allowed_rooms: [888, 999],
          webhook_configured: false,
          last_active_at: '2026-02-06T10:00:00.000Z',
          total_requests: 1234,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token无效或已过期' })
  async getBotInfo(@Req() req) {
    return this.botService.getBotInfo(req.bot);
  }

  @Post('sendMessage')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot发送消息',
    description: `向指定房间发送消息。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**消息类型支持：**
| 类型 | message_content 格式 |
|------|----------------------|
| text | 纯文本字符串 |
| img  | \`{ url: "图片URL" }\` |

**特性：**
- 自动敏感词过滤
- 消息实时推送到房间所有用户
- 消息自动标记为Bot发送

**速率限制：**
- 默认每分钟60次请求
- 超限返回 429 状态码

**cURL示例：**
\`\`\`bash
curl -X POST http://localhost:5000/api/bot/sendMessage \\
  -H "X-Bot-Token: bot_xxx_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "room_id": 888,
    "message_type": "text",
    "message_content": "Hello from Bot!"
  }'
\`\`\``,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '消息发送成功',
    schema: {
      example: {
        code: 200,
        data: {
          message_id: 18,
          success: true,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  @ApiResponse({ status: 429, description: '请求频率超限' })
  async sendMessage(@Req() req, @Body() params: BotSendMessageDto) {
    return this.botService.sendMessage(req.bot, params);
  }

  @Post('chooseMusic')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot点歌',
    description: `向指定房间点歌。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**音源支持：**
- \`kugou\` - 酷狗音乐 (默认)
- \`netease\` - 网易云音乐

**获取歌曲ID：**
调用 \`/api/music/search\` 搜索歌曲，使用返回的 \`music_mid\` 作为歌曲ID

**冷却时间：**
- 默认8秒点歌冷却
- 可在Bot设置中调整

**cURL示例：**
\`\`\`bash
curl -X POST http://localhost:5000/api/bot/chooseMusic \\
  -H "X-Bot-Token: bot_xxx_xxx" \\
  -H "Content-Type: application/json" \\
  -d '{
    "room_id": 888,
    "music_mid": "E2C4039A49F514784862D05C7C0F3D0E",
    "source": "kugou"
  }'
\`\`\``,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '点歌成功',
    schema: {
      example: {
        code: 200,
        data: {
          success: true,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  @ApiResponse({ status: 429, description: '点歌冷却中' })
  async chooseMusic(@Req() req, @Body() params: BotChooseMusicDto) {
    return this.botService.chooseMusic(req.bot, params);
  }

  @Get('getMessages')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: '获取消息历史',
    description: `获取指定房间的消息历史记录。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**分页参数：**
- \`page\` - 页码，默认1
- \`pagesize\` - 每页数量，默认20，最大100

**返回内容：**
- 消息ID、类型、内容
- 发送时间

**房间权限：**
只能获取Bot有权限访问的房间消息

**cURL示例：**
\`\`\`bash
curl "http://localhost:5000/api/bot/getMessages?room_id=888&page=1&pagesize=20" \\
  -H "X-Bot-Token: bot_xxx_xxx"
\`\`\``,
  })
  @ApiSecurity('Bot-auth')
  @ApiQuery({ name: 'room_id', description: '房间ID', example: 888, required: true })
  @ApiQuery({ name: 'page', description: '页码', example: 1, required: false })
  @ApiQuery({ name: 'pagesize', description: '每页数量 (最大100)', example: 20, required: false })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          messages: [
            {
              id: 123,
              message_type: 'text',
              message_content: 'Hello!',
              user_id: 1,
              room_id: 888,
              message_status: 1,
              createdAt: '2026-02-06T10:00:00.000Z',
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
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  async getMessages(@Req() req, @Query() params: BotGetMessagesDto) {
    const queryParams = {
      room_id: Number(params.room_id),
      page: params.page ? Number(params.page) : 1,
      pagesize: params.pagesize ? Number(params.pagesize) : 20,
    };
    return this.botService.getMessages(req.bot, queryParams);
  }

  @Get('getRoomInfo')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: '获取房间信息',
    description: `获取指定房间的基本信息。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**返回内容：**
- 房间ID
- Bot访问权限状态

**cURL示例：**
\`\`\`bash
curl "http://localhost:5000/api/bot/getRoomInfo?room_id=888" \\
  -H "X-Bot-Token: bot_xxx_xxx"
\`\`\``,
  })
  @ApiSecurity('Bot-auth')
  @ApiQuery({ name: 'room_id', description: '房间ID', example: 888, required: true })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          room_id: 888,
          bot_has_access: true,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  async getRoomInfo(@Req() req, @Query('room_id', ParseIntPipe) roomId: number) {
    if (!this.botService.checkRoomAccess(req.bot, roomId)) {
      return { error: 'Bot没有权限访问此房间' };
    }
    return { room_id: roomId, bot_has_access: true };
  }

  // ==================== Admin 审批管理 API ====================

  @Get('admin/pending')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] 获取待审批Bot列表',
    description: '获取所有等待审批的Bot列表，仅管理员可用',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pagesize', required: false, example: 20 })
  async adminGetPendingBots(@Req() req, @Query('page') page = 1, @Query('pagesize') pagesize = 20) {
    return this.botService.adminGetPendingBots(+page, +pagesize);
  }

  @Get('admin/all')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] 获取所有Bot列表',
    description: '获取所有Bot列表，支持按审批状态筛选',
  })
  @ApiQuery({ name: 'page', required: false, example: 1 })
  @ApiQuery({ name: 'pagesize', required: false, example: 20 })
  @ApiQuery({ name: 'approval_status', required: false, enum: ['pending', 'approved', 'rejected', 'suspended'] })
  async adminGetAllBots(
    @Req() req,
    @Query('page') page = 1,
    @Query('pagesize') pagesize = 20,
    @Query('approval_status') approvalStatus?: string,
  ) {
    return this.botService.adminGetAllBots(+page, +pagesize, { approval_status: approvalStatus });
  }

  @Post('admin/:id/approve')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] 审批通过Bot',
    description: '将Bot状态改为已审批，允许其使用API',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  async adminApproveBot(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { user_id } = req.payload;
    return this.botService.adminApproveBot(id, user_id);
  }

  @Post('admin/:id/reject')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] 拒绝Bot申请',
    description: '拒绝Bot申请，需提供拒绝原因',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  async adminRejectBot(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() params: BotRejectDto) {
    const { user_id } = req.payload;
    return this.botService.adminRejectBot(id, user_id, params.reason || '未说明原因');
  }

  @Post('admin/:id/suspend')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] 暂停Bot',
    description: '暂停已通过审批的Bot，需提供暂停原因',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  async adminSuspendBot(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() params: BotSuspendDto) {
    const { user_id } = req.payload;
    return this.botService.adminSuspendBot(id, user_id, params.reason || '违规操作');
  }

  @Put('admin/:id/permissions')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '[Admin] 更新Bot权限',
    description: '更新Bot的权限配置',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  async adminUpdatePermissions(@Param('id', ParseIntPipe) id: number, @Body() permissions: BotPermissionsDto) {
    return this.botService.adminUpdateBotPermissions(id, permissions);
  }

  // ==================== 共享管理权 API ====================

  @Post(':id/managers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '添加Bot管理员',
    description: '授权其他用户管理此Bot (仅Owner可操作)',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  async addBotManager(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() params: AddBotManagerDto) {
    const { user_id } = req.payload;
    return this.botService.addBotManager(id, user_id, params.user_id, params.role || 'operator', params.note);
  }

  @Get(':id/managers')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取Bot管理员列表',
    description: '获取此Bot的所有管理员 (仅Owner可查看)',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  async getBotManagers(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { user_id } = req.payload;
    return this.botService.getBotManagers(id, user_id);
  }

  @Delete(':id/managers/:userId')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '移除Bot管理员',
    description: '撤销用户的Bot管理权限 (仅Owner可操作)',
  })
  @ApiParam({ name: 'id', description: 'Bot ID' })
  @ApiParam({ name: 'userId', description: '要移除的用户ID' })
  async removeBotManager(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    const { user_id } = req.payload;
    await this.botService.removeBotManager(id, user_id, targetUserId);
    return { message: '已移除管理员' };
  }
}
