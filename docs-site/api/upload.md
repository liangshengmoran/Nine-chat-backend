# 上传 API

> 基础路径: `/api/upload` · 图片和文件上传

## 接口概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| <span class="method-post">POST</span> | `/file` | 上传文件 | 无（实际使用时建议登录） |

---

## POST /file

上传图片或文件到服务器。

### 请求格式

- **Content-Type**: `multipart/form-data`
- **表单字段名**: `file`

### 支持的文件格式

| 类型 | 格式 |
|------|------|
| 图片 | `jpg`, `jpeg`, `png`, `gif`, `webp`, `bmp` |

### 限制条件

| 限制 | 值 |
|------|------|
| 单文件大小 | **500KB** |
| Content-Type | `multipart/form-data` |
| 表单字段名 | 必须为 `file` |

### 存储路径说明

- 文件存储在 `/uploads/YYYY-MM-DD/` 目录下
- 文件名使用随机字符串防止冲突
- 返回的 `filePath` 为**相对路径**，前端需拼接服务器地址使用

### 请求示例

```bash
# curl 上传
curl -X POST http://localhost:5000/api/upload/file \
  -F "file=@/path/to/image.png"
```

```javascript
// 前端 JavaScript 上传
const formData = new FormData();
formData.append('file', fileInput.files[0]);

const response = await fetch('http://localhost:5000/api/upload/file', {
  method: 'POST',
  body: formData,
});
const result = await response.json();
console.log('文件路径:', result.data.filePath);
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "filePath": "/uploads/2026-03-05/abc123.png"
  },
  "success": true,
  "message": "请求成功"
}
```

### 前端使用上传结果

```javascript
// 拼接完整 URL
const fullUrl = `http://localhost:5000${result.data.filePath}`;

// 用作头像
await fetch('/api/user/update', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ user_avatar: result.data.filePath }),
});
```

### 使用场景

| 场景 | 说明 |
|------|------|
| 用户头像上传 | 上传后调用 `/api/user/update` 更新 `user_avatar` |
| 聊天图片消息 | 上传后通过 WebSocket 发送 `message_type: 'image'` 消息 |
| 房间背景图 | 上传后调用 `/api/chat/updateRoomInfo` 更新 `room_bg` |
| 反馈截图 | 上传后在反馈内容中附带图片链接 |

### 错误码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 | 上传失败 | 文件类型不支持或文件超过 500KB |
