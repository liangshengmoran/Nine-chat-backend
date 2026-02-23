import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 聊天历史查询 DTO
 */
export class HistoryDto {
  @ApiProperty({
    description: '房间ID',
    example: 888,
  })
  @IsNotEmpty({ message: '房间ID不能为空' })
  @Type(() => Number)
  room_id: number;

  @ApiPropertyOptional({
    description: '页码（从 1 开始），按消息时间倒序分页',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页消息数量',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}
