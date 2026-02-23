import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 专辑导入 DTO — 通过酷狗专辑ID批量添加歌曲到曲库
 */
export class addAlbumDto {
  @ApiProperty({
    description: '酷狗专辑ID（可从酷狗音乐网页版 URL 中获取）',
    example: '1645030',
  })
  @IsNotEmpty({ message: '专辑ID不能为空' })
  albumId: string;

  @ApiPropertyOptional({
    description: '获取的页码',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页歌曲数量（酷狗返回的歌曲数）',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  size?: number;
}
