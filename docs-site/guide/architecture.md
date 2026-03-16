# 技术架构

> 系统整体架构、模块划分、目录结构、认证流程。

## 系统架构图

```
┌─────────────────────────────────────────────────────────┐
│                   客户端 (Browser)                       │
│           Vue 3.5 + Element Plus + Pinia              │
│           Socket.IO Client    Axios HTTP                │
└─────────────┬───────────────────────┬──────────────────┘
              │ WebSocket /chat        │ HTTP /api/*
              ▼                        ▼
┌─────────────────────────────────────────────────────────┐
│                    NestJS 11 后端                        │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │               中间件层 (Middleware)                │   │
│  │  AuthGuard → Interceptor → ValidationPipe         │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │
│  │ UserModule│ │ChatModule│ │MusicModule│ │ BotModule│  │
│  │ 注册/登录 │ │消息/房间  │ │搜索/播放  │ │API/事件  │  │
│  │ 个人信息  │ │WebSocket │ │歌词/收藏  │ │Webhook   │  │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │
│  ┌──────────┐ ┌──────────┐ ┌──────────────────────┐   │
│  │AdminModule│ │UploadMod│ │   PermissionModule    │   │
│  │用户管理   │ │文件上传  │ │ RBAC 权限（全局模块） │   │
│  │公告/敏感词│ │图片处理  │ │ 角色/权限/守卫        │   │
│  └──────────┘ └──────────┘ └──────────────────────┘   │
│  ┌──────────────────────────────────────────────────┐   │
│  │               OAuthModule                         │   │
│  │  OAuth 2.1 + PKCE (GitHub / Google)               │   │
│  └──────────────────────────────────────────────────┘   │
│                                                         │
│  ┌──────────────────────────────────────────────────┐   │
│  │                TypeORM 数据层                      │   │
│  │         Entity → Repository → Database            │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────┬───────────────────────────────┘
                          │
              ┌───────────┴───────────┐
              │  MySQL  或  SQLite    │
              └───────────────────────┘
```

## 后端目录结构

```
Nine-chat-backend/
├── src/
│   ├── main.ts                    # 应用入口，配置全局管道/拦截器
│   ├── app.module.ts              # 根模块，注册所有子模块
│   ├── common/                    # 公共模块
│   │   ├── entity/                # BaseEntity 基类（含 createTime/updateTime）
│   │   ├── entities/              # RBAC 实体
│   │   │   ├── role.entity.ts     # 角色表
│   │   │   ├── permission.entity.ts  # 权限表
│   │   │   ├── role-permission.entity.ts  # 角色-权限映射
│   │   │   └── user-role.entity.ts       # 用户-角色分配
│   │   ├── constants/             # 常量定义
│   │   │   ├── permissions.ts     # 45 个权限键
│   │   │   ├── roles.ts           # 7 个默认角色
│   │   │   └── bot-events.ts      # 22 种 Bot 事件
│   │   ├── services/
│   │   │   └── permission.service.ts  # 权限检查服务
│   │   └── permission.module.ts   # 权限模块（全局注册）
│   ├── config/
│   │   └── database.ts            # TypeORM 配置（MySQL/SQLite 自动切换）
│   ├── guard/
│   │   ├── auth.guard.ts          # JWT 认证守卫
│   │   └── admin.guard.ts         # 管理员权限守卫
│   ├── filters/
│   │   └── http-exception.filter.ts  # HTTP 异常统一处理
│   ├── interceptor/
│   │   └── transform.interceptor.ts  # 响应格式统一包装
│   ├── swagger/                   # Swagger 文档配置
│   ├── utils/                     # 工具函数
│   │   ├── spider.ts              # 网络请求工具
│   │   ├── token.ts               # JWT 签发/验证
│   │   ├── tools.ts               # 通用工具
│   │   └── initDatabase.ts        # 数据库初始化
│   └── modules/
│       ├── user/                  # 用户模块
│       │   ├── user.controller.ts
│       │   ├── user.service.ts
│       │   └── user.entity.ts
│       ├── chat/                  # 聊天模块
│       │   ├── chat.controller.ts
│       │   ├── chat.getaway.ts    # WebSocket 网关（核心！）
│       │   ├── chat.service.ts
│       │   ├── room.entity.ts
│       │   ├── message.entity.ts
│       │   └── room-moderator.entity.ts
│       ├── music/                 # 音乐模块
│       │   ├── music.controller.ts
│       │   ├── music-auth.controller.ts   # 音乐授权（扫码/Cookie）
│       │   ├── music.service.ts
│       │   ├── music.entity.ts
│       │   └── collect.entity.ts
│       ├── admin/                 # 管理后台
│       │   ├── admin.controller.ts  # 30+ 端点
│       │   ├── admin.service.ts
│       │   ├── announcement.entity.ts
│       │   ├── sensitive-word.entity.ts
│       │   ├── feedback.entity.ts
│       │   ├── invite-code.entity.ts
│       │   ├── ip-blacklist.entity.ts
│       │   └── operation-log.entity.ts
│       ├── bot/                   # Bot 平台
│       │   ├── bot.controller.ts  # Bot API（20+ 端点）
│       │   ├── bot.service.ts     # Bot 业务逻辑（含 Webhook/沙箱）
│       │   ├── bot.entity.ts
│       │   ├── bot-manager.entity.ts
│       │   ├── bot-update.entity.ts
│       │   ├── bot-scheduled-message.entity.ts
│       │   └── webhook-log.entity.ts
│       └── upload/                # 上传模块
│           ├── upload.controller.ts
│           └── upload.service.ts
│       └── oauth/                 # OAuth 第三方登录
│           ├── oauth.controller.ts  # 5 个端点
│           ├── oauth.service.ts     # OAuth 2.1 + PKCE
│           ├── oauth.entity.ts      # tb_oauth_account
│           ├── oauth.module.ts
│           └── dto/oauth.dto.ts
├── docs-site/                     # 项目文档（Docsify）
├── public/                        # 前端静态文件（一体化部署用）
├── data/                          # SQLite 数据目录
├── .env                           # 环境配置
└── package.json
```

