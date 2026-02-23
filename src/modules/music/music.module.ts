import { CollectEntity } from './collect.entity';
import { MusicEntity } from './music.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Module } from '@nestjs/common';
import { MusicController } from './music.controller';
import { MusicAuthController } from './music-auth.controller';
import { MusicService } from './music.service';
import { RoomMusicAuthEntity } from '../chat/room-music-auth.entity';

@Module({
  imports: [TypeOrmModule.forFeature([MusicEntity, CollectEntity, RoomMusicAuthEntity])],
  controllers: [MusicController, MusicAuthController],
  providers: [MusicService],
})
export class MusicModule {}
