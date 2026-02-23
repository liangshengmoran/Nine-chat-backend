import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 歌曲搜索 DTO
 */
export class searchDto {
  @ApiProperty({
    description: '搜索关键词（歌名、歌手名或专辑名）',
    example: '周杰伦',
  })
  @IsNotEmpty({ message: '关键词不能为空' })
  @IsString()
  keyword: string;

  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页返回歌曲数量',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiPropertyOptional({
    description: '音源平台：kugou=酷狗音乐（默认），netease=网易云音乐',
    default: 'kugou',
    example: 'kugou',
    enum: ['kugou', 'netease'],
  })
  @IsOptional()
  @IsString()
  source?: string;
}
