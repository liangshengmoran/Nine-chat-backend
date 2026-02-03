import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional } from 'class-validator';

export class collectMusicDto {
  @ApiProperty({ example: 'abc123hash', description: '歌曲唯一标识 (酷狗hash/网易云id)', required: true })
  @IsNotEmpty({ message: 'music_mid不能为空' })
  music_mid: string;

  @ApiProperty({ example: '晴天', description: '歌曲名称', required: true })
  @IsNotEmpty({ message: '歌曲名称不能为空' })
  music_name: string;

  @ApiProperty({ example: '周杰伦', description: '歌手', required: true })
  @IsNotEmpty({ message: '歌手不能为空' })
  music_singer: string;

  @ApiProperty({ example: '叶惠美', description: '专辑名称', required: false })
  @IsOptional()
  music_album?: string;

  @ApiProperty({ example: 'https://example.com/cover.jpg', description: '封面图片', required: false })
  @IsOptional()
  music_cover?: string;

  @ApiProperty({ example: 'kugou', description: '音源: kugou / netease', required: false, default: 'kugou' })
  @IsOptional()
  source?: string;
}

export class removeCollectDto {
  @ApiProperty({ example: 'abc123hash', description: '歌曲唯一标识', required: true })
  @IsNotEmpty({ message: 'music_mid不能为空' })
  music_mid: string;
}

export class collectListDto {
  @ApiProperty({ example: 1, description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 30, description: '每页数量', required: false, default: 30 })
  @IsOptional()
  pagesize?: number;
}

export class hotDto {
  @ApiProperty({ example: 1, description: '页码', required: false, default: 1 })
  @IsOptional()
  page?: number;

  @ApiProperty({ example: 30, description: '每页数量', required: false, default: 30 })
  @IsOptional()
  pagesize?: number;

  @ApiProperty({ example: 1, description: '用户ID (用于获取该用户收藏)', required: false })
  @IsOptional()
  user_id?: number;
}
