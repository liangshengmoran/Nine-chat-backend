# Nine-Chat Backend

> 🎵 在线聊天室 + 音乐播放平台后端服务

![](./gitImgs/002.png)

## ✨ 特性

- 💬 实时聊天：文字、图片、表情包
- 🎵 同步听歌：共享歌单、实时播放
- 🎤 双音源支持：酷狗 + 网易云音乐
- 🏠 房间系统：官方房间 + 用户私有房间
- 🔐 权限管理：超管 > 管理员 > 房管 > 房主 > 普通用户
- 📦 轻量部署：支持 MySQL 和 **SQLite**

## 📦 技术栈

| 模块 | 版本 |
|------|------|
| NestJS | v11.x |
| TypeORM | v0.3.x |
| Socket.IO | v4.x |
| Swagger | v11.x |
| 数据库 | MySQL / SQLite |

## 🚀 快速开始

### 1. 安装依赖

```bash
pnpm install
```

### 2. 配置数据库

编辑 `.env` 文件：

```env
# 使用 SQLite（无需额外配置，开箱即用）
DB_TYPE=sqlite
DB_SQLITE_PATH=./data/nine-chat.sqlite

# 或使用 MySQL
DB_TYPE=mysql
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=your_password
DB_DATABASE=nine_chat
```

### 3. 配置音乐 API（可选）

如需使用酷狗音乐 API，需配置：

```env
KUGOU_API_BASE=http://your-kugou-api
KUGOU_TOKEN=your_token
KUGOU_USERID=your_userid

NETEASE_API_BASE=http://your-netease-api
```

### 4. 启动项目

```bash
# 开发模式
pnpm dev

# 生产构建
pnpm build
node dist/main.js

# 代码规范检查
pnpm lint
```

### 5. 访问服务

- **API**: http://localhost:5000/api
- **Swagger 文档**: http://localhost:5000/docs
- **WebSocket**: http://localhost:5000

## 📝 初始化说明

首次启动会自动：
- 创建超级管理员账户（用户名: `super`，密码: `123456`）
- 创建官方房间（ID: 888）
- 导入部分默认歌曲到曲库

## 🎵 音乐功能

### 音源支持
- **酷狗音乐**：搜索、播放、收藏
- **网易云音乐**：搜索、播放、收藏

### 点歌功能
- 搜索歌曲并点歌到播放队列
- 收藏歌曲到个人收藏夹
- 切歌（根据权限限制）
- 移除队列中的歌曲

## 🔐 权限系统

| 角色 | 权限 |
|------|------|
| super | 超级管理员，最高权限 |
| admin | 管理员，可管理所有房间 |
| owner | 房主，可管理自己的房间 |
| moderator | 房管，可在指定房间管理 |
| user | 普通用户 |

## 🔗 相关链接

- [前端项目](https://github.com/longyanjiang/Nine-chat-frontend)
- [在线体验](https://music-chat.mmmss.com/)

## 📸 项目截图

![](./gitImgs/001.jpg)
![](./gitImgs/003.jpg)
![](./gitImgs/004.jpg)

## 📖 更新历史

### 3.x (2026)
- ✅ 升级 NestJS 到 v11.x
- ✅ 升级 Swagger 到 v11.x
- ✅ 支持 SQLite 数据库（零配置启动）
- ✅ 完善 API 文档注解
- ✅ 新增酷狗 + 网易云双音源支持
- ✅ 新增房管（moderator）角色
- ✅ 优化权限系统
- ✅ ESLint 代码规范检查

### 2.x (2022)
- 个人私有房间
- 图片/文件发送
- 消息引用 & 撤回
- 三级权限系统
- 夜间/透明主题

### 1.x
- 基础聊天功能
- 在线点歌系统
- 实时歌单共享

## ⚠️ 免责声明

音乐数据来源于第三方 API，仅供学习交流使用，请勿用于商业用途。

## 📄 License

MIT
