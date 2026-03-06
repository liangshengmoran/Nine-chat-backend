import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from 'nestjs-config';
import { resolve } from 'path';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ScheduleModule } from '@nestjs/schedule';
import { ChatModule } from './modules/chat/chat.module';
import { MusicModule } from './modules/music/music.module';
import { UserModule } from './modules/user/user.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { UploadModule } from './modules/upload/upload.module';
import { AdminModule } from './modules/admin/admin.module';
import { BotModule } from './modules/bot/bot.module';
import { PermissionModule } from './common/permission.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ServeStaticModule.forRoot(
      {
        rootPath: join(__dirname, '../../', 'docs-site'),
        serveRoot: '/docs-site',
        serveStaticOptions: {
          index: ['index.html'],
          redirect: false,
        },
      },
      {
        rootPath: join(__dirname, '../../', 'public'),
        exclude: ['/api*', '/docs-site*', '/docs*'],
      },
    ),
    ConfigModule.load(resolve(__dirname, 'config', '**/!(*.d).{ts,js}')),
    TypeOrmModule.forRootAsync({
      useFactory: (config: ConfigService) => config.get('database'),
      inject: [ConfigService],
    }),
    ChatModule,
    MusicModule,
    UserModule,
    UploadModule,
    AdminModule,
    BotModule,
    PermissionModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
