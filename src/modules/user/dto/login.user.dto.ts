import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class UserLoginDto {
  @ApiProperty({
    description: '用户名（注册时设置的登录名）',
    example: 'testuser',
  })
  @IsNotEmpty({ message: '用户名不能为空' })
  @IsString()
  user_name: string;

  @ApiProperty({
    description: '登录密码（6-20位）',
    example: 'password123',
    minLength: 6,
    maxLength: 20,
  })
  @IsNotEmpty({ message: '密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码长度不能小于6' })
  @MaxLength(20, { message: '密码长度不能超过20' })
  user_password: string;
}
