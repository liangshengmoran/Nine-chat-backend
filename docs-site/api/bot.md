# Bot API

> 基础路径: `/api/bot` · 完整的 Bot 机器人开发平台

## 概述

Nine-Chat Bot 平台允许开发者创建自动化机器人，通过 API 与聊天室交互。Bot 可以：

- 📩 接收和发送消息
- 🎵 自动点歌
- 📋 注册斜杠命令
- 🔘 发送带按钮的交互消息
- 📡 通过 Webhook 或长轮询接收事件

### Bot 生命周期

```
创建 Bot → 等待审批 → 审批通过 → 获得 Token → 调用 API
                                      ↓
                    可选：开启沙箱 → 测试 → 转正
```

---

## Bot 管理接口 (<span class="auth-jwt">JWT</span>)

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-post">POST</span> | `/create` | 创建 Bot（需审批） |
| <span class="method-put">PUT</span> | `/update` | 更新 Bot 信息 |
| <span class="method-post">POST</span> | `/commands` | 注册斜杠命令 |

### POST /create

```bash
curl -X POST http://localhost:5000/api/bot/create \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "bot_name": "音乐助手",
    "bot_description": "自动点歌和歌曲推荐",
    "webhook_url": "https://your-server.com/bot/webhook",
    "subscribed_events": ["message.text", "bot.command", "music.chosen"]
  }'
```

```json
{
  "code": 200,
  "data": {
    "bot_id": 1,
    "bot_name": "音乐助手",
    "status": "pending",
    "message": "Bot 已创建，等待管理员审批"
  }
}
```

### POST /commands

注册 Bot 的斜杠命令：

```bash
curl -X POST http://localhost:5000/api/bot/commands \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "bot_id": 1,
    "commands": [
      { "command": "/help", "description": "显示帮助信息" },
      { "command": "/play", "description": "点歌 /play 歌名" },
      { "command": "/top", "description": "查看热门歌曲" }
    ]
  }'
```

---

## Bot 操作接口 (<span class="auth-bot">Bot Token</span>)

审批通过后获得 Bot Token，用于 API 调用：

```
Authorization: Bearer <bot_token>
```

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-get">GET</span> | `/getInfo` | Bot 自身信息 |
| <span class="method-post">POST</span> | `/sendMessage` | 发送消息 |
| <span class="method-post">POST</span> | `/chooseMusic` | Bot 点歌 |
| <span class="method-get">GET</span> | `/getMessages` | 获取消息列表 |
| <span class="method-get">GET</span> | `/getRoomInfo` | 房间信息 |
| <span class="method-get">GET</span> | `/getRoomMembers` | 在线成员列表 |
| <span class="method-get">GET</span> | `/getUpdates` | 长轮询获取事件 |

### POST /sendMessage

Bot 发送消息到房间，支持 Markdown 和内联键盘：

```bash
curl -X POST http://localhost:5000/api/bot/sendMessage \
  -H "Authorization: Bearer <bot_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": 888,
    "message_content": "**你好！** 我是音乐助手 🎵\n\n使用 `/help` 查看帮助",
    "parse_mode": "markdown",
    "reply_markup": {
      "inline_keyboard": [
        [
          { "text": "🎵 随机点歌", "callback_data": "random_play" },
          { "text": "📋 播放列表", "callback_data": "show_queue" }
        ],
        [
          { "text": "❓ 帮助", "callback_data": "help" }
        ]
      ]
    }
  }'
```

```json
{
  "code": 200,
  "data": {
    "message_id": 456,
    "room_id": 888,
    "createTime": "2026-03-05T10:30:00.000Z"
  }
}
```

### POST /chooseMusic

Bot 自动点歌：

```bash
curl -X POST http://localhost:5000/api/bot/chooseMusic \
  -H "Authorization: Bearer <bot_token>" \
  -d '{
    "room_id": 888,
    "music_mid": "a1b2c3d4",
    "music_name": "晴天",
    "music_singer": "周杰伦",
    "source": "kugou"
  }'
```

### GET /getUpdates

长轮询获取新事件（Webhook 的替代方案）：

```bash
curl "http://localhost:5000/api/bot/getUpdates?timeout=30" \
  -H "Authorization: Bearer <bot_token>"
```

最长等待 `timeout` 秒（默认 30），有新事件立即返回：

```json
{
  "code": 200,
  "data": [
    {
      "update_id": 1001,
      "event": "message.text",
      "timestamp": 1709000000000,
      "data": {
        "message_id": 789,
        "user_id": 1,
        "user_nick": "张三",
        "room_id": 888,
        "content": "/play 晴天"
      }
    }
  ]
}
```

---

## Bot 审批接口 (<span class="auth-admin">管理员</span>)

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-get">GET</span> | `/admin/pending` | 待审批 Bot 列表 |
| <span class="method-get">GET</span> | `/admin/all` | 所有 Bot 列表 |
| <span class="method-post">POST</span> | `/admin/:id/approve` | 审批通过 |
| <span class="method-post">POST</span> | `/admin/:id/reject` | 审批拒绝 |
| <span class="method-post">POST</span> | `/admin/:id/suspend` | 暂停 Bot |
| <span class="method-put">PUT</span> | `/admin/:id/permissions` | 设置权限 |

### POST /admin/:id/approve

```bash
curl -X POST http://localhost:5000/api/bot/admin/1/approve \
  -H "Authorization: Bearer <admin_token>"
```

```json
{
  "code": 200,
  "data": {
    "bot_id": 1,
    "bot_token": "bot_xxxxxxxxxxxx",
    "status": "active"
  },
  "message": "Bot 已通过审批"
}
```

---

## 相关文档

| 文档 | 说明 |
|------|------|
| [事件系统](api/bot-events.md) | 22 种事件详解 |
| [Webhook 指南](api/bot-webhook.md) | Webhook 配置、签名验证、重试策略 |
| [沙箱模式](api/bot-sandbox.md) | 安全测试环境 |
| [SDK 使用](api/bot-sdk.md) | TypeScript / Python SDK |
