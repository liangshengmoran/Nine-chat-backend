# Bot 事件系统

> 共 **22 种事件**，分 6 组。Bot 可按需订阅，仅接收已订阅的事件。

## 事件订阅管理

```bash
# 设置订阅事件列表
POST /api/bot/subscriptions
Authorization: Bearer <bot_token>
{ "events": ["message.text", "bot.command", "music.chosen"] }

# 查询当前订阅
GET /api/bot/subscriptions

# 获取所有可用事件类型
GET /api/bot/event-types
```

---

## 💬 消息事件

| 事件 | 触发时机 | 关键数据 |
|------|----------|----------|
| `message.text` | 用户发送文字消息 | `message_id`, `user_id`, `content`, `room_id` |
| `message.image` | 用户发送图片 | `message_id`, `user_id`, `image_url`, `room_id` |
| `message.emotion` | 用户发送表情包 | `message_id`, `user_id`, `emotion_url`, `room_id` |
| `message.recalled` | 用户撤回消息 | `message_id`, `user_id`, `room_id` |
| `message.deleted` | 管理员删除消息 | `message_id`, `admin_id`, `room_id` |
| `message.pinned` | 消息被置顶 | `message_id`, `room_id` |
| `message.quoted` | 消息被引用回复 | `message_id`, `quote_id`, `content`, `room_id` |

### message.text 载荷示例

```json
{
  "event": "message.text",
  "timestamp": 1709000000000,
  "data": {
    "message_id": 123,
    "user_id": 1,
    "user_nick": "张三",
    "user_avatar": "/uploads/avatar/1.png",
    "room_id": 888,
    "content": "/play 晴天",
    "mentions": [2, 3],
    "createTime": "2026-03-05T10:30:00.000Z"
  }
}
```

---

## 🎵 音乐事件

| 事件 | 触发时机 | 关键数据 |
|------|----------|----------|
| `music.chosen` | 有人点歌 | `music_name`, `music_singer`, `user_id`, `room_id` |
| `music.started` | 歌曲开始播放 | `music_name`, `playUrl`, `duration` |
| `music.skipped` | 歌曲被切 | `music_name`, `user_id`, `reason` |
| `music.ended` | 歌曲播放完毕 | `music_name`, `next_music` |
| `music.queue_updated` | 播放队列变更 | `queue[]`, `action` |
| `music.removed` | 歌曲被移除 | `music_name`, `user_id` |

### music.chosen 载荷示例

```json
{
  "event": "music.chosen",
  "timestamp": 1709000000000,
  "data": {
    "music_mid": "a1b2c3d4",
    "music_name": "晴天",
    "music_singer": "周杰伦",
    "user_id": 1,
    "user_nick": "张三",
    "room_id": 888,
    "source": "kugou",
    "queue_position": 3
  }
}
```

---

## 👥 成员事件

| 事件 | 触发时机 | 关键数据 |
|------|----------|----------|
| `member.joined` | 用户加入房间 | `user_id`, `user_nick`, `room_id` |
| `member.left` | 用户离开房间 | `user_id`, `user_nick`, `room_id` |
| `member.kicked` | 用户被踢出 | `user_id`, `reason`, `kicked_by`, `room_id` |
| `member.banned` | 用户被封禁 | `user_id`, `reason`, `banned_by` |
| `member.unbanned` | 用户被解封 | `user_id`, `unbanned_by` |

---

## 🏠 房间事件

| 事件 | 触发时机 | 关键数据 |
|------|----------|----------|
| `room.updated` | 房间信息更新 | `room_id`, `changes` |
| `room.created` | 新房间创建 | `room_id`, `room_name`, `user_id` |

---

## 🤖 Bot 专属事件

| 事件 | 触发时机 | 关键数据 |
|------|----------|----------|
| `bot.command` | 用户输入斜杠命令 | `command`, `args`, `user_id`, `room_id` |
| `bot.callback_query` | 用户点击内联键盘按钮 | `callback_data`, `message_id`, `user_id` |
| `bot.mentioned` | Bot 被 @提及 | `message_id`, `user_id`, `content` |

### bot.command 载荷示例

```json
{
  "event": "bot.command",
  "timestamp": 1709000000000,
  "data": {
    "command": "/play",
    "args": "晴天 周杰伦",
    "raw_text": "/play 晴天 周杰伦",
    "user_id": 1,
    "user_nick": "张三",
    "room_id": 888,
    "message_id": 789
  }
}
```

### bot.callback_query 载荷示例

```json
{
  "event": "bot.callback_query",
  "timestamp": 1709000000000,
  "data": {
    "callback_data": "random_play",
    "user_id": 1,
    "user_nick": "张三",
    "message_id": 456,
    "room_id": 888
  }
}
```

---

## 📢 系统事件

| 事件 | 触发时机 | 关键数据 |
|------|----------|----------|
| `system.announcement` | 管理员发布公告 | `title`, `content`, `type` |

---

## 通用载荷结构

所有事件都遵循统一格式：

```json
{
  "event": "事件类型",
  "timestamp": 1709000000000,
  "data": { ... }
}
```
