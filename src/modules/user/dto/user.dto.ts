import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';
import { Type } from 'class-transformer';

export class UserQueryDto {
  @ApiProperty({
    description: '要查询的用户ID',
    example: 1,
  })
  @IsNotEmpty({ message: 'user_id 不能为空' })
  @Type(() => Number)
  user_id: number;
}

export class UserUpdateDto {
  @ApiPropertyOptional({
    description: '新的昵称（最多20字符）',
    example: '新昵称',
    maxLength: 20,
  })
  @IsOptional()
  @IsString()
  @MaxLength(20)
  user_nick?: string;

  @ApiPropertyOptional({
    description: '个性签名（最多100字符）',
    example: '这是我的个性签名~',
    maxLength: 100,
  })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  user_sign?: string;

  @ApiPropertyOptional({
    description: '头像 URL',
    example: '/uploads/avatars/user1.png',
  })
  @IsOptional()
  @IsString()
  user_avatar?: string;
}
