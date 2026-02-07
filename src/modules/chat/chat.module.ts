import { RoomEntity } from './room.entity';
import { RoomModeratorEntity } from './room-moderator.entity';
import { MusicEntity } from './../music/music.entity';
import { MessageEntity } from './message.entity';
import { UserEntity } from './../user/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WsChatGateway } from './chat.getaway';
import { Module, forwardRef } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatService } from './chat.service';
import { AdminModule } from '../admin/admin.module';
import { BotModule } from '../bot/bot.module';
import { BotEntity } from '../bot/bot.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([UserEntity, MessageEntity, MusicEntity, RoomEntity, RoomModeratorEntity, BotEntity]),
    AdminModule,
    forwardRef(() => BotModule),
  ],
  controllers: [ChatController],
  providers: [ChatService, WsChatGateway],
  exports: [WsChatGateway],
})
export class ChatModule {}
