import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { OAuthController } from './oauth.controller';
import { OAuthService } from './oauth.service';
import { OAuthAccountEntity } from './oauth.entity';
import { UserEntity } from '../user/user.entity';
import { expiresIn, secret } from 'src/config/jwt';

@Module({
  imports: [
    TypeOrmModule.forFeature([OAuthAccountEntity, UserEntity]),
    JwtModule.register({
      secret,
      signOptions: { expiresIn },
    }),
  ],
  controllers: [OAuthController],
  providers: [OAuthService],
  exports: [OAuthService],
})
export class OAuthModule {}
