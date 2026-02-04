import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Body, Controller, Post, Request, Get, Query } from '@nestjs/common';
import { UserRegisterDto } from './dto/register.user.dto';
import { UserLoginDto } from './dto/login.user.dto';
import { ChangePasswordDto } from './dto/changePassword.dto';

@Controller('/user')
@ApiTags('User')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/register')
  @ApiOperation({
    summary: '用户注册',
    description: '注册新用户账号，需要提供用户名、昵称、密码、邮箱等信息',
  })
  @ApiResponse({ status: 200, description: '注册成功' })
  @ApiResponse({ status: 400, description: '参数验证失败' })
  register(@Body() params: UserRegisterDto) {
    return this.userService.register(params);
  }

  @Post('/login')
  @ApiOperation({
    summary: '用户登录',
    description: '使用用户名和密码登录，返回 JWT Token',
  })
  @ApiResponse({ status: 200, description: '登录成功，返回 token' })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  login(@Body() params: UserLoginDto) {
    return this.userService.login(params);
  }

  @Get('/getInfo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: '根据 Token 获取当前登录用户的详细信息',
  })
  @ApiResponse({ status: 200, description: '获取成功' })
  @ApiResponse({ status: 401, description: '未授权，Token 无效或已过期' })
  queryInfo(@Request() req) {
    return this.userService.getInfo(req.payload);
  }

  @Get('/query')
  @ApiOperation({
    summary: '查询用户信息',
    description: '根据用户 ID 查询指定用户的公开信息',
  })
  @ApiResponse({ status: 200, description: '查询成功' })
  query(@Query() params) {
    return this.userService.query(params);
  }

  @Post('/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新用户信息',
    description: '更新当前登录用户的个人资料，如昵称、头像、签名等',
  })
  @ApiResponse({ status: 200, description: '更新成功' })
  @ApiResponse({ status: 401, description: '未授权' })
  update(@Request() req, @Body() params) {
    return this.userService.update(req.payload, params);
  }

  @Post('/changePassword')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '修改密码',
    description: '用户修改自己的登录密码，需要提供原密码验证',
  })
  @ApiResponse({ status: 200, description: '修改成功' })
  @ApiResponse({ status: 400, description: '原密码错误或新密码不符合要求' })
  @ApiResponse({ status: 401, description: '未授权' })
  changePassword(@Request() req, @Body() params: ChangePasswordDto) {
    return this.userService.changePassword(req.payload, params);
  }
}
