import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { UserEntity } from '../user/user.entity';
import { RoomEntity } from '../chat/room.entity';
import { RoomModeratorEntity } from '../chat/room-moderator.entity';
import { MessageEntity } from '../chat/message.entity';
import { MusicEntity } from '../music/music.entity';
import { CollectEntity } from '../music/collect.entity';
import { AnnouncementEntity } from './announcement.entity';
import { OperationLogEntity } from './operation-log.entity';
import { SensitiveWordEntity } from './sensitive-word.entity';
import { FeedbackEntity } from './feedback.entity';
import { InviteCodeEntity } from './invite-code.entity';
import { IpBlacklistEntity } from './ip-blacklist.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      UserEntity,
      RoomEntity,
      RoomModeratorEntity,
      MessageEntity,
      MusicEntity,
      CollectEntity,
      AnnouncementEntity,
      OperationLogEntity,
      SensitiveWordEntity,
      FeedbackEntity,
      InviteCodeEntity,
      IpBlacklistEntity,
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService],
  exports: [AdminService],
})
export class AdminModule {}
