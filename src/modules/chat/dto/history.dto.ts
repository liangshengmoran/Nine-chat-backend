import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

export class HistoryDto {
  @ApiProperty({ example: 888, description: '房间 ID' })
  @IsNotEmpty({ message: '房间 ID 不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiProperty({ example: 1, description: '页码', required: false, default: 1 })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiProperty({ example: 10, description: '每页条数', required: false, default: 10 })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}
