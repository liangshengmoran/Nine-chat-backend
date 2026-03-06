# 管理后台 API

> 基础路径: `/api/admin` · 所有接口需要管理员权限（<span class="auth-admin">AdminGuard</span>）

## 接口分类

管理后台包含 **13 个模块**、**40+ 个接口**：

| 模块 | 接口数 | 说明 |
|------|--------|------|
| [仪表盘](#仪表盘) | 1 | 首页统计数据 |
| [用户管理](#用户管理) | 4 | 用户列表、详情、改角色、封禁 |
| [房间管理](#房间管理) | 3 | 房间列表、详情、修改、删除 |
| [消息管理](#消息管理) | 2 | 消息列表、删除 |
| [音乐管理](#音乐管理) | 3 | 曲库列表、删除、收藏统计 |
| [公告管理](#公告管理) | 5 | 创建、编辑、删除、列表、生效中 |
| [操作日志](#操作日志) | 1 | 管理员操作记录 |
| [敏感词管理](#敏感词管理) | 3 | 添加、删除、列表 |
| [用户反馈](#用户反馈) | 4 | 提交、列表、回复、我的反馈 |
| [邀请码管理](#邀请码管理) | 3 | 创建、列表、禁用 |
| [IP 黑名单](#ip-黑名单) | 3 | 添加、删除、列表 |
| [数据管理](#数据管理) | 2 | 数据导出、清理过期数据 |
| [RBAC 权限](#rbac-权限管理) | 9 | 角色管理、权限管理、用户角色分配 |
| [批量操作](#批量操作) | 2 | 批量封禁、批量删除消息 |
| [在线统计](#在线统计) | 1 | 实时在线用户/房间统计 |

---

## 仪表盘

### GET /dashboard

获取管理后台首页统计数据。

```bash
curl http://localhost:5000/api/admin/dashboard \
  -H "Authorization: Bearer <admin_token>"
```

```json
{
  "code": 200,
  "data": {
    "totalUsers": 100,
    "todayNewUsers": 5,
    "totalRooms": 10,
    "activeRooms": 3,
    "totalMusic": 200,
    "totalCollects": 500,
    "totalMessages": 10000,
    "todayMessages": 150,
    "onlineUsers": 20
  }
}
```

---

## 用户管理

### GET /users

分页获取用户列表，支持关键词搜索和角色筛选。

| 参数 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | ❌ | 1 | 页码 |
| `pagesize` | number | ❌ | 20 | 每页数量 |
| `keyword` | string | ❌ | — | 搜索关键词（匹配用户名/昵称） |
| `role` | string | ❌ | — | 筛选角色：super/admin/user |

```bash
curl "http://localhost:5000/api/admin/users?page=1&pagesize=20&keyword=张" \
  -H "Authorization: Bearer <admin_token>"
```

```json
{
  "code": 200,
  "data": {
    "list": [
      {
        "user_id": 1,
        "user_name": "admin",
        "user_nick": "管理员",
        "user_avatar": "/avatars/1.png",
        "user_role": "admin",
        "user_status": 1,
        "createdAt": "2026-01-01T00:00:00.000Z"
      }
    ],
    "total": 100,
    "page": 1,
    "pagesize": 20
  }
}
```

### GET /users/:id

获取单个用户的详细信息，包含所有字段。

```bash
curl http://localhost:5000/api/admin/users/1 \
  -H "Authorization: Bearer <admin_token>"
```

### POST /users/role

更新用户角色。支持房管级别角色整合到此接口。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | number | ✅ | 用户 ID |
| `user_role` | string | ✅ | 新角色（super/admin/user） |

```bash
curl -X POST http://localhost:5000/api/admin/users/role \
  -H "Authorization: Bearer <admin_token>" \
  -d '{ "user_id": 5, "user_role": "admin" }'
```

> 低权限管理员**不能**提升用户为比自己更高的角色。

### POST /users/ban

封禁或解封用户。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | number | ✅ | 用户 ID |
| `action` | string | ✅ | `ban`=封禁 / `unban`=解封 |

```bash
curl -X POST http://localhost:5000/api/admin/users/ban \
  -d '{ "user_id": 5, "action": "ban" }' \
  -H "Authorization: Bearer <admin_token>"
```

---

## 房间管理

### GET /rooms

分页获取房间列表。

| 参数 | 说明 |
|------|------|
| `page` / `pagesize` | 分页 |
| `keyword` | 搜索房间名 |

### GET /rooms/:id

获取房间详细信息。

### POST /rooms/update

管理员修改房间信息（可修改任意房间，不限于房主）。

### DELETE /rooms/:id

管理员删除房间。

---

## 消息管理

### GET /messages

分页获取消息列表。

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` / `pagesize` | number | 分页 |
| `room_id` | number | 按房间筛选 |
| `user_id` | number | 按用户筛选 |
| `keyword` | string | 搜索消息内容 |

```bash
curl "http://localhost:5000/api/admin/messages?room_id=888&page=1" \
  -H "Authorization: Bearer <admin_token>"
```

### POST /messages/delete

管理员删除指定消息。

```bash
curl -X POST http://localhost:5000/api/admin/messages/delete \
  -d '{ "message_id": 123 }' \
  -H "Authorization: Bearer <admin_token>"
```

---

## 音乐管理

### GET /music

分页获取曲库列表，支持搜索歌名/歌手。

### POST /music/delete

从曲库中删除指定歌曲。

### GET /music/collectStats

获取收藏统计数据（最受欢迎的歌曲排行）。

---

## 公告管理

### POST /announcements

创建系统公告。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `title` | string | ✅ | 公告标题 |
| `content` | string | ✅ | 公告内容 |
| `type` | string | ❌ | 类型：info / warning / important |
| `start_time` | string | ❌ | 生效时间（ISO 8601） |
| `end_time` | string | ❌ | 过期时间 |

```bash
curl -X POST http://localhost:5000/api/admin/announcements \
  -H "Authorization: Bearer <admin_token>" \
  -d '{
    "title": "系统维护通知",
    "content": "3月6日凌晨2:00-4:00进行系统维护",
    "type": "warning",
    "start_time": "2026-03-05T00:00:00.000Z",
    "end_time": "2026-03-07T00:00:00.000Z"
  }'
```

### PUT /announcements

更新已有公告。

### DELETE /announcements/:id

删除公告。

### GET /announcements

分页获取公告列表（所有状态）。

### GET /announcements/active

获取当前生效中的公告列表（无需管理员权限，前端首页展示用）。

---

## 操作日志

### GET /logs

分页获取管理员操作日志。

| 参数 | 类型 | 说明 |
|------|------|------|
| `page` / `pagesize` | number | 分页 |
| `admin_id` | number | 按管理员筛选 |
| `action` | string | 按操作类型筛选 |

```bash
curl "http://localhost:5000/api/admin/logs?page=1&pagesize=20" \
  -H "Authorization: Bearer <admin_token>"
```

---

## 批量操作

### POST /users/batch-ban

批量封禁多个用户。

| 参数 | 类型 | 说明 |
|------|------|------|
| `user_ids` | number[] | 用户 ID 数组 |
| `action` | string | `ban` / `unban` |
| `reason` | string | 封禁原因 |

```bash
curl -X POST http://localhost:5000/api/admin/users/batch-ban \
  -H "Authorization: Bearer <admin_token>" \
  -d '{ "user_ids": [5, 6, 7], "action": "ban", "reason": "违规发言" }'
```

### POST /messages/batch-delete

批量删除多条消息。

| 参数 | 类型 | 说明 |
|------|------|------|
| `message_ids` | number[] | 消息 ID 数组 |

---

## 在线统计

### GET /online-stats

获取实时在线用户和房间统计信息。

```bash
curl http://localhost:5000/api/admin/online-stats \
  -H "Authorization: Bearer <admin_token>"
```

---

## 敏感词管理

### POST /sensitive-words

添加敏感词。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `word` | string | ✅ | 敏感词 |
| `replacement` | string | ❌ | 替换文字（默认用 `***`） |

### DELETE /sensitive-words/:id

删除敏感词。

### GET /sensitive-words

分页获取敏感词列表。

---

## 用户反馈

### POST /feedback

用户提交反馈（普通用户也可调用）。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `content` | string | ✅ | 反馈内容 |
| `type` | string | ❌ | 类型：bug / suggestion / other |
| `images` | string[] | ❌ | 截图 URL 数组 |

### GET /feedback

管理员获取所有反馈列表（分页）。

### POST /feedback/reply

管理员回复反馈。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `feedback_id` | number | ✅ | 反馈 ID |
| `reply` | string | ✅ | 回复内容 |

### GET /feedback/my

用户获取自己提交的反馈列表。

---

## 邀请码管理

### POST /invite-codes

创建邀请码。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `max_uses` | number | ❌ | 最大使用次数（默认不限） |
| `expires_at` | string | ❌ | 过期时间 |

```bash
curl -X POST http://localhost:5000/api/admin/invite-codes \
  -H "Authorization: Bearer <admin_token>" \
  -d '{ "max_uses": 10 }'
```

### GET /invite-codes

分页获取邀请码列表。

### PUT /invite-codes/:id/disable

禁用指定邀请码。

---

## IP 黑名单

### POST /ip-blacklist

添加 IP 到黑名单。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `ip_address` | string | ✅ | IP 地址 |
| `reason` | string | ❌ | 封禁原因 |

### DELETE /ip-blacklist/:id

从黑名单移除 IP。

### GET /ip-blacklist

分页获取 IP 黑名单列表。

---

## 数据管理

### POST /export

导出数据为 JSON 或 CSV 格式。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `type` | string | ✅ | 导出类型：users / messages / music / rooms |
| `format` | string | ❌ | 格式：json（默认）/ csv |
| `filters` | object | ❌ | 筛选条件 |

```bash
curl -X POST http://localhost:5000/api/admin/export \
  -H "Authorization: Bearer <admin_token>" \
  -d '{ "type": "users", "format": "json" }'
```

### POST /cleanup

清理过期数据（已撤回/删除的消息、过期邀请码等）。

```bash
curl -X POST http://localhost:5000/api/admin/cleanup \
  -H "Authorization: Bearer <admin_token>"
```

---

## RBAC 权限管理

> 详细的 RBAC 概念说明请参考 [权限系统 (RBAC)](advanced/rbac.md)

### GET /rbac/roles

获取所有角色列表（含权限数量）。

```bash
curl http://localhost:5000/api/admin/rbac/roles \
  -H "Authorization: Bearer <admin_token>"
```

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "name": "super_admin",
      "description": "超级管理员",
      "level": 100,
      "is_system": true,
      "permissionCount": 45
    }
  ]
}
```

### POST /rbac/roles

创建自定义角色。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | string | ✅ | 角色唯一标识 |
| `description` | string | ❌ | 角色描述 |
| `level` | number | ✅ | 等级（1-99） |

### PUT /rbac/roles

更新角色信息（不含权限修改）。

### DELETE /rbac/roles/:id

删除角色（系统内置角色不可删除）。

### GET /rbac/permissions

获取所有 45 个权限列表（分组显示：chat / music / room / admin / user / system / bot）。

```json
{
  "code": 200,
  "data": {
    "chat": [
      { "id": 1, "key": "chat.send", "name": "发送消息", "scope": "global" },
      { "id": 2, "key": "chat.send_image", "name": "发送图片", "scope": "global" }
    ],
    "music": [ ... ],
    "room": [ ... ]
  }
}
```

### GET /rbac/roles/:id/permissions

获取指定角色拥有的权限列表。

### PUT /rbac/roles/:id/permissions

设置角色的权限组合（完整替换）。

| 参数 | 类型 | 说明 |
|------|------|------|
| `permission_ids` | number[] | 权限 ID 数组 |

```bash
curl -X PUT http://localhost:5000/api/admin/rbac/roles/8/permissions \
  -H "Authorization: Bearer <admin_token>" \
  -d '{ "permission_ids": [1, 2, 3, 7, 8, 9] }'
```

### GET /rbac/users/:id/roles

获取指定用户的所有角色（含全局和房间级）。

### POST /rbac/users/:id/roles

给用户分配角色。

| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `role_id` | number | ✅ | 角色 ID |
| `room_id` | number | ❌ | 房间 ID（为空=全局角色） |

```bash
# 全局角色
curl -X POST http://localhost:5000/api/admin/rbac/users/5/roles \
  -H "Authorization: Bearer <admin_token>" \
  -d '{ "role_id": 8 }'

# 房间级角色
curl -X POST http://localhost:5000/api/admin/rbac/users/5/roles \
  -d '{ "role_id": 3, "room_id": 888 }'
```

### DELETE /rbac/users/:id/roles/:roleId

移除用户的指定角色。
