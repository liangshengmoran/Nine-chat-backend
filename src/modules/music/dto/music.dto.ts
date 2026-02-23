import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';

/**
 * 收藏歌曲 DTO
 */
export class collectMusicDto {
  @ApiProperty({
    description: '歌曲唯一标识（酷狗为 hash 值，网易云为歌曲ID）',
    example: 'E2C4039A49F514784862D05C7C0F3D0E',
  })
  @IsNotEmpty({ message: '歌曲ID不能为空' })
  @IsString()
  music_mid: string;

  @ApiProperty({
    description: '歌曲名称',
    example: '晴天',
  })
  @IsNotEmpty({ message: '歌曲名称不能为空' })
  @IsString()
  music_name: string;

  @ApiProperty({
    description: '歌手名',
    example: '周杰伦',
  })
  @IsNotEmpty({ message: '歌手不能为空' })
  @IsString()
  music_singer: string;

  @ApiPropertyOptional({
    description: '专辑名称',
    example: '叶惠美',
  })
  @IsOptional()
  @IsString()
  music_album?: string;

  @ApiPropertyOptional({
    description: '封面图片 URL',
    example: 'https://imge.kugou.com/stdmusic/150/xxx.jpg',
  })
  @IsOptional()
  @IsString()
  music_cover?: string;

  @ApiPropertyOptional({
    description: '音源平台',
    default: 'kugou',
    example: 'kugou',
    enum: ['kugou', 'netease'],
  })
  @IsOptional()
  @IsString()
  source?: string;
}

/**
 * 取消收藏歌曲 DTO
 */
export class removeCollectDto {
  @ApiProperty({
    description: '要取消收藏的歌曲标识（酷狗 hash / 网易云歌曲ID）',
    example: 'E2C4039A49F514784862D05C7C0F3D0E',
  })
  @IsNotEmpty({ message: '歌曲标识不能为空' })
  @IsString()
  music_mid: string;
}

/**
 * 收藏列表查询 DTO
 */
export class collectListDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页返回数量',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;
}

/**
 * 热门歌曲查询 DTO
 */
export class hotDto {
  @ApiPropertyOptional({
    description: '页码（从 1 开始）',
    default: 1,
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    description: '每页返回数量',
    default: 30,
    example: 30,
  })
  @IsOptional()
  @Type(() => Number)
  pagesize?: number;

  @ApiPropertyOptional({
    description: '用户ID（可选，当热门歌曲为空时回退到该用户收藏列表）',
    example: 1,
  })
  @IsOptional()
  @Type(() => Number)
  user_id?: number;
}
