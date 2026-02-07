import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BotEntity } from './bot.entity';
import { BotManagerEntity } from './bot-manager.entity';
import { BotService } from './bot.service';
import { BotController } from './bot.controller';
import { MessageEntity } from '../chat/message.entity';
import { RoomEntity } from '../chat/room.entity';
import { ChatModule } from '../chat/chat.module';
import { AdminModule } from '../admin/admin.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BotEntity, BotManagerEntity, MessageEntity, RoomEntity]),
    forwardRef(() => ChatModule),
    forwardRef(() => AdminModule),
  ],
  controllers: [BotController],
  providers: [BotService],
  exports: [BotService, TypeOrmModule],
})
export class BotModule {}
