import { Controller, Post, Body, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { HistoryDto } from './dto/history.dto';
import { CreateRoomDto, UpdateRoomInfoDto, ModeratorListDto } from './dto/chat.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly ChatService: ChatService) {}

  @Post('/history')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取聊天历史',
    description: `获取指定房间的聊天消息历史记录。

**排序方式：**
按消息发送时间**倒序**排列（最新的消息在前）

**分页参数：**
- \`room_id\` — 房间ID（必填）
- \`page\` — 页码，默认1
- \`pagesize\` — 每页数量，默认30

**返回内容：**
- 消息ID、发送者ID、房间ID
- 消息类型（text/img）、消息内容
- 内联键盘、@提及、解析模式
- 发送时间、消息状态

**消息状态说明：**
| 状态值 | 含义 |
|---------|------|
| 1 | 正常消息 |
| -1 | 用户删除 |
| -2 | 管理员删除 |`,
  })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: {
          messageArr: [
            {
              id: 123,
              user_id: 1,
              room_id: 888,
              message_type: 'text',
              message_content: 'Hello!',
              message_status: 1,
              reply_markup: null,
              mentions: null,
              parse_mode: null,
              createdAt: '2026-02-06T10:00:00.000Z',
            },
          ],
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权' })
  history(@Body() params: HistoryDto) {
    return this.ChatService.history(params);
  }

  @Get('/emoticon')
  @ApiOperation({
    summary: '搜索表情包',
    description: `根据关键词在线搜索表情包 GIF 图片。

**请求参数：**
- \`keyword\` — 搜索关键词（如“开心”、“再见”）

**返回内容：**
- 表情包图片 URL 数组
- URL 可直接用于 \`<img>\` 标签显示

**使用场景：**
前端聊天输入框的表情包搜索功能`,
  })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词', example: '开心' })
  @ApiResponse({
    status: 200,
    description: '搜索成功',
    schema: {
      example: {
        code: 200,
        data: ['https://example.com/emoticon1.gif', 'https://example.com/emoticon2.gif'],
        success: true,
        message: '请求成功',
      },
    },
  })
  emoticon(@Query() params) {
    return this.ChatService.emoticon(params);
  }

  @Post('/createRoom')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建聊天房间',
    description: `创建用户个人聊天房间。

**业务规则：**
- 每个用户只能创建 **1个** 聊天房间
- 已有房间时再次创建返回 400
- 创建者自动成为房主

**可设置项：**
- \`room_name\` — 房间名称（必填，最多20字符）
- \`room_password\` — 进入密码（可选，留空则无密码）
- \`room_notice\` — 房间公告（可选）`,
  })
  @ApiResponse({
    status: 200,
    description: '创建成功',
    schema: {
      example: {
        code: 200,
        data: {
          room_id: 1001,
          room_name: '我的聊天室',
          room_user_id: 1,
          room_need_password: 0,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '用户已有房间，不能重复创建' })
  @ApiResponse({ status: 401, description: '未授权' })
  createRoom(@Body() params: CreateRoomDto, @Request() req) {
    return this.ChatService.createRoom(params, req);
  }

  @Get('/roomInfo')
  @ApiOperation({
    summary: '获取房间信息',
    description: `根据房间 ID 获取房间详细信息（无需认证）。

**返回内容：**
- 房间基本信息：ID、名称、公告、背景图
- 房主信息：房主ID
- 密码状态：是否需要密码进入

**使用场景：**
- 进入房间前获取房间信息
- 房间列表页展示`,
  })
  @ApiQuery({ name: 'room_id', required: true, description: '房间 ID', example: 888 })
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
          room_user_id: 1,
          room_need_password: 0,
          room_bg: null,
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '房间不存在' })
  roomInfo(@Query() params) {
    return this.ChatService.roomInfo(params);
  }

  @Post('/updateRoomInfo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新房间信息',
    description: `房主更新房间信息。

**可修改字段：**
- \`room_name\` — 房间名称
- \`room_notice\` — 房间公告
- \`room_bg\` — 房间背景图 URL
- \`room_password\` — 房间密码(留空/null取消密码)

**权限要求：**
- 仅房主可操作
- 非房主调用返回 403`,
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
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限修改此房间' })
  updateRoomInfo(@Body() params: UpdateRoomInfoDto, @Request() req) {
    return this.ChatService.updateRoomInfo(params, req.payload);
  }

  // ==================== 房管查询 API ====================
  // 注：添加/移除房管已整合到 /api/admin/users/role

  @Get('/moderator/list')
  @ApiOperation({
    summary: '获取房管列表',
    description: `获取指定房间的所有房管列表（无需认证）。

**返回内容：**
- 房管的用户ID、昵称、头像

**使用场景：**
- 房间设置页展示房管列表
- 判断用户是否为房管`,
  })
  @ApiQuery({ name: 'room_id', required: true, description: '房间 ID', example: 888 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            user_id: 2,
            user_nick: '房管小王',
            user_avatar: '/avatars/user2.png',
          },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  getModeratorList(@Query() params: ModeratorListDto) {
    return this.ChatService.getModeratorList(params);
  }

  @Get('/botCommands')
  @ApiOperation({
    summary: '获取房间Bot命令列表',
    description: `获取指定房间内所有Bot注册的命令列表（无需认证）。

**返回内容：**
- 命令名称、命令描述
- Bot名称、Bot ID

**使用场景：**
- 前端聊天输入框中输入 \`/\` 时，弹出斜杠命令菜单
- 仅显示当前房间内可用的Bot命令`,
  })
  @ApiQuery({ name: 'room_id', required: true, description: '房间 ID', example: 888 })
  @ApiResponse({
    status: 200,
    description: '获取成功',
    schema: {
      example: {
        code: 200,
        data: [
          {
            command: 'help',
            description: '显示帮助信息',
            bot_name: '音乐小助手',
            bot_id: 1,
          },
        ],
        success: true,
        message: '请求成功',
      },
    },
  })
  getRoomBotCommands(@Query('room_id') room_id: number) {
    return this.ChatService.getRoomBotCommands(Number(room_id));
  }
}