## 前端目录结构

```
Nine-chat-frontend-v3/src/
├── App.vue                  # 根组件（el-config-provider 全局配置）
├── main.js                  # 入口，创建 Vue 应用实例
├── api/                     # API 请求封装（按模块分文件）
├── assets/                  # 静态资源（图片/字体/CSS）
│   └── css/                 # Less 样式文件（主题/reset）
├── components/              # 公共组件
│   ├── Barrage/             # 弹幕组件（自定义实现）
│   ├── Chat/                # 聊天核心组件
│   │   ├── ChatHeader/      # 头部（在线列表/房间/个人中心）
│   │   ├── ChatToolbar/     # 工具栏（表情/点歌/收藏）
│   │   ├── ChatMessageFrame/# 消息输入框
│   │   ├── MessagePanel/    # 消息列表面板
│   │   ├── MusicPlayer/     # 音乐播放器
│   │   ├── ChatLrc/         # 歌词同步显示
│   │   └── ChatProgress/    # 播放进度条
│   ├── Emotion/             # 表情包组件（多分类支持）
│   ├── ChatPopup/           # 通用弹出面板
│   └── PreImg/              # 图片预览
├── composables/             # 组合式函数
│   ├── useSocket.js         # Socket.IO 连接管理
│   └── useScrollToBottom.js # 滚动到底部
├── config/                  # 前端配置常量
├── icons/                   # SVG 图标
├── router/                  # Vue Router 路由配置
├── stores/                  # Pinia 状态管理
│   ├── user.js              # 用户状态
│   ├── room.js              # 房间状态
│   ├── message.js           # 消息状态
│   ├── music.js             # 音乐状态
│   ├── config.js            # 配置状态
│   └── ui.js                # UI 状态
├── utils/                   # 工具函数
└── views/                   # 页面组件
    ├── login.vue            # 登录
    ├── register.vue         # 注册
    ├── user.vue             # 用户中心
    └── Chat/index.vue       # 聊天主界面
```

## 认证流程

```
1. 用户注册/登录
       │
       ▼
2. 服务端验证 → 签发 JWT Token（有效期 7 天）
       │
       ▼
3. 前端存储 Token → localStorage
       │
       ├─── HTTP 请求：Authorization: Bearer <token>
       │    └── AuthGuard 解析 token，注入 user 到 request
       │
       └─── WebSocket 连接：query 参数携带 token
            └── ChatGateway 在 handleConnection 中验证
```

### OAuth 2.1 第三方登录

```
1. 前端获取可用提供商 GET /api/oauth/providers
       │
       ▼
2. 用户点击 OAuth 按钮 → 跳转 GET /api/oauth/:provider
       │
       ▼
3. 后端生成 PKCE (code_verifier + code_challenge)
   302 重定向到第三方授权页 (GitHub / Google)
       │
       ▼
4. 用户授权 → 第三方回调 /api/oauth/:provider/callback
       │
       ▼
5. 后端验证 state + code_verifier → 换取 access_token
   → 获取用户信息 → 匹配/创建本地用户 → 签发 JWT
       │
       ▼
6. 302 重定向到前端 /oauth/callback?token=xxx
       │
       ▼
7. 前端存储 Token → 进入聊天室
```

## 请求/响应流程

```
Client Request
    │
    ▼
AuthGuard          → 验证 JWT Token（部分接口跳过）
    │
    ▼
ValidationPipe     → DTO 验证（类型/必填/长度）
    │
    ▼
Controller         → 路由匹配，调用 Service
    │
    ▼
Service            → 业务逻辑，调用 Repository
    │
    ▼
TypeORM Repository → 数据库操作
    │
    ▼
TransformInterceptor → 统一响应格式包装
    │
    ▼
Client Response: { code: 200, data: {...}, success: true, message: "..." }
```

## 统一响应格式

所有 HTTP API 返回统一的 JSON 格式：

**成功响应：**

```json
{
  "code": 200,
  "data": { ... },
  "success": true,
  "message": "请求成功"
}
```

**错误响应：**

```json
{
  "code": 400,
  "data": null,
  "success": false,
  "message": "用户名已存在"
}
```

| 状态码 | 说明 |
|--------|------|
| 200 | 成功 |
| 400 | 请求参数错误 |
| 401 | 未认证 / Token 过期 |
| 403 | 权限不足 |
| 500 | 服务器内部错误 |
