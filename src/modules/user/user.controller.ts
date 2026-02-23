import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { UserService } from './user.service';
import { Body, Controller, Post, Request, Get, Query } from '@nestjs/common';
import { UserRegisterDto } from './dto/register.user.dto';
import { UserLoginDto } from './dto/login.user.dto';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { UserQueryDto, UserUpdateDto } from './dto/user.dto';

@Controller('/user')
@ApiTags('User')
export class UserController {
  constructor(private readonly userService: UserService) {}

  @Post('/register')
  @ApiOperation({
    summary: '用户注册',
    description: `注册新用户账号。

**必填字段：**
- \`user_name\` — 登录用户名（全局唯一，2-20字符）
- \`user_nick\` — 显示昵称
- \`user_password\` — 登录密码（6-20字符，以 MD5 加密存储）
- \`user_email\` — 邮箱地址

**注册成功后：**
- 自动签发 JWT Token（有效期 7 天）
- 返回用户信息和 Token
- 默认角色为 \`user\`

**注意事项：**
- 用户名不可修改，请谨慎选择
- 用户名已存在时返回 400`,
  })
  @ApiResponse({
    status: 200,
    description: '注册成功',
    schema: {
      example: {
        code: 200,
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          userInfo: {
            user_id: 1,
            user_name: 'testuser',
            user_nick: '测试用户',
            user_avatar: '/default_avatar.png',
            user_email: 'test@example.com',
            user_role: 'user',
          },
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '参数验证失败或用户名已存在' })
  register(@Body() params: UserRegisterDto) {
    return this.userService.register(params);
  }

  @Post('/login')
  @ApiOperation({
    summary: '用户登录',
    description: `使用用户名和密码进行身份认证。

**登录成功后：**
- 返回 JWT Token（有效期 7 天）
- 返回用户基本信息

**Token使用方式：**
在后续请求的 Header 中携带：
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**错误场景：**
- 用户名不存在 → 401
- 密码错误 → 401
- 账号被封禁 → 403`,
  })
  @ApiResponse({
    status: 200,
    description: '登录成功',
    schema: {
      example: {
        code: 200,
        data: {
          token: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...',
          userInfo: {
            user_id: 1,
            user_name: 'testuser',
            user_nick: '测试用户',
            user_avatar: '/default_avatar.png',
            user_role: 'user',
          },
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: '用户名或密码错误' })
  login(@Body() params: UserLoginDto) {
    return this.userService.login(params);
  }

  @Get('/getInfo')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '获取当前用户信息',
    description: `根据请求头中的 JWT Token 解析当前用户身份，返回完整的用户资料。

**返回字段：**
- 基本信息：用户ID、用户名、昵称、头像、邮箱
- 角色信息：user / admin / super
- 个人信息：签名、所在房间ID
- 时间信息：注册时间

**使用场景：**
- 前端初始化时获取当前用户信息
- 页面刷新后恢复用户状态`,
  })
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
          user_avatar: '/avatars/user1.png',
          user_email: 'test@example.com',
          user_role: 'user',
          user_sign: '这是签名',
          user_room_id: 888,
          createdAt: '2026-01-01T00:00:00.000Z',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 401, description: '未授权，Token 无效或已过期' })
  queryInfo(@Request() req) {
    return this.userService.getInfo(req.payload);
  }

  @Get('/query')
  @ApiOperation({
    summary: '查询用户信息',
    description: `根据用户 ID 查询指定用户的**公开信息**（无需认证）。

**返回内容（仅公开字段）：**
- 用户ID、昵称、头像、签名、角色
- 不包含：用户名、密码、邮箱等隐私字段

**使用场景：**
- 查看其他用户的个人主页
- 消息列表中显示发送者信息`,
  })
  @ApiResponse({
    status: 200,
    description: '查询成功',
    schema: {
      example: {
        code: 200,
        data: {
          user_id: 1,
          user_nick: '测试用户',
          user_avatar: '/avatars/user1.png',
          user_sign: '这是签名',
          user_role: 'user',
        },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 404, description: '用户不存在' })
  query(@Query() params: UserQueryDto) {
    return this.userService.query(params);
  }

  @Post('/update')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '更新用户信息',
    description: `更新当前登录用户的个人资料。

**可更新字段：**
- \`user_nick\` — 昵称（最多20字符）
- \`user_avatar\` — 头像 URL
- \`user_sign\` — 个性签名（最多100字符）

**注意事项：**
- 只需传入需要修改的字段
- 用户名(user_name)不可通过此接口修改
- 需要 JWT 认证`,
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
  update(@Request() req, @Body() params: UserUpdateDto) {
    return this.userService.update(req.payload, params);
  }

  @Post('/changePassword')
  @ApiBearerAuth('JWT-auth')
  @ApiOperation({
    summary: '修改密码',
    description: `修改当前登录用户的密码。

**请求要求：**
- 必须提供正确的原密码（\`oldPassword\`）进行验证
- 新密码长度 6-20 字符

**安全说明：**
- 修改成功后现有 Token 仍然有效
- 密码以 MD5 加密存储
- 错误的原密码返回 400`,
  })
  @ApiResponse({
    status: 200,
    description: '修改成功',
    schema: {
      example: {
        code: 200,
        data: { success: true },
        success: true,
        message: '请求成功',
      },
    },
  })
  @ApiResponse({ status: 400, description: '原密码错误或新密码不符合要求' })
  @ApiResponse({ status: 401, description: '未授权' })
  changePassword(@Request() req, @Body() params: ChangePasswordDto) {
    return this.userService.changePassword(req.payload, params);
  }
}
