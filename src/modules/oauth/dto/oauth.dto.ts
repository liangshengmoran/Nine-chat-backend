import { ApiProperty } from '@nestjs/swagger';
import { IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class OAuthProviderParam {
  @ApiProperty({
    description: 'OAuth 提供商',
    example: 'github',
    enum: ['github', 'google'],
  })
  @IsIn(['github', 'google'], { message: '不支持的 OAuth 提供商' })
  provider: string;
}

export class OAuthCallbackQuery {
  @ApiProperty({ description: '授权码', example: 'abc123' })
  @IsString()
  @IsNotEmpty({ message: '授权码不能为空' })
  code: string;

  @ApiProperty({ description: '状态参数', required: false })
  @IsOptional()
  @IsString()
  state?: string;
}
