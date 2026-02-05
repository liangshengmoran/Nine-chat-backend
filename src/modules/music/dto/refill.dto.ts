import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsArray, IsNumber, IsBoolean } from 'class-validator';

export class RefillMusicDto {
  @ApiProperty({
    description: '搜索关键词数组',
    example: ['热门', '流行', '周杰伦'],
    required: false,
  })
  @IsOptional()
  @IsArray()
  keywords?: string[];

  @ApiProperty({
    description: '每个关键词获取的歌曲数量',
    example: 10,
    required: false,
    default: 10,
  })
  @IsOptional()
  @IsNumber()
  pageSize?: number;

  @ApiProperty({
    description: '是否清空现有曲库后再填充',
    example: false,
    required: false,
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  clearExisting?: boolean;
}
