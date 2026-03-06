# 配置说明

> 所有配置通过后端根目录 `.env` 文件管理，支持热修改（需重启服务生效）。

## 配置文件位置

```
Nine-chat-backend/.env
```

## 完整配置项

### 服务基础配置

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| `PORT` | HTTP 服务端口 | `5000` | |
| `PREFIX` | Swagger 文档路径 | `/docs` | |
| `NODE_ENV` | 运行环境 | `development` | |

### 数据库配置

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| `DB_TYPE` | 数据库类型 | `sqlite` | ✅ |
| `DB_SQLITE_PATH` | SQLite 文件路径 | `./data/nine-chat.sqlite` | |
| `DB_HOST` | MySQL 主机地址 | — | MySQL 模式必填 |
| `DB_PORT` | MySQL 端口 | `3306` | |
| `DB_USER` | MySQL 用户名 | — | MySQL 模式必填 |
| `DB_PASS` | MySQL 密码 | — | MySQL 模式必填 |
| `DB_DATABASE` | 数据库名称 | — | MySQL 模式必填 |

> [!TIP]
> `DB_TYPE` 支持 `sqlite` 和 `mysql` 两种值。SQLite 模式零配置即可运行，适合开发和小规模部署。

### 音乐服务配置

| 变量 | 说明 | 默认值 | 必填 |
|------|------|--------|------|
| `KUGOU_API_BASE` | 酷狗音乐 API 基础地址 | — | 使用酷狗时必填 |
| `KUGOU_TOKEN` | 酷狗认证 Token | — | 获取播放地址需要 |
| `KUGOU_USERID` | 酷狗认证 UserID | — | 获取播放地址需要 |
| `NETEASE_API_BASE` | 网易云音乐 API 基础地址 | — | 使用网易云时必填 |

### 房间配置

| 变量 | 说明 | 默认值 |
|------|------|--------|
| `ROOM_CLOSE_DELAY_MINUTES` | 空房间自动关闭延迟（分钟） | `5` |

---

## 配置示例

### 最小配置（SQLite + 酷狗）

```env
DB_TYPE=sqlite
PORT=5000
KUGOU_API_BASE=http://localhost:4000
```

### 完整生产配置

```env
# 服务
PORT=5000
NODE_ENV=production

# 数据库 - MySQL
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=nine_chat
DB_PASS=your_secure_password
DB_DATABASE=nine_chat

# 酷狗音乐
KUGOU_API_BASE=http://localhost:4000
KUGOU_TOKEN=your_kugou_token
KUGOU_USERID=your_kugou_userid

# 网易云音乐
NETEASE_API_BASE=http://localhost:4001

# 房间
ROOM_CLOSE_DELAY_MINUTES=10
```

## 数据库模式切换

系统通过 `DB_TYPE` 自动切换数据库驱动：

```
DB_TYPE=sqlite  →  使用 sql.js 驱动，数据存储在本地文件
DB_TYPE=mysql   →  使用 mysql2 驱动，连接远程/本地 MySQL
```

表结构完全一致，切换时只需修改 `.env`，无需改动代码。但数据不会自动迁移，切换前请手动导出/导入。
