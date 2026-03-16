# OAuth2 第三方登录 API

> 基础路径: `/api/oauth` · OAuth 2.1 第三方登录（GitHub / Google）

## 概述

Nine-Chat 支持通过 OAuth 2.1（含 PKCE）协议进行第三方账号登录。当前支持 GitHub 和 Google 两个提供商，架构可扩展。

**安全特性：**
- OAuth 2.1 标准 + **PKCE**（Proof Key for Code Exchange，S256）
- 防 CSRF `state` 参数（含随机令牌，10 分钟有效）
- Token 交换包含 `code_verifier` 验证

## 接口概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| <span class="method-get">GET</span> | `/providers` | 获取可用 OAuth 提供商 | 无 |
| <span class="method-get">GET</span> | `/:provider` | 发起 OAuth 授权 | 无 |
| <span class="method-get">GET</span> | `/:provider/callback` | OAuth 回调处理 | 无 |
| <span class="method-get">GET</span> | `/accounts` | 已绑定的第三方账号 | <span class="auth-jwt">JWT</span> |
| <span class="method-post">POST</span> | `/unbind/:provider` | 解绑第三方账号 | <span class="auth-jwt">JWT</span> |

---

## 登录流程

```
1. 前端调用 GET /api/oauth/providers → 获取可用提供商
      │
      ▼
2. 用户点击登录按钮 → 跳转 GET /api/oauth/github
      │
      ▼
3. 后端生成 PKCE (code_verifier + code_challenge)
   生成 state 参数 → 302 重定向到 GitHub 授权页
      │
      ▼
4. 用户在 GitHub 页面授权
      │
      ▼
5. GitHub 回调 → GET /api/oauth/github/callback?code=xxx&state=yyy
      │
      ▼
6. 后端处理：
   ① 验证 state → 取出 code_verifier
   ② code + code_verifier → 换取 access_token
   ③ access_token → 获取 GitHub 用户信息
   ④ 匹配或创建本地用户
   ⑤ 签发 JWT Token
      │
      ▼
7. 302 重定向到前端 /oauth/callback?token=xxx
      │
      ▼
8. 前端存储 Token → 进入聊天室
```

---

## GET /providers

获取当前已配置的 OAuth 提供商列表。前端根据此接口动态显示登录按钮。

> 未在 `.env` 中配置 Client ID/Secret 的提供商不会出现在列表中。

### 请求示例

```bash
curl http://localhost:5000/api/oauth/providers
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    { "provider": "github", "name": "GitHub" },
    { "provider": "google", "name": "Google" }
  ],
  "success": true,
  "message": "请求成功"
}
```

> 如果所有提供商都未配置，返回空数组 `[]`。

---

## GET /:provider

重定向到第三方 OAuth 授权页面。

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `provider` | string | OAuth 提供商: `github` / `google` |

### 行为

直接在浏览器中访问，后端返回 **302 重定向**到第三方授权页。URL 包含：
- `client_id` — 应用标识
- `redirect_uri` — 回调地址
- `scope` — 请求权限
- `state` — CSRF + 路由令牌
- `code_challenge` — PKCE 挑战码（SHA-256）
- `code_challenge_method` — `S256`

### 请求示例

```
浏览器访问: http://localhost:5000/api/oauth/github
→ 302 重定向到: https://github.com/login/oauth/authorize?client_id=xxx&...
```

### 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 提供商未配置（.env 缺少对应 Client ID） |

---

## GET /:provider/callback

处理第三方 OAuth 回调。此接口由浏览器自动发起（第三方重定向），不建议手动调用。

### 查询参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `code` | string | 授权码 |
| `state` | string | CSRF 状态参数 |

### 用户匹配逻辑

| 情况 | 行为 |
|------|------|
| 已有 OAuth 绑定 | 直接以关联的本地用户身份登录 |
| 邮箱匹配已有账号 | 自动绑定该账号并登录 |
| 全新用户 | 自动创建本地账号（用户名 `gh_<id>`, 头像/昵称取自第三方） |

### 行为

**成功：** 302 重定向到 `{OAUTH_FRONTEND_URL}/oauth/callback?token=xxx`
- 新用户额外携带 `&new_user=1`

**失败：** 302 重定向到 `{OAUTH_FRONTEND_URL}/oauth/callback?error=<错误信息>`

### 错误情况

| 错误 | 说明 |
|------|------|
| `no_code` | 回调缺少授权码 |
| `OAuth 授权已过期` | PKCE state 过期（超过 10 分钟） |
| `OAuth 授权失败` | Token 交换失败 |
| `账号已被封禁` | 关联的本地账号处于封禁状态 |

---

## GET /accounts

获取当前登录用户已绑定的所有第三方 OAuth 账号。

### 请求示例

```bash
curl http://localhost:5000/api/oauth/accounts \
  -H "Authorization: Bearer <jwt_token>"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "provider": "github",
      "provider_username": "octocat",
      "provider_email": "octocat@github.com",
      "provider_avatar": "https://avatars.githubusercontent.com/u/1",
      "created_at": "2026-03-16T00:00:00.000Z"
    }
  ],
  "success": true,
  "message": "请求成功"
}
```

### 错误码

| 状态码 | 说明 |
|--------|------|
| 401 | 未登录 |

---

## POST /unbind/:provider

解除当前用户与指定第三方 OAuth 账号的绑定。

> 解绑后将无法通过该第三方账号登录。建议解绑前确保已设置密码或绑定其他 OAuth 账号。

### 路径参数

| 参数 | 类型 | 说明 |
|------|------|------|
| `provider` | string | 要解绑的提供商: `github` / `google` |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/oauth/unbind/github \
  -H "Authorization: Bearer <jwt_token>"
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

### 错误码

| 状态码 | 说明 |
|--------|------|
| 401 | 未登录 |
| 404 | 未找到该 OAuth 绑定 |

---

## 环境变量配置

在 `.env` 中配置 OAuth 提供商的 Client ID 和 Client Secret 即可启用。

```env
# GitHub OAuth (https://github.com/settings/developers)
GITHUB_CLIENT_ID=your_github_client_id
GITHUB_CLIENT_SECRET=your_github_client_secret
GITHUB_CALLBACK_URL=http://localhost:5000/api/oauth/github/callback

# Google OAuth (https://console.cloud.google.com/apis/credentials)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_CALLBACK_URL=http://localhost:5000/api/oauth/google/callback

# 前端回调地址
OAUTH_FRONTEND_URL=http://localhost:5173
```

> 仅配置了 Client ID/Secret 的提供商才会在 `/providers` 接口返回并在前端显示对应按钮。
