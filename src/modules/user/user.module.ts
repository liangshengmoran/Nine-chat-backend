import { UserEntity } from './user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { JwtModule } from '@nestjs/jwt';
import { expiresIn, secret } from 'src/config/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    PassportModule,
    TypeOrmModule.forFeature([UserEntity]),
    JwtModule.register({
      secret,
      signOptions: { expiresIn },
    }),
    AdminModule,
  ],
  controllers: [UserController],
  providers: [UserService],
})
export class UserModule {}
