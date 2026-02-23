import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { INestApplication } from '@nestjs/common';

const swaggerOptions = new DocumentBuilder()
  .setTitle('Nine-Chat API')
  .setDescription(
    `
## 🎵 Nine-Chat 在线聊天室 + 音乐播放平台 API 文档

Nine-Chat 是一个实时在线聊天室与音乐播放平台，支持多房间聊天、点歌、Bot 扩展等功能。

---

### 📦 功能模块

| 模块 | 说明 | 认证 |
|------|------|------|
| **User** | 用户注册、登录、JWT 签发、个人资料管理 | 部分接口需 JWT |
| **Chat** | 多房间管理、聊天历史、表情包搜索、房管系统 | 部分接口需 JWT |
| **Music** | 歌曲搜索（酷狗/网易云）、收藏管理、热门榜单、点歌 | 部分接口需 JWT |
| **Bot** | 第三方机器人接入，消息收发、命令注册、Inline Keyboard | Bot Token |
| **Upload** | 文件/图片上传（支持 jpg, png, gif, webp） | 无 |
| **Admin** | 后台管理面板，用户/房间/曲库/公告/敏感词/操作日志管理 | JWT + 管理员权限 |

---

### 🔐 认证方式

#### 用户认证 (JWT Bearer Token)
通过 \`/api/user/login\` 获取 Token，在请求头中携带：
\`\`\`
Authorization: Bearer <jwt_token>
\`\`\`

#### Bot认证 (Bot Token)
通过 \`/api/bot/create\` 创建 Bot 后获取 Token，在请求头中携带：
\`\`\`
X-Bot-Token: bot_xxx_xxx
\`\`\`

> **注意**: Bot Token 格式为 \`bot_<botId>_<randomString>\`，创建后仅返回一次，请妥善保管。可通过 \`/api/bot/:id/regenerateToken\` 重新生成。

---

### 📤 响应格式

#### 成功响应
\`\`\`json
{
  "code": 200,
  "data": { ... },
  "message": "请求成功",
  "success": true
}
\`\`\`

#### 错误响应
\`\`\`json
{
  "code": 400,
  "data": null,
  "message": "具体错误信息",
  "success": false
}
\`\`\`

---

### 📊 HTTP 状态码

| 状态码 | 说明 |
|--------|------|
| **200** | 请求成功 |
| **400** | 参数验证失败 / 业务逻辑错误 |
| **401** | 未授权（Token 无效或已过期） |
| **403** | 权限不足（需要管理员权限等） |
| **404** | 资源不存在 |
| **500** | 服务器内部错误 |

---

### 👥 用户角色

| 角色 | 标识 | 权限 |
|------|------|------|
| 普通用户 | \`user\` | 基本聊天、点歌、收藏 |
| 房管 | \`moderator\` | 管理指定房间消息和用户 |
| 管理员 | \`admin\` | 后台管理部分功能 |
| 超级管理员 | \`super\` | 全部后台管理权限 |

---

### 📡 WebSocket 事件

聊天功能通过 Socket.IO 实现，连接地址：\`ws://host:port\`

| 事件 | 方向 | 说明 |
|------|------|------|
| \`message\` | 双向 | 发送/接收聊天消息 |
| \`joinRoom\` | Client→Server | 加入聊天房间 |
| \`leaveRoom\` | Client→Server | 离开聊天房间 |
| \`chooseMusic\` | Client→Server | 点歌请求 |
| \`botMessage\` | Server→Client | Bot 发送的消息 |
| \`botEditMessage\` | Server→Client | Bot 编辑消息 |
| \`botDeleteMessage\` | Server→Client | Bot 撤回消息 |
| \`botAction\` | Server→Client | Bot 状态（正在输入等） |

---

### 📄 分页参数

支持分页的接口统一使用以下参数：

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| \`page\` | number | 1 | 当前页码（从 1 开始） |
| \`pagesize\` | number | 10-30 | 每页数量 |

分页响应格式：
\`\`\`json
{
  "code": 200,
  "data": {
    "list": [...],
    "total": 100,
    "page": 1,
    "pagesize": 10
  }
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
      description: '请输入登录后获取的 JWT Token（通过 /api/user/login 接口获取）',
    },
    'JWT-auth',
  )
  .addApiKey(
    {
      type: 'apiKey',
      in: 'header',
      name: 'X-Bot-Token',
      description: '请输入 Bot Token（格式: bot_<id>_<secret>，通过创建 Bot 后获取）',
    },
    'Bot-auth',
  )
  .addTag('User', '👤 用户模块 — 注册、登录、JWT 签发、个人信息查询与修改、密码管理')
  .addTag('Chat', '💬 聊天模块 — 多房间管理、聊天记录分页查询、表情包搜索、房管系统、Bot 命令聚合')
  .addTag('Music', '🎵 音乐模块 — 酷狗/网易云歌曲搜索、收藏管理、热门榜单、播放地址获取、专辑批量导入')
  .addTag('Bot', '🤖 Bot API — 第三方机器人接入，支持消息收发、Inline Keyboard、命令注册、定时消息、文件发送')
  .addTag('Upload', '📁 上传模块 — 文件/图片上传（支持 multipart/form-data，限制 500KB）')
  .addTag('Admin', '🔧 管理后台 — Dashboard 统计、用户/房间/曲库/消息/公告/敏感词/反馈/邀请码/IP黑名单管理')
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
