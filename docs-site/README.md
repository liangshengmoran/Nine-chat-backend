# Nine-Chat 项目文档

> 🎵 实时在线音乐聊天室平台 — 完整部署与开发指南

## 项目简介

**Nine-Chat** 是一个功能完整的实时在线音乐聊天室平台，基于 NestJS + Vue 2 构建。用户可以创建房间、多人实时聊天、共享音乐播放。平台提供了完善的 Bot 机器人生态、动态 RBAC 权限系统，以及全功能管理后台。

### 主要特色

- **前后端分离**：后端 NestJS RESTful API + Socket.IO，前端 Vue 2 SPA
- **双音源支持**：同时支持酷狗音乐和网易云音乐，可自由切换
- **Bot 生态**：完整的 Bot 开发平台，提供 TypeScript 和 Python SDK
- **动态权限**：基于 RBAC 的细粒度权限控制，支持房间级别权限
- **零配置启动**：SQLite 模式无需安装数据库，开箱即用

## 核心功能

<div class="feature-grid">
  <div class="feature-card">
    <h4>💬 实时聊天</h4>
    <p>基于 WebSocket 的实时消息系统。支持文字、图片、表情包发送，消息引用回复，@提及用户，消息撤回，Markdown 格式渲染。</p>
  </div>
  <div class="feature-card">
    <h4>🎵 共享音乐</h4>
    <p>房间内多人共享播放队列。支持搜索点歌、切歌、移除、歌词同步、自动播放下一首。酷狗/网易云双音源，支持 VIP 歌曲授权。</p>
  </div>
  <div class="feature-card">
    <h4>🏠 房间系统</h4>
    <p>用户可创建独立房间。支持房间密码保护、房间公告、自定义背景、房管任命、踢人/封禁、在线用户列表实时更新。</p>
  </div>
  <div class="feature-card">
    <h4>🤖 Bot 机器人平台</h4>
    <p>完整的 Bot 开发平台。支持 22 种事件订阅、Webhook 推送（含签名校验和重试）、沙箱测试环境、斜杠命令注册、内联键盘按钮。</p>
  </div>
  <div class="feature-card">
    <h4>🔐 RBAC 权限管理</h4>
    <p>动态角色/权限系统。内置 7 个角色等级、45 个权限键，支持全局和房间级权限。管理员可在线创建角色、分配权限。</p>
  </div>
  <div class="feature-card">
    <h4>⚙️ 全功能管理后台</h4>
    <p>仪表盘数据统计、用户管理（封禁/改角色）、敏感词过滤、系统公告、用户反馈、邀请码、IP 黑名单、操作日志、数据导出。</p>
  </div>
</div>

## 技术栈

### 后端 (Backend)

| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | NestJS | 11.x | Node.js 后端框架，模块化架构 |
| 语言 | TypeScript | 5.x | 类型安全 |
| ORM | TypeORM | 0.3.x | 数据库对象关系映射 |
| 数据库 | MySQL / SQLite | 5.7+ / sql.js | 生产/开发双模式 |
| 实时通信 | Socket.IO | 4.x | WebSocket 封装 |
| 认证 | JWT | — | jsonwebtoken，7 天有效期 |
| 文档 | Swagger | — | @nestjs/swagger 自动生成 |
| 任务调度 | @nestjs/schedule | — | 定时任务 |

### 前端 (Frontend)

| 分类 | 技术 | 版本 | 说明 |
|------|------|------|------|
| 框架 | Vue | 2.7 | 渐进式前端框架 |
| UI 组件 | Element UI | 2.x | 桌面端组件库 |
| 状态管理 | Vuex | 3.x | 集中式状态管理 |
| 路由 | Vue Router | 3.x | 前端路由 |
| HTTP | Axios | — | HTTP 请求库 |
| 构建 | Vue CLI | 4.x | 构建工具 |

## 快速导航

| 文档 | 说明 | 推荐读者 |
|------|------|----------|
| 🚀 [快速开始](guide/quickstart.md) | 5 分钟启动项目 | 所有开发者 |
| 🚢 [部署指南](guide/deploy.md) | 生产环境部署 | 运维 / DevOps |
| 📋 [用户 API](api/user.md) | 注册/登录/用户接口 | 前端开发者 |
| 🤖 [Bot API](api/bot.md) | Bot 开发完整指南 | Bot 开发者 |
| 🔌 [WebSocket](api/websocket.md) | 实时通信事件 | 前端开发者 |
| 🔐 [权限系统](advanced/rbac.md) | RBAC 权限说明 | 后端开发者 |
| 🗄 [数据库](advanced/database.md) | 表结构设计 | 后端开发者 |

## 相关链接

- **Swagger 在线文档**：`http://localhost:5000/docs`（交互式 API 测试）
- **项目文档**：`http://localhost:5000/docs-site/`（本站）
