import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  ParseIntPipe,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiQuery, ApiParam, ApiSecurity } from '@nestjs/swagger';
import { BotService } from './bot.service';
import { BotGuard } from 'src/guard/bot.guard';
import { AuthGuard } from '../../guard/auth.guard';
import {
  CreateBotDto,
  UpdateBotDto,
  BotSendMessageDto,
  BotChooseMusicDto,
  BotGetMessagesDto,
  BotEditMessageDto,
  BotDeleteMessageDto,
  BotChatActionDto,
  BotRegisterCommandsDto,
  BotGetUpdatesDto,
  BotAnswerCallbackDto,
  BotPinMessageDto,
  BotScheduleMessageDto,
  BotSendDocumentDto,
} from './dto/bot.dto';
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

  // ==================== Bot 消息操作 API (Token认证) ====================
  // 注意: 命名路由必须在通配符 :id 路由之前定义

  @Put('editMessage')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot编辑消息',
    description: `编辑Bot之前发送的消息。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**限制：**
- Bot只能编辑自己发送的消息`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '编辑成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, message_id: 123 },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot只能编辑自己发送的消息' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async editMessage(@Req() req, @Body() params: BotEditMessageDto) {
    return this.botService.editMessage(req.bot, params);
  }

  @Delete('deleteMessage')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot撤回消息',
    description: `撤回Bot之前发送的消息。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**限制：**
- Bot只能撤回自己发送的消息`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '撤回成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, message_id: 123 },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot只能撤回自己发送的消息' })
  @ApiResponse({ status: 404, description: '消息不存在' })
  async deleteMessage(@Req() req, @Body() params: BotDeleteMessageDto) {
    return this.botService.deleteMessage(req.bot, params);
  }

  // ==================== Bot CRUD API (JWT认证) ====================

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
  @ApiResponse({ status: 403, description: '无权限操作此Bot' })
  @ApiResponse({ status: 404, description: 'Bot不存在' })
  async deleteBot(@Req() req, @Param('id', ParseIntPipe) id: number) {
    const { user_id } = req.payload;
    return this.botService.deleteBot(id, user_id);
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

  @Post(':id/commands')
  @UseGuards(AuthGuard)
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '注册Bot命令',
    description: `为Bot注册可响应的命令列表。

**命令格式：**
- 只允许小写字母、数字、下划线
- 最多32个字符
- 例: \`help\`, \`play_music\`, \`weather\`

**工作原理：**
当用户在房间发送 \`/命令名 参数\` 时，系统会自动通过 Webhook 推送 \`command\` 事件给Bot`,
  })
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '命令注册成功',
    schema: {
      example: {
        code: 200,
        data: { success: true, count: 3 },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '命令格式错误' })
  async registerCommands(@Req() req, @Param('id', ParseIntPipe) id: number, @Body() params: BotRegisterCommandsDto) {
    const { user_id } = req.payload;
    return this.botService.registerCommands(id, user_id, params.commands);
  }

  @Get(':id/commands')
  @ApiOperation({
    summary: '获取Bot命令列表',
    description: '获取指定Bot已注册的命令列表',
  })
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          { command: 'help', description: '获取帮助信息' },
          { command: 'play', description: '播放音乐' },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  async getCommands(@Param('id', ParseIntPipe) id: number) {
    return this.botService.getCommands(id);
  }

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
      throw new HttpException('Bot没有权限访问此房间', HttpStatus.FORBIDDEN);
    }
    return { room_id: roomId, bot_has_access: true };
  }

  // ==================== Bot 消息操作 API (Token认证) ====================

  @Post('sendChatAction')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot发送聊天动作',
    description: `向房间广播Bot的动作状态，如"正在输入"。

**认证方式（二选一）：**
\`\`\`
X-Bot-Token: <token>
Authorization: Bot <token>
\`\`\`

**支持的动作类型：**
- \`typing\` - 正在输入`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '发送成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  async sendChatAction(@Req() req, @Body() params: BotChatActionDto) {
    return this.botService.sendChatAction(req.bot, params);
  }

  // ==================== Phase 2: getUpdates / Inline Keyboard / Pin ====================

  @Get('getUpdates')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot获取更新 (长轮询)',
    description: `通过长轮询方式获取发给Bot的事件。

**与 Webhook 互斥：**
- 如果配置了 Webhook，将无法使用此接口
- 移除 Webhook 配置后可使用

**长轮询模式：**
- 设置 \`timeout\` 参数 (单位:秒) 实现长轮询
- 服务器会保持连接直到有新事件或超时

**事件类型：**
- \`message\` - 新消息
- \`command\` - 命令触发
- \`callback_query\` - 用户点击按钮`,
  })
  @ApiSecurity('Bot-auth')
  @ApiQuery({ name: 'offset', required: false, example: 0, description: '获取此offset之后的更新' })
  @ApiQuery({ name: 'limit', required: false, example: 20, description: '最大返回数量' })
  @ApiQuery({ name: 'timeout', required: false, example: 30, description: '长轮询超时(秒)' })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          updates: [
            {
              update_id: 1,
              type: 'message',
              message: { id: 123, room_id: 888, message_content: 'Hello' },
            },
          ],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 409, description: '已配置Webhook，不能同时使用getUpdates' })
  async getUpdates(@Req() req, @Query() params: BotGetUpdatesDto) {
    return this.botService.getUpdates(req.bot, params);
  }

  @Post('answerCallbackQuery')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot回应按钮回调',
    description: `当用户点击 Inline Keyboard 按钮后，Bot响应该回调。

**callback_query_id 格式：**
\`cb_<房间ID>_<时间戳>\`

**响应方式：**
- \`text\`: 提示文本 (顶部通知或弹窗)
- \`show_alert\`: 是否以弹窗显示`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '回应成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: 'Token无效' })
  async answerCallbackQuery(@Req() req, @Body() params: BotAnswerCallbackDto) {
    return this.botService.answerCallbackQuery(req.bot, params);
  }

  @Post('pinMessage')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot置顶消息',
    description: `将指定消息置顶在房间。

**权限要求：**
- Bot需要 \`can_pin_message\` 权限`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '置顶成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有置顶消息的权限' })
  async pinMessage(@Req() req, @Body() params: BotPinMessageDto) {
    return this.botService.pinMessage(req.bot, params);
  }

  @Post('unpinMessage')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot取消置顶消息',
    description: `取消房间的置顶消息。

**权限要求：**
- Bot需要 \`can_pin_message\` 权限`,
  })
  @ApiSecurity('Bot-auth')
  @ApiQuery({ name: 'room_id', required: true, example: 888 })
  @ApiResponse({
    status: 200,
    description: '取消置顶成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有置顶消息的权限' })
  async unpinMessage(@Req() req, @Query('room_id', ParseIntPipe) roomId: number) {
    return this.botService.unpinMessage(req.bot, roomId);
  }

  // ==================== Phase 3: Markdown / File / Schedule ====================

  @Get('getRoomMembers')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot获取房间在线成员',
    description: '获取指定房间的在线成员列表',
  })
  @ApiSecurity('Bot-auth')
  @ApiQuery({ name: 'room_id', required: true, example: 888 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          { user_id: 1, user_nick: '用户1', user_avatar: '/avatars/1.png' },
          { user_id: 2, user_nick: '用户2', user_avatar: '/avatars/2.png' },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  async getRoomMembers(@Req() req, @Query('room_id', ParseIntPipe) roomId: number) {
    return this.botService.getRoomMembers(req.bot, roomId);
  }

  @Post('sendDocument')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot发送文件消息',
    description: `发送文件消息到房间。

**支持的文件类型：**
- 文档 (PDF, DOC, TXT 等)
- 图片
- 音频/视频`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '发送成功',
    schema: {
      example: {
        code: 200,
        data: { message_id: 42, success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  async sendDocument(@Req() req, @Body() params: BotSendDocumentDto) {
    return this.botService.sendDocument(req.bot, params);
  }

  @Post('scheduleMessage')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot创建定时消息',
    description: `创建定时或周期性消息。

**重复模式：**
- \`once\` - 单次发送
- \`daily\` - 每天同一时间
- \`weekly\` - 每周同一时间`,
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: {
      example: {
        code: 200,
        data: {
          success: true,
          scheduled_id: 1,
          next_send_at: '2026-02-14T08:00:00.000Z',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '发送时间必须在将来' })
  @ApiResponse({ status: 403, description: 'Bot没有权限访问此房间' })
  async scheduleMessage(@Req() req, @Body() params: BotScheduleMessageDto) {
    return this.botService.scheduleMessage(req.bot, params);
  }

  @Delete('scheduleMessage/:id')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot取消定时消息',
    description: '取消指定的定时消息',
  })
  @ApiSecurity('Bot-auth')
  @ApiParam({ name: 'id', description: '定时消息ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '取消成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '定时消息不存在' })
  async cancelScheduledMessage(@Req() req, @Param('id', ParseIntPipe) id: number) {
    return this.botService.cancelScheduledMessage(req.bot, id);
  }

  @Get('getScheduledMessages')
  @UseGuards(BotGuard)
  @ApiOperation({
    summary: 'Bot获取定时消息列表',
    description: '获取Bot所有活跃的定时消息',
  })
  @ApiSecurity('Bot-auth')
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            id: 1,
            room_id: 888,
            message_type: 'text',
            message_content: '每日提醒',
            repeat: 'daily',
            next_send_at: '2026-02-14T08:00:00.000Z',
            status: 1,
            sent_count: 5,
          },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  async getScheduledMessages(@Req() req) {
    return this.botService.getScheduledMessages(req.bot);
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: { list: [{ id: 1, bot_name: 'New Bot', approval_status: 'pending' }], total: 3, page: 1, pagesize: 20 },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: { list: [{ id: 1, bot_name: 'Bot', approval_status: 'approved' }], total: 10, page: 1, pagesize: 20 },
        success: true,
        message: '请求成功',
      },
    },
  })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '审批通过',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 404, description: 'Bot不存在' })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '拒绝成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 404, description: 'Bot不存在' })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '暂停成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '权限更新成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 404, description: 'Bot不存在' })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '添加成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 403, description: '无权限操作' })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [{ user_id: 2, user_nick: '小王', role: 'operator', note: '运营人员' }],
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 403, description: '无权限查看' })
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
  @ApiParam({ name: 'id', description: 'Bot ID', example: 1 })
  @ApiParam({ name: 'userId', description: '要移除的用户ID', example: 2 })
  @ApiResponse({
    status: 200,
    description: '移除成功',
    schema: { example: { code: 200, data: { success: true }, success: true, message: '请求成功' } },
  })
  @ApiResponse({ status: 403, description: '无权限操作' })
  async removeBotManager(
    @Req() req,
    @Param('id', ParseIntPipe) id: number,
    @Param('userId', ParseIntPipe) targetUserId: number,
  ) {
    const { user_id } = req.payload;
    return this.botService.removeBotManager(id, user_id, targetUserId);
  }
}
