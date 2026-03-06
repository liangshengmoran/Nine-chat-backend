# 沙箱模式

> 安全测试环境，Bot 在独立的测试房间中运行，不影响生产用户。

## 概述

沙箱模式为 Bot 开发者提供了一个安全的测试环境：

- 🧪 自动创建隔离的测试房间
- 🔄 支持模拟所有 22 种事件
- 📡 Echo 测试验证 Webhook 连通性
- 🚀 一键转正到生产环境

## 启用沙箱

```bash
POST /api/bot/sandbox/enable
Authorization: Bearer <jwt_token>
Content-Type: application/json

{ "bot_id": 1 }
```

```json
{
  "code": 200,
  "data": {
    "sandbox_room_id": 9999,
    "sandbox_room_name": "🧪 音乐助手 - 测试室",
    "message": "沙箱模式已启用"
  }
}
```

启用后，Bot 只响应沙箱房间内的事件，不会影响其他房间。

## 模拟事件

向 Bot 发送模拟事件，测试 Bot 的事件处理逻辑：

```bash
POST /api/bot/sandbox/simulate
Authorization: Bearer <jwt_token>
Content-Type: application/json

{
  "bot_id": 1,
  "event": "message.text",
  "data": {
    "user_id": 99,
    "user_nick": "测试用户",
    "content": "/help",
    "room_id": 9999
  }
}
```

```json
{
  "code": 200,
  "data": {
    "delivered": true,
    "delivery_method": "webhook",
    "response_time_ms": 89,
    "webhook_response": { "status": 200 }
  }
}
```

### 支持模拟的事件

| 类别 | 事件 |
|------|------|
| 消息 | `message.text`, `message.image`, `message.emotion`, `message.recalled`, `message.deleted` |
| 音乐 | `music.chosen`, `music.started`, `music.skipped`, `music.ended` |
| 成员 | `member.joined`, `member.left`, `member.kicked` |
| Bot | `bot.command`, `bot.callback_query`, `bot.mentioned` |
| 房间 | `room.updated` |
| 系统 | `system.announcement` |

## Echo 测试

最简单的连通性测试 — 发送 ping，Bot 应该 pong 回来：

```bash
POST /api/bot/sandbox/echo
Authorization: Bearer <jwt_token>

{ "bot_id": 1, "message": "ping" }
```

```json
{
  "code": 200,
  "data": {
    "sent": "ping",
    "received": "pong",
    "round_trip_ms": 52,
    "webhook_status": "healthy"
  }
}
```

## 一键转正

Bot 测试完成后，将其从沙箱模式切换到生产模式：

```bash
POST /api/bot/sandbox/promote
Authorization: Bearer <jwt_token>

{ "bot_id": 1 }
```

```json
{
  "code": 200,
  "data": {
    "bot_id": 1,
    "status": "active",
    "sandbox_mode": false,
    "message": "Bot 已转正，开始响应生产事件"
  }
}
```

> [!WARNING]
> 转正后沙箱测试室会被保留但 Bot 不再响应其中的事件。Bot 将开始接收所有已订阅的实际用户事件。
