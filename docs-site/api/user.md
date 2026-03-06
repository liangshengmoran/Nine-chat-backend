# 用户 API

> 基础路径: `/api/user` · 用户注册、登录、个人信息管理

## 接口概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| <span class="method-post">POST</span> | `/register` | 用户注册 | 无 |
| <span class="method-post">POST</span> | `/login` | 用户登录 | 无 |
| <span class="method-get">GET</span> | `/getInfo` | 获取当前用户信息 | <span class="auth-jwt">JWT</span> |
| <span class="method-get">GET</span> | `/query` | 查询用户公开信息 | 无 |
| <span class="method-post">POST</span> | `/update` | 更新个人资料 | <span class="auth-jwt">JWT</span> |
| <span class="method-post">POST</span> | `/changePassword` | 修改密码 | <span class="auth-jwt">JWT</span> |

---

## POST /register

注册新用户账号。注册成功后自动签发 JWT Token（有效期 7 天），默认角色为 `user`。

### 请求参数

| 字段 | 类型 | 必填 | 限制 | 说明 |
|------|------|------|------|------|
| `user_name` | string | ✅ | 2-20 字符 | 登录用户名，**全局唯一且不可修改** |
| `user_nick` | string | ✅ | 最多 20 字符 | 显示昵称，可后续修改 |
| `user_password` | string | ✅ | 6-20 字符 | 登录密码，服务端以 MD5 加密存储 |
| `user_email` | string | ✅ | 合法邮箱 | 邮箱地址，全局唯一 |
| `user_avatar` | string | ❌ | — | 头像 URL，不填则使用系统默认头像 |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/user/register \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "zhangsan",
    "user_nick": "张三",
    "user_password": "123456",
    "user_email": "zhangsan@example.com"
  }'
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "user_id": 1,
      "user_name": "zhangsan",
      "user_nick": "张三",
      "user_avatar": "/default_avatar.png",
      "user_email": "zhangsan@example.com",
      "user_role": "user"
    }
  },
  "success": true,
  "message": "请求成功"
}
```

### 错误码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 | 参数验证失败 | 用户名长度不符、密码太短、邮箱格式错误 |
| 400 | 用户名已存在 | `user_name` 已被注册 |

### 验证错误示例

```json
{
  "code": 400,
  "message": "用户名长度不能小于2",
  "success": false
}
```

---

## POST /login

使用用户名和密码进行身份认证。登录成功后返回 JWT Token（有效期 7 天）和用户基本信息。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_name` | string | ✅ | 登录用户名 |
| `user_password` | string | ✅ | 登录密码 |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/user/login \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "zhangsan",
    "user_password": "123456"
  }'
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "userInfo": {
      "user_id": 1,
      "user_name": "zhangsan",
      "user_nick": "张三",
      "user_avatar": "/default_avatar.png",
      "user_role": "user"
    }
  },
  "success": true,
  "message": "请求成功"
}
```

### Token 使用方式

在后续所有需要认证的请求 Header 中携带：

```http
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 错误码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 401 | 认证失败 | 用户名不存在或密码错误 |
| 403 | 账号被封禁 | 用户 `user_status` 为封禁状态 |

---

## GET /getInfo

根据请求头中的 JWT Token 解析当前用户身份，返回完整的用户资料。

**使用场景：**
- 前端初始化时获取当前用户信息
- 页面刷新后恢复用户状态
- 检查 Token 是否仍然有效

### 请求示例

```bash
curl http://localhost:5000/api/user/getInfo \
  -H "Authorization: Bearer <jwt_token>"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "user_id": 1,
    "user_name": "zhangsan",
    "user_nick": "张三",
    "user_avatar": "/avatars/user1.png",
    "user_email": "zhangsan@example.com",
    "user_role": "user",
    "user_sign": "这是我的签名",
    "user_room_id": 888,
    "createdAt": "2026-01-01T00:00:00.000Z"
  },
  "success": true,
  "message": "请求成功"
}
```

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `user_id` | number | 用户 ID |
| `user_name` | string | 登录用户名 |
| `user_nick` | string | 显示昵称 |
| `user_avatar` | string | 头像路径 |
| `user_email` | string | 邮箱地址 |
| `user_role` | string | 角色：`super` / `admin` / `user` / `guest` |
| `user_sign` | string | 个性签名 |
| `user_room_id` | string | 当前所在房间 ID |
| `createdAt` | string | 注册时间（ISO 8601） |

