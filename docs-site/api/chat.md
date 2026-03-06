# 聊天 API

> 基础路径: `/api/chat` · 聊天历史、房间管理、表情包搜索

## 接口概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| <span class="method-post">POST</span> | `/history` | 获取聊天记录 | <span class="auth-jwt">JWT</span> |
| <span class="method-get">GET</span> | `/emoticon` | 搜索表情包 | 无 |
| <span class="method-post">POST</span> | `/createRoom` | 创建房间 | <span class="auth-jwt">JWT</span> |
| <span class="method-get">GET</span> | `/roomInfo` | 获取房间信息 | 无 |
| <span class="method-post">POST</span> | `/updateRoomInfo` | 更新房间信息 | <span class="auth-jwt">JWT</span> |
| <span class="method-get">GET</span> | `/moderator/list` | 获取房管列表 | 无 |
| <span class="method-get">GET</span> | `/botCommands` | 获取房间 Bot 命令 | 无 |

---

## POST /history

获取指定房间的聊天消息历史记录。按消息发送时间**倒序**排列（最新的消息在前）。

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `room_id` | number | ✅ | — | 房间 ID |
| `page` | number | ❌ | 1 | 页码 |
| `pagesize` | number | ❌ | 30 | 每页数量 |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/chat/history \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "room_id": 888, "page": 1, "pagesize": 30 }'
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "messageArr": [
      {
        "id": 123,
        "user_id": 1,
        "room_id": 888,
        "message_type": "text",
        "message_content": "Hello!",
        "message_status": 1,
        "reply_markup": null,
        "mentions": null,
        "parse_mode": null,
        "createdAt": "2026-02-06T10:00:00.000Z"
      }
    ]
  },
  "success": true,
  "message": "请求成功"
}
```

### 消息字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | number | 消息 ID |
| `user_id` | number | 发送者 ID |
| `room_id` | number | 房间 ID |
| `message_type` | string | 消息类型：`text` / `img` / `emotion` / `quote` |
| `message_content` | string | 消息内容（文字或图片 URL） |
| `message_status` | number | 状态：`1`=正常，`-1`=用户撤回，`-2`=管理员删除 |
| `reply_markup` | json | Bot 内联键盘按钮数据（普通消息为 null） |
| `mentions` | json | @用户 ID 列表（如 `[2, 3]`） |
| `parse_mode` | string | 解析模式（Bot 消息可为 `markdown`） |
| `createdAt` | string | 发送时间（ISO 8601） |

---

## GET /emoticon

根据关键词在线搜索表情包 GIF 图片。返回的 URL 可直接用于 `<img>` 标签显示。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `keyword` | string | ✅ | 搜索关键词，如"开心"、"再见" |

### 请求示例

```bash
curl "http://localhost:5000/api/chat/emoticon?keyword=开心"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    "https://example.com/emoticon1.gif",
    "https://example.com/emoticon2.gif",
    "https://example.com/emoticon3.gif"
  ],
  "success": true,
  "message": "请求成功"
}
```

---

## POST /createRoom

创建用户个人聊天房间。**每个用户只能创建 1 个房间**，已有房间时再次创建返回 400。创建者自动成为**房主**。

### 请求参数

| 字段 | 类型 | 必填 | 限制 | 说明 |
|------|------|------|------|------|
| `room_name` | string | ✅ | 最多 20 字符 | 房间名称 |
| `room_password` | string | ❌ | — | 进入密码（留空则无密码，公开房间） |
| `room_notice` | string | ❌ | — | 房间公告 |

### 请求示例

```bash
# 创建公开房间
curl -X POST http://localhost:5000/api/chat/createRoom \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "room_name": "我的聊天室" }'

# 创建密码房间
curl -X POST http://localhost:5000/api/chat/createRoom \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{
    "room_name": "私密音乐室",
    "room_password": "abc123",
    "room_notice": "欢迎来到私密音乐室~"
  }'
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "room_id": 1001,
    "room_name": "我的聊天室",
    "room_user_id": 1,
    "room_need_password": 0
  },
  "success": true,
  "message": "请求成功"
}
```

### 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 用户已有房间，不能重复创建 |
| 401 | 未授权 |

---

## GET /roomInfo

根据房间 ID 获取房间详细信息。无需认证，适用于进入房间前获取信息或房间列表展示。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `room_id` | number | ✅ | 房间 ID |

### 请求示例

```bash
curl "http://localhost:5000/api/chat/roomInfo?room_id=888"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "room_id": 888,
    "room_name": "官方聊天室",
    "room_notice": "欢迎来到官方聊天室",
    "room_user_id": 1,
    "room_need_password": 0,
    "room_bg": null
  },
  "success": true,
  "message": "请求成功"
}
```

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `room_id` | number | 房间 ID |
| `room_name` | string | 房间名称 |
| `room_notice` | string | 房间公告 |
| `room_user_id` | number | 房主用户 ID |
| `room_need_password` | number | `0`=免密码，`1`=需密码 |
| `room_bg` | string | 背景图 URL（null=默认） |

---

## POST /updateRoomInfo

房主更新自己房间的信息。**仅房主可操作**，非房主调用返回 403。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `room_id` | number | ✅ | 房间 ID |
| `room_name` | string | ❌ | 新的房间名称 |
| `room_notice` | string | ❌ | 新的房间公告 |
| `room_bg` | string | ❌ | 新的背景图 URL |
| `room_password` | string | ❌ | 新密码（传空字符串或 null 取消密码） |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/chat/updateRoomInfo \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "room_id": 888,
    "room_name": "新房间名",
    "room_notice": "新公告内容"
  }'
```

### 错误码

| 状态码 | 说明 |
|--------|------|
| 401 | 未授权 |
| 403 | 无权限修改此房间（非房主） |

---

## GET /moderator/list

获取指定房间的所有房管列表。无需认证，用于房间设置页展示房管或前端判断用户是否为房管。

### 请求示例

```bash
curl "http://localhost:5000/api/chat/moderator/list?room_id=888"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    {
      "user_id": 2,
      "user_nick": "房管小王",
      "user_avatar": "/avatars/user2.png"
    },
    {
      "user_id": 3,
      "user_nick": "房管小李",
      "user_avatar": "/avatars/user3.png"
    }
  ],
  "success": true,
  "message": "请求成功"
}
```

---

## GET /botCommands

获取指定房间内所有 Bot 注册的斜杠命令列表。前端在聊天输入框中输入 `/` 时，弹出命令菜单。

### 请求示例

```bash
curl "http://localhost:5000/api/chat/botCommands?room_id=888"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    {
      "command": "help",
      "description": "显示帮助信息",
      "bot_name": "音乐小助手",
      "bot_id": 1
    },
    {
      "command": "play",
      "description": "点歌 /play 歌名",
      "bot_name": "音乐小助手",
      "bot_id": 1
    }
  ],
  "success": true,
  "message": "请求成功"
}
```
