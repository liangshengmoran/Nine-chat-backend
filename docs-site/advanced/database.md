# 数据库模型

> 共 **23 张表**，TypeORM 自动同步，支持 MySQL 和 SQLite 双模式。

## ER 关系概览

```
tb_user ─────────── tb_message (user_id)
  │                    │
  ├── tb_room (room_user_id)
  │     │
  │     ├── tb_room_moderator (room_id + user_id)
  │     └── tb_room_music_auth (room_id)
  │
  ├── tb_collect (user_id + music_mid → tb_music)
  │
  ├── tb_oauth_account (user_id + provider)
  │
  ├── tb_user_role → tb_role → tb_role_permission → tb_permission
  │
  ├── tb_bot (owner_id)
  │     ├── tb_bot_manager
  │     ├── tb_bot_update
  │     ├── tb_bot_scheduled_message
  │     └── tb_webhook_log
  │
  ├── tb_feedback (user_id)
  └── tb_invite_code (creator_id)
```

---

## 核心业务表

### tb_user — 用户表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK, AUTO_INCREMENT | 用户 ID |
| `user_name` | varchar(12) | UNIQUE, NOT NULL | 登录名 |
| `user_nick` | varchar(12) | NOT NULL | 显示昵称 |
| `user_password` | varchar(1000) | NOT NULL | MD5 加密密码 |
| `user_status` | int | DEFAULT 1 | 1=正常, 0=禁用, -1=封禁 |
| `user_email` | varchar(64) | UNIQUE | 邮箱地址 |
| `user_avatar` | varchar(600) | DEFAULT '' | 头像 URL |
| `user_role` | varchar(10) | DEFAULT 'user' | 角色: super/admin/user/guest |
| `user_sign` | varchar(255) | DEFAULT '' | 个性签名 |
| `user_room_id` | varchar(255) | | 当前所在房间 |
| `createTime` | datetime | AUTO | 注册时间 |
| `updateTime` | datetime | AUTO | 更新时间 |

### tb_room — 房间表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK | 主键 |
| `room_user_id` | int | UNIQUE | 创建者用户 ID（每人限 1 个） |
| `room_id` | int | UNIQUE | 房间编号 |
| `room_name` | varchar(20) | NOT NULL | 房间名称 |
| `room_need_password` | int | DEFAULT 1 | 1=公开, 2=需密码 |
| `room_password` | varchar(255) | | 加密后的房间密码 |
| `room_notice` | varchar(512) | DEFAULT '' | 房间公告 |
| `room_bg_img` | varchar(255) | DEFAULT '' | 背景图 URL |
| `createTime` | datetime | AUTO | 创建时间 |

### tb_message — 消息表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK, AUTO_INCREMENT | 消息 ID |
| `user_id` | int | INDEX | 发送者 ID |
| `room_id` | int | INDEX | 房间 ID |
| `message_content` | text | NOT NULL | 消息内容 |
| `message_type` | varchar(64) | DEFAULT 'text' | text/image/emotion/quote |
| `message_status` | int | DEFAULT 1 | 1=正常, -1=撤回, -2=管理员删除 |
| `reply_markup` | json | NULLABLE | Bot 按钮数据 |
| `mentions` | json | NULLABLE | @用户 ID 列表 |
| `quote_message_id` | int | NULLABLE | 引用的消息 ID |
| `createTime` | datetime | AUTO, INDEX | 发送时间 |

### tb_music — 曲库表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK | 主键 |
| `music_mid` | varchar(100) | UNIQUE | 唯一标识（酷狗 Hash / 网易云 ID） |
| `music_name` | varchar(300) | NOT NULL | 歌名 |
| `music_singer` | varchar(300) | | 歌手 |
| `music_album` | varchar(300) | | 专辑 |
| `music_duration` | int | | 时长（秒） |
| `music_cover` | varchar(500) | | 封面图 URL |
| `recommend_status` | int | DEFAULT 0 | 0=普通, 1=推荐 |
| `source` | varchar(20) | DEFAULT 'kugou' | kugou/netease |
| `play_count` | int | DEFAULT 0 | 播放次数 |
| `createTime` | datetime | AUTO | 入库时间 |

### tb_collect — 用户收藏表

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK | 主键 |
| `user_id` | int | INDEX | 用户 ID |
| `music_mid` | varchar(100) | | 歌曲标识 |
| `music_name` | varchar(300) | | 歌名 |
| `music_singer` | varchar(300) | | 歌手 |
| `source` | varchar(20) | | 音源 |
| `createTime` | datetime | AUTO | 收藏时间 |

> UNIQUE(`user_id`, `music_mid`) — 同一用户不能重复收藏

---

## 房间辅助表

### tb_room_moderator — 房管表

| 字段 | 说明 |
|------|------|
| `id` | 主键 |
| `room_id` | 房间 ID |
| `user_id` | 被授权的用户 ID |
| `createTime` | 授权时间 |

### tb_room_music_auth — 音乐授权表

