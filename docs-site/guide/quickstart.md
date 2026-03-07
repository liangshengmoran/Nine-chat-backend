# 快速开始

> 5 分钟启动 Nine-Chat 项目，零配置即可运行。

## 环境要求

| 工具 | 最低版本 | 推荐版本 | 说明 |
|------|----------|----------|------|
| Node.js | 18.x | 20.x LTS | JavaScript 运行时 |
| npm | 9.x | 10.x | 包管理器 |
| Git | 2.x | 最新版 | 版本控制 |
| 数据库 | — | — | SQLite 模式无需安装 |

## 第一步：克隆项目

```bash
git clone https://github.com/your-repo/Nine-Chat.git
cd Nine-Chat
```

项目结构：

```
Nine-Chat/
├── Nine-chat-backend/        # 后端 (NestJS)
├── Nine-chat-frontend-v3/    # 前端 (Vue 3)
└── Nine-chat-sdk/            # Bot SDK
    ├── typescript/
    └── python/
```

## 第二步：启动后端

```bash
cd Nine-chat-backend
npm install
npm run dev
```

启动成功后终端显示：

```
API服务已经启动,服务请访问:http://localhost:5000/api
WebSocket服务已经启动,服务请访问:http://localhost:5000
swagger已经启动,服务请访问:http://localhost:5000/docs
项目文档服务请访问:http://localhost:5000/docs-site
```

> [!TIP]
> 默认使用 SQLite 数据库，数据文件自动创建在 `data/` 目录下，无需任何数据库配置。

## 第三步：启动前端

**打开新的终端窗口**：

```bash
cd Nine-chat-frontend-v3
npm install
npm run dev
```

启动成功后访问 `http://localhost:3000`。

## 第四步：验证

| 地址 | 说明 | 状态 |
|------|------|------|
| http://localhost:3000 | 前端页面 | 注册/登录入口 |
| http://localhost:5000/api | API 基础路径 | JSON 响应 |
| http://localhost:5000/docs | Swagger 文档 | 交互式 API 测试 |
| http://localhost:5000/docs-site | 项目文档（本站） | 完整文档 |
| ws://localhost:5000/chat | WebSocket | 实时通信 |

## 第五步：创建账号

1. 打开 http://localhost:3000
2. 点击"注册"，填写用户名、昵称、密码、邮箱
3. 注册成功后自动登录
4. 首次注册的用户为普通用户，可通过数据库手动将 `user_role` 改为 `super` 成为超级管理员

## 常用开发命令

```bash
# 后端
npm run dev              # 开发模式（热重载）
npm run build            # 生产构建
npm run start:prod       # 生产启动
npm run docs:serve       # 启动文档站（端口 4000）

# 前端
npm run dev              # 开发模式
npm run build            # 生产构建
npm run lint             # 代码检查
npm run lint:fix          # 代码检查并自动修复
```

## 下一步

- 📋 [配置说明](guide/config.md) — 自定义环境变量和数据库
- 🚢 [部署指南](guide/deploy.md) — 生产环境部署方案
- 🏗 [技术架构](guide/architecture.md) — 了解项目架构
