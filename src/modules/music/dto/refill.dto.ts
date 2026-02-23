import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsBoolean, IsArray, IsString } from 'class-validator';

/**
 * 曲库填充 DTO — 通过搜索关键词批量添加歌曲（调试接口）
 */
export class RefillMusicDto {
  @ApiPropertyOptional({
    description: '用于搜索歌曲的关键词数组（不填则使用默认热门关键词：热门、流行、经典等）',
    type: [String],
    example: ['周杰伦', '陈奕迅', '林俊杰'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  keywords?: string[];

  @ApiPropertyOptional({
    description: '每个关键词搜索返回的歌曲数量',
    default: 10,
    example: 10,
  })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiPropertyOptional({
    description: '是否清空现有曲库后再填充（⚠️ 谨慎使用，会删除所有已有歌曲）',
    default: false,
    example: false,
  })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;
}
