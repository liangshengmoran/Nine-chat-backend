import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({
    description: '当前密码（需要验证旧密码才能修改）',
    example: 'oldPassword123',
  })
  @IsNotEmpty({ message: '原密码不能为空' })
  @IsString()
  oldPassword: string;

  @ApiProperty({
    description: '新密码（6-20位），不能与旧密码相同',
    example: 'newPassword456',
    minLength: 6,
    maxLength: 20,
  })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString()
  @MinLength(6, { message: '新密码长度不能小于6' })
  @MaxLength(20, { message: '新密码长度不能超过20' })
  newPassword: string;
}
