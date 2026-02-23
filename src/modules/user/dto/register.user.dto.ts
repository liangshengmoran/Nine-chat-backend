import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength, MinLength, IsEmail, IsOptional } from 'class-validator';

export class UserRegisterDto {
  @ApiProperty({
    description: '用户名（登录名，全局唯一）',
    example: 'testuser',
    minLength: 2,
    maxLength: 20,
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  @MinLength(2, { message: '用户名长度不能小于2' })
  @MaxLength(20, { message: '用户名长度不能超过20' })
  user_name: string;

  @ApiProperty({
    description: '用户昵称（显示名称，可修改）',
    example: '测试用户',
    maxLength: 20,
  })
  @IsNotEmpty({ message: '用户昵称不能为空' })
  @IsString()
  @MaxLength(20, { message: '用户昵称长度不能超过20' })
  user_nick: string;

  @ApiProperty({
    description: '登录密码，6-20位，注册后以 MD5 加密存储',
    example: 'password123',
    minLength: 6,
    maxLength: 20,
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码长度不能小于6' })
  @MaxLength(20, { message: '密码长度不能超过20' })
  user_password: string;

  @ApiProperty({
    description: '邮箱地址（用于找回密码等）',
    example: 'test@example.com',
  })
  @IsNotEmpty({ message: '邮箱不能为空' })
  @IsEmail({}, { message: '邮箱格式不正确' })
  user_email: string;

  @ApiPropertyOptional({
    description: '用户头像 URL（不填则使用系统默认头像）',
    example: '/uploads/avatars/user1.png',
  })
  @IsOptional()
  @IsString()
  user_avatar?: string;
}
