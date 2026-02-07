import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

const swaggerOptions = new DocumentBuilder()
  .setTitle('Nine-Chat API')
  .setDescription(
    `
## 🎵 Nine-Chat 在线聊天室 + 音乐播放平台 API 文档

### 功能模块
- **User** - 用户注册、登录、资料管理
- **Chat** - 聊天房间、消息历史、表情包
- **Music** - 歌曲搜索、收藏管理、热门歌曲
- **Bot** - 机器人API，第三方Bot接入
- **Upload** - 文件上传

### 认证方式

**用户认证 (JWT)：**
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

**Bot认证 (Bot Token)：**
\`\`\`
Authorization: Bot <bot_token>
\`\`\`

### 响应格式
\`\`\`json
{
  "code": 200,
  "data": {},
  "message": "请求成功",
  "success": true
}
\`\`\`
  `,
  )
  .setVersion('2.0.0')
  .setContact('Nine-Chat', 'https://github.com/longyanjiang/Nine-chat-backend', '')
  .setLicense('MIT', 'https://opensource.org/licenses/MIT')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      description: '请输入登录后获取的 JWT Token',
    },
    'JWT-auth',
  )
  .addApiKey(
    {
      type: 'apiKey',
      in: 'header',
      name: 'X-Bot-Token',
      description: '请输入 Bot Token (不需要前缀，直接输入 bot_xxx_xxx)',
    },
    'Bot-auth',
  )
  .addTag('User', '用户模块 - 注册、登录、个人信息管理')
  .addTag('Chat', '聊天模块 - 房间管理、消息历史、表情包搜索')
  .addTag('Music', '歌曲搜索、收藏、热门推荐')
  .addTag('Bot', 'Bot API - 第三方机器人接入')
  .addTag('Upload', '上传模块 - 文件/图片上传')
  .addTag('Admin', '系统管理 - 用户、房间、曲库管理')
  .build();

export function createSwagger(app: INestApplication) {
  const document = SwaggerModule.createDocument(app, swaggerOptions);
  SwaggerModule.setup('/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
      docExpansion: 'list',
      filter: true,
      showRequestDuration: true,
    },
    customSiteTitle: 'Nine-Chat API 文档',
    customfavIcon: '/favicon.ico',
    customCss: `
      .swagger-ui .topbar { display: none }
      .swagger-ui .info .title { font-size: 2.5em }
    `,
  });
}
