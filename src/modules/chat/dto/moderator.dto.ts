import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class AddModeratorDto {
  @ApiProperty({ example: 888, description: '房间 ID' })
  @IsNotEmpty({ message: '房间 ID 不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiProperty({ example: 2, description: '被任命为房管的用户 ID' })
  @IsNotEmpty({ message: '用户 ID 不能为空' })
  @Type(() => Number)
  user_id: number;

  @ApiProperty({ example: '协助管理房间', description: '任命备注', required: false })
  @IsOptional()
  @IsString()
  remark?: string;
}

export class RemoveModeratorDto {
  @ApiProperty({ example: 888, description: '房间 ID' })
  @IsNotEmpty({ message: '房间 ID 不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiProperty({ example: 2, description: '要移除房管权限的用户 ID' })
  @IsNotEmpty({ message: '用户 ID 不能为空' })
  @Type(() => Number)
  user_id: number;
}

export class ModeratorListDto {
  @ApiProperty({ example: 888, description: '房间 ID' })
  @IsNotEmpty({ message: '房间 ID 不能为空' })
  @Type(() => Number)
  room_id: number;
}