### 错误码

| 状态码 | 说明 |
|--------|------|
| 401 | Token 无效或已过期 |

---

## GET /query

根据用户 ID 查询指定用户的**公开信息**。无需认证，适用于查看其他用户主页或消息列表显示发送者信息。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `user_id` | number | ✅ | 要查询的用户 ID |

### 请求示例

```bash
curl "http://localhost:5000/api/user/query?user_id=1"
```

### 成功响应（200）

> 注意：仅返回公开字段，不包含用户名、密码、邮箱等隐私信息。

```json
{
  "code": 200,
  "data": {
    "user_id": 1,
    "user_nick": "张三",
    "user_avatar": "/avatars/user1.png",
    "user_sign": "这是我的签名",
    "user_role": "user"
  },
  "success": true,
  "message": "请求成功"
}
```

### 错误码

| 状态码 | 说明 |
|--------|------|
| 404 | 用户不存在 |

---

## POST /update

更新当前登录用户的个人资料。只需传入需要修改的字段，未传入的字段保持不变。

> 用户名（`user_name`）不可通过此接口修改。

### 请求参数

| 字段 | 类型 | 必填 | 限制 | 说明 |
|------|------|------|------|------|
| `user_nick` | string | ❌ | 最多 20 字符 | 新的昵称 |
| `user_sign` | string | ❌ | 最多 100 字符 | 个性签名 |
| `user_avatar` | string | ❌ | — | 头像 URL（通过上传接口获取） |

### 请求示例

```bash
# 仅修改昵称
curl -X POST http://localhost:5000/api/user/update \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{ "user_nick": "新昵称" }'

# 修改昵称 + 签名 + 头像
curl -X POST http://localhost:5000/api/user/update \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "user_nick": "新昵称",
    "user_sign": "新的个性签名~",
    "user_avatar": "/uploads/2026-03-05/abc123.png"
  }'
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": { "success": true },
  "success": true,
  "message": "请求成功"
}
```

---

## POST /changePassword

修改当前登录用户的密码。必须提供正确的原密码进行验证。

### 请求参数

| 字段 | 类型 | 必填 | 限制 | 说明 |
|------|------|------|------|------|
| `oldPassword` | string | ✅ | — | 当前密码 |
| `newPassword` | string | ✅ | 6-20 字符 | 新密码 |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/user/changePassword \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "oldPassword": "123456",
    "newPassword": "newpass789"
  }'
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": { "success": true },
  "success": true,
  "message": "请求成功"
}
```

### 注意事项

- 修改成功后**现有 Token 仍然有效**，无需重新登录
- 密码以 MD5 加密存储
- 原密码错误返回 400

### 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 原密码错误或新密码不符合要求 |
| 401 | Token 无效或已过期 |

---

## 统一响应格式

所有 API 返回统一的 JSON 格式：

```json
{
  "code": 200,          // HTTP 状态码
  "data": { ... },      // 业务数据
  "success": true,      // 是否成功
  "message": "请求成功"  // 提示信息
}
```

### 通用错误码

| 状态码 | 说明 | 处理建议 |
|--------|------|----------|
| 200 | 请求成功 | — |
| 400 | 请求参数错误 | 检查请求体/查询参数 |
| 401 | 未授权 | Token 缺失、无效或已过期，需重新登录 |
| 403 | 权限不足 | 当前角色无权访问该接口 |
| 404 | 资源不存在 | 检查 ID 或路径 |
| 500 | 服务器内部错误 | 联系管理员 |
