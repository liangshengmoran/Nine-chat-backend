import { ApiProperty } from '@nestjs/swagger';

export class searchDto {
  @ApiProperty({ example: '孤城', description: '关键词', required: false })
  keyword: string;

  @ApiProperty({ example: 1, description: '页码', required: false })
  page: number;

  @ApiProperty({ example: 10, description: '单页数量', required: false })
  pagesize: number;

  @ApiProperty({ example: 'kugou', description: '音源: kugou(默认) / netease', required: false })
  source: string;
}
