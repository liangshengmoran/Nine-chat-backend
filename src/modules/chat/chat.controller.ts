import { Controller, Post, Body, Get, Query, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse, ApiQuery } from '@nestjs/swagger';
import { ChatService } from './chat.service';
import { HistoryDto } from './dto/history.dto';

@ApiTags('Chat')
@Controller('chat')
export class ChatController {
  constructor(private readonly ChatService: ChatService) {}

  @Post('/history')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取聊天历史',
    description: '获取指定房间的聊天消息历史记录，支持分页',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  history(@Body() params: HistoryDto) {
    return this.ChatService.history(params);
  }

  @Get('/emoticon')
  @ApiOperation({
    summary: '搜索表情包',
    description: '根据关键词在线搜索表情包图片',
  })
  @ApiQuery({ name: 'keyword', required: true, description: '搜索关键词' })
  @ApiResponse({ status: 200, description: '搜索成功' })
  emoticon(@Query() params) {
    return this.ChatService.emoticon(params);
  }

  @Post('/createRoom')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '创建聊天房间',
    description: '创建用户个人聊天房间，可设置房间名称、密码等',
  })
  @ApiResponse({ status: 200, description: '创建成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  createRoom(@Body() params, @Request() req) {
    return this.ChatService.createRoom(params, req);
  }

  @Get('/roomInfo')
  @ApiOperation({
    summary: '获取房间信息',
    description: '根据房间 ID 获取房间详细信息',
  })
  @ApiQuery({ name: 'room_id', required: true, description: '房间 ID' })
  @ApiResponse({ status: 200, description: '获取成功' })
  roomInfo(@Query() params) {
    return this.ChatService.roomInfo(params);
  }

  @Post('/updateRoomInfo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新房间信息',
    description: '房主更新房间信息，如名称、公告、背景图等',
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  @ApiResponse({ status: 403, description: '无权限修改此房间' })
  updateRoomInfo(@Body() params, @Request() req) {
    return this.ChatService.updateRoomInfo(params, req.payload);
  }
}
