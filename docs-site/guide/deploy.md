# 部署指南

> 涵盖生产构建、一体化部署、Docker、MySQL、Nginx 反向代理等完整方案。

## 生产构建

### 后端构建

```bash
cd Nine-chat-backend
npm run build
```

构建产物在 `dist/` 目录，启动生产服务：

```bash
npm run start:prod
# 等价于: cross-env NODE_ENV=production node dist/main
```

### 前端构建

```bash
cd Nine-chat-frontend-v3
npm run build
```

构建产物在 `dist/` 目录，需要通过 Web 服务器（Nginx 等）托管。

---

## 部署方案

### 方案一：一体化部署（推荐入门）

将前端构建产物放入后端 `public/` 目录，通过 NestJS 的静态文件服务一并托管：

```bash
# 构建前端
cd Nine-chat-frontend-v3 && npm run build

# 复制到后端 public
cp -r dist/* ../Nine-chat-backend/public/

# 启动后端
cd ../Nine-chat-backend
npm run start:prod
```

此时 `http://localhost:5000` 即可同时访问前后端，**无需 Nginx**。

### 方案二：前后端分离（推荐生产）

前端通过 Nginx 托管，API 和 WebSocket 通过反向代理转发到后端。

```nginx
server {
    listen 80;
    server_name chat.yourdomain.com;

    # 前端静态文件
    location / {
        root /var/www/nine-chat/dist;
        try_files $uri $uri/ /index.html;
        gzip on;
        gzip_types text/css application/javascript application/json;
    }

    # API 反向代理
    location /api/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Swagger 文档
    location /docs {
        proxy_pass http://127.0.0.1:5000;
    }

    # WebSocket 反向代理（重要！）
    location /socket.io/ {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_read_timeout 86400;    # WebSocket 长连接超时
    }

    # 上传文件访问
    location /uploads/ {
        proxy_pass http://127.0.0.1:5000;
    }

    # 项目文档
    location /docs-site/ {
        proxy_pass http://127.0.0.1:5000;
    }
}
```

### 方案三：Docker 部署

```dockerfile
# Dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY Nine-chat-backend/package*.json ./
RUN npm install --production
COPY Nine-chat-backend/ .
RUN npm run build

FROM node:18-alpine
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/docs-site ./docs-site
COPY --from=builder /app/public ./public
COPY --from=builder /app/.env ./.env
EXPOSE 5000
CMD ["node", "dist/main"]
```

```bash
# 构建和运行
docker build -t nine-chat .
docker run -d -p 5000:5000 \
  -v nine-chat-data:/app/data \
  --name nine-chat \
  nine-chat
```

> [!TIP]
> 使用 `-v nine-chat-data:/app/data` 挂载数据卷，保证 SQLite 数据持久化。

---

## MySQL 模式

生产环境建议使用 MySQL 替代 SQLite。修改 `.env`：

```env
DB_TYPE=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=nine_chat
DB_PASS=your_secure_password
DB_DATABASE=nine_chat
```

创建数据库：

```sql
CREATE DATABASE nine_chat CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'nine_chat'@'localhost' IDENTIFIED BY 'your_secure_password';
GRANT ALL PRIVILEGES ON nine_chat.* TO 'nine_chat'@'localhost';
FLUSH PRIVILEGES;
```

> [!WARNING]
> TypeORM 默认 `synchronize: true` 会自动创建/修改表结构。**生产环境强烈建议关闭**，改用 migration 管理。

---

## 音乐 API 依赖

Nine-Chat 需要外部音乐 API 服务来搜索和播放歌曲：

| 服务 | 用途 | 环境变量 | 推荐部署 |
|------|------|----------|----------|
| 酷狗 API | 搜索/播放/歌词 | `KUGOU_API_BASE` | Docker / PM2 |
| 网易云 API | 搜索/播放/歌词 | `NETEASE_API_BASE` | Docker / PM2 |

这两个是独立的 Node.js 服务，需要单独部署和配置。详见 [配置说明](guide/config.md)。

---

## 进程管理（PM2）

生产环境推荐使用 PM2 管理 Node.js 进程：

```bash
npm install -g pm2

# 启动
pm2 start dist/main.js --name nine-chat

# 查看日志
pm2 logs nine-chat

# 重启 / 停止
pm2 restart nine-chat
pm2 stop nine-chat

# 开机自启
pm2 startup
pm2 save
```
