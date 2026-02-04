import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MinLength, MaxLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: '123456', description: '原密码' })
  @IsNotEmpty({ message: '原密码不能为空' })
  @IsString()
  old_password: string;

  @ApiProperty({ example: '654321', description: '新密码（6-20位）' })
  @IsNotEmpty({ message: '新密码不能为空' })
  @IsString()
  @MinLength(6, { message: '密码长度不能小于6位' })
  @MaxLength(20, { message: '密码长度不能大于20位' })
  new_password: string;
}