| 字段 | 说明 |
|------|------|
| `id` | 主键 |
| `room_id` | 房间 ID |
| `user_id` | 授权者 |
| `source` | 音源类型 |
| `cookie` | 加密后的 Cookie |
| `status` | 1=有效, 0=已撤销 |

---

## RBAC 权限表

### tb_role — 角色表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | 角色 ID |
| `name` | varchar UNIQUE | 角色名（super_admin, admin, ...） |
| `description` | varchar | 角色描述 |
| `level` | int | 等级（越高权限越大） |
| `is_system` | boolean | 是否系统内置（不可删除） |

### tb_permission — 权限表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | 权限 ID |
| `key` | varchar UNIQUE | 权限键（如 `chat.send`） |
| `name` | varchar | 显示名称 |
| `description` | varchar | 描述 |
| `group` | varchar | 分组（chat/music/room/admin/...） |
| `scope` | varchar | 作用域（global/room） |

### tb_role_permission — 角色-权限映射

| 字段 | 说明 |
|------|------|
| `role_id` | FK → tb_role |
| `permission_id` | FK → tb_permission |

### tb_user_role — 用户-角色分配

| 字段 | 说明 |
|------|------|
| `user_id` | FK → tb_user |
| `role_id` | FK → tb_role |
| `room_id` | 房间 ID（NULL=全局） |

> 支持房间级角色分配：`room_id` 为 NULL 表示全局角色，有值表示该房间内的角色。

---

## Bot 相关表

### tb_bot — Bot 信息表

| 字段 | 类型 | 说明 |
|------|------|------|
| `id` | int PK | Bot ID |
| `bot_name` | varchar | 名称 |
| `bot_description` | text | 描述 |
| `bot_token` | varchar UNIQUE | API Token |
| `owner_id` | int FK | 创建者 |
| `status` | varchar | pending/active/suspended |
| `webhook_url` | varchar | Webhook 地址 |
| `subscribed_events` | json | 已订阅事件列表 |
| `commands` | json | 注册的斜杠命令 |
| `sandbox_mode` | boolean | 是否沙箱模式 |
| `sandbox_room_id` | int | 沙箱房间 ID |

### tb_bot_update — getUpdates 队列

| 字段 | 说明 |
|------|------|
| `id` | 更新 ID |
| `bot_id` | FK → tb_bot |
| `event_type` | 事件类型 |
| `payload` | JSON 载荷 |
| `consumed` | 是否已消费 |

### tb_bot_manager — Bot 共管

| 字段 | 说明 |
|------|------|
| `bot_id` | FK → tb_bot |
| `user_id` | 共管者 |
| `permission_level` | 权限等级 |

### tb_bot_scheduled_message — 定时消息

| 字段 | 说明 |
|------|------|
| `bot_id` | FK → tb_bot |
| `room_id` | 目标房间 |
| `content` | 消息内容 |
| `cron_expression` | Cron 表达式 |
| `is_active` | 是否启用 |

### tb_webhook_log — Webhook 投递日志

| 字段 | 说明 |
|------|------|
| `id` | 日志 ID |
| `bot_id` | FK → tb_bot |
| `event_type` | 事件类型 |
| `request_url` | 请求地址 |
| `response_status` | HTTP 状态码 |
| `response_time_ms` | 响应时间 |
| `retry_count` | 重试次数 |
| `success` | 是否成功 |

---

## OAuth 认证表

### tb_oauth_account — 第三方登录绑定

| 字段 | 类型 | 约束 | 说明 |
|------|------|------|------|
| `id` | int | PK, AUTO_INCREMENT | 主键 |
| `user_id` | int | NOT NULL | 关联的本地用户 ID |
| `provider` | varchar(20) | NOT NULL | 提供商: github / google |
| `provider_user_id` | varchar(100) | NOT NULL | 提供商的用户唯一 ID |
| `provider_username` | varchar(100) | | 提供商用户名 |
| `provider_email` | varchar(200) | | 提供商邮箱 |
| `provider_avatar` | varchar(600) | | 提供商头像 URL |
| `access_token` | varchar(1000) | | 提供商 Access Token |
| `refresh_token` | varchar(1000) | | 提供商 Refresh Token |
| `created_at` | datetime | AUTO | 绑定时间 |
| `updated_at` | datetime | AUTO | 更新时间 |

> UNIQUE(`provider`, `provider_user_id`) — 每个第三方账号只能绑定一个本地用户

---

## 管理功能表

| 表名 | 说明 | 核心字段 |
|------|------|----------|
| `tb_announcement` | 系统公告 | title, content, type, start_time, end_time |
| `tb_sensitive_word` | 敏感词 | word, replacement, is_active |
| `tb_feedback` | 用户反馈 | user_id, content, reply, status |
| `tb_invite_code` | 邀请码 | code, creator_id, max_uses, used_count, is_active |
| `tb_ip_blacklist` | IP 黑名单 | ip_address, reason, banned_by |
| `tb_operation_log` | 操作日志 | admin_id, action, target, detail, ip |
