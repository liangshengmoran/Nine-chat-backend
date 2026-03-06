# 权限系统 (RBAC)

> 动态角色权限控制 — **45 个权限键**，**7 个默认角色**，支持全局和房间级权限。

## 架构

```
用户 (tb_user)
  │
  └── 分配角色 (tb_user_role) ──→ 角色 (tb_role)
       可指定 room_id                  │
                                      └── 绑定权限 (tb_role_permission) ──→ 权限 (tb_permission)
```

**权限检查流程：**

```
请求到达 → AuthGuard 提取用户 → PermissionService 查询角色
            → 合并全局角色 + 房间角色 → 检查是否包含所需权限键
            → 通过 ✓ / 拒绝 ✗ (403)
```

---

## 默认角色

| 角色 | 等级 | 说明 | 系统内置 |
|------|------|------|----------|
| `super_admin` | 100 | 超级管理员，拥有所有权限 | ✅ |
| `admin` | 80 | 管理员，管理用户和内容 | ✅ |
| `moderator` | 60 | 房管，管理特定房间 | ✅ |
| `vip` | 40 | VIP 用户，享有额外特权 | ✅ |
| `user` | 20 | 普通注册用户 | ✅ |
| `guest` | 10 | 游客，受限访问 | ✅ |
| `banned` | 0 | 被封禁用户，无任何权限 | ✅ |

> [!TIP]
> 管理员可以创建自定义角色并分配任意权限组合。系统内置角色不可删除但可修改其权限。角色等级决定了管理层级——低等级角色不能操作高等级角色。

---

## 权限键一览（45 个）

### 💬 聊天权限 (chat) — 6 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `chat.send` | 发送消息 | user 及以上 |
| `chat.send_image` | 发送图片 | user 及以上 |
| `chat.send_emotion` | 发送表情包 | user 及以上 |
| `chat.recall_own` | 撤回自己消息（2分钟内） | user 及以上 |
| `chat.recall_any` | 撤回任何人消息 | moderator 及以上 |
| `chat.delete_message` | 删除消息 | admin 及以上 |

### 🎵 音乐权限 (music) — 7 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `music.choose` | 点歌 | user 及以上 |
| `music.cut_own` | 切自己点的歌 | user 及以上 |
| `music.cut_any` | 切任何人点的歌 | moderator 及以上 |
| `music.remove_own` | 从队列移除自己的歌 | user 及以上 |
| `music.remove_any` | 从队列移除任何歌 | moderator 及以上 |
| `music.recommend` | 设置全局推荐歌曲 | admin 及以上 |
| `music.refill_library` | 批量填充曲库 | admin 及以上 |

### 🏠 房间权限 (room) — 7 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `room.create` | 创建房间 | user 及以上 |
| `room.update_own` | 修改自己创建的房间 | user 及以上 |
| `room.update_any` | 修改任何房间 | admin 及以上 |
| `room.kick_user` | 踢出用户 | moderator 及以上 |
| `room.bypass_password` | 跳过房间密码 | admin 及以上 |
| `room.set_moderator` | 任命/取消房管 | 房主 或 admin |
| `room.delete` | 删除房间 | admin 及以上 |

### 🛡️ 管理权限 (admin) — 8 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `admin.view_dashboard` | 查看管理仪表盘 | admin 及以上 |
| `admin.manage_users` | 管理用户列表 | admin 及以上 |
| `admin.ban_user` | 封禁/解封用户 | admin 及以上 |
| `admin.manage_rooms` | 管理所有房间 | admin 及以上 |
| `admin.manage_messages` | 管理消息（查看/删除） | admin 及以上 |
| `admin.manage_music` | 管理曲库 | admin 及以上 |
| `admin.view_logs` | 查看操作日志 | admin 及以上 |
| `admin.export_data` | 数据导出 | super_admin |

### 👤 用户权限 (user) — 4 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `user.update_profile` | 修改个人资料 | user 及以上 |
| `user.change_avatar` | 修改头像 | user 及以上 |
| `user.change_password` | 修改密码 | user 及以上 |
| `user.submit_feedback` | 提交反馈 | user 及以上 |

### ⚙️ 系统权限 (system) — 6 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `system.manage_config` | 修改系统配置 | super_admin |
| `system.manage_announcements` | 管理公告 | admin 及以上 |
| `system.manage_sensitive_words` | 管理敏感词 | admin 及以上 |
| `system.manage_invite_codes` | 管理邀请码 | admin 及以上 |
| `system.manage_ip_blacklist` | 管理 IP 黑名单 | admin 及以上 |
| `system.cleanup` | 清理过期数据 | super_admin |

### 🤖 Bot 权限 (bot) — 5 个

| 权限键 | 说明 | 默认拥有角色 |
|--------|------|-------------|
| `bot.create` | 创建 Bot | user 及以上 |
| `bot.manage_own` | 管理自己的 Bot | user 及以上 |
| `bot.manage_any` | 管理任何 Bot | admin 及以上 |
| `bot.approve` | 审批 Bot | admin 及以上 |
| `bot.suspend` | 暂停 Bot | admin 及以上 |

---

## RBAC 管理 API

> 路径: `/api/admin/rbac` · 需要 <span class="auth-admin">超级管理员</span> 权限

### 角色管理

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-get">GET</span> | `/roles` | 角色列表（含权限数量） |
| <span class="method-post">POST</span> | `/roles` | 创建角色 |
| <span class="method-put">PUT</span> | `/roles` | 更新角色信息 |
| <span class="method-delete">DELETE</span> | `/roles/:id` | 删除角色（系统内置不可删） |

```bash
# 创建自定义角色
curl -X POST http://localhost:5000/api/admin/rbac/roles \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{
    "name": "dj",
    "description": "DJ - 拥有完整音乐管理权限",
    "level": 50
  }'
```

### 权限管理

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-get">GET</span> | `/permissions` | 所有权限列表（分组显示） |
| <span class="method-get">GET</span> | `/roles/:id/permissions` | 查看角色拥有的权限 |
| <span class="method-put">PUT</span> | `/roles/:id/permissions` | 设置角色的权限组合 |

```bash
# 给 DJ 角色分配权限
curl -X PUT http://localhost:5000/api/admin/rbac/roles/8/permissions \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{
    "permission_ids": [1, 2, 3, 7, 8, 9, 10, 11, 12]
  }'

# 或者用权限键
curl -X PUT http://localhost:5000/api/admin/rbac/roles/8/permissions \
  -d '{
    "permission_keys": [
      "chat.send", "chat.send_image", "chat.send_emotion",
      "music.choose", "music.cut_own", "music.cut_any",
      "music.remove_own", "music.remove_any", "music.recommend"
    ]
  }'
```

### 用户角色分配

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-get">GET</span> | `/users/:id/roles` | 查看用户角色 |
| <span class="method-post">POST</span> | `/users/:id/roles` | 分配角色 |
| <span class="method-delete">DELETE</span> | `/users/:id/roles/:roleId` | 移除角色 |

```bash
# 给用户分配全局 DJ 角色
curl -X POST http://localhost:5000/api/admin/rbac/users/5/roles \
  -H "Authorization: Bearer <super_admin_token>" \
  -d '{ "role_id": 8 }'

# 给用户分配房间级房管角色
curl -X POST http://localhost:5000/api/admin/rbac/users/5/roles \
  -d '{ "role_id": 3, "room_id": 888 }'
```
