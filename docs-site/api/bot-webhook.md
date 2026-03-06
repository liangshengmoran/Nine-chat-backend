# Webhook 指南

> Bot 事件推送机制 — 服务端主动将事件推送到 Bot 开发者的服务器。

## 工作原理

```
Nine-Chat 平台                              Bot 开发者服务器
┌────────────┐     POST + 签名验证          ┌────────────┐
│ 事件触发    │ ─────────────────────────→   │ Webhook URL │
│ (消息/音乐) │     JSON Payload            │ 处理事件    │
└────────────┘     X-Bot-Signature          └────────────┘
       │                                           │
       │         HTTP 200 OK                       │
       │ ←──────────────────────────────────────── │
       │                                    
   成功 ✓  或  失败 → 重试（最多 3 次）
```

## 配置 Webhook

创建 Bot 时设置 `webhook_url`，或后续更新：

```bash
PUT /api/bot/update
Authorization: Bearer <jwt_token>
{
  "bot_id": 1,
  "webhook_url": "https://your-server.com/bot/webhook"
}
```

> [!WARNING]
> Webhook URL 必须是 HTTPS 地址（生产环境），且能被 Nine-Chat 服务器正常访问。开发阶段可使用 HTTP 或 ngrok 等内网穿透工具。

## HTTP 请求格式

Nine-Chat 推送事件时的请求：

```http
POST /bot/webhook HTTP/1.1
Host: your-server.com
Content-Type: application/json
X-Bot-Signature: sha256=a1b2c3d4e5f6...
X-Bot-Id: 1
X-Event-Type: message.text
X-Delivery-Id: uuid-xxxx

{
  "event": "message.text",
  "timestamp": 1709000000000,
  "data": { ... }
}
```

## 签名验证

每个 Webhook 请求都携带 `X-Bot-Signature` 头，使用 HMAC-SHA256 算法基于 Bot Token 签名。**务必验证签名以防止伪造请求。**

### Node.js 验证

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(body, signature, botToken) {
  const expected = 'sha256=' + crypto
    .createHmac('sha256', botToken)
    .update(JSON.stringify(body))
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expected)
  );
}

// Express 中间件示例
app.post('/bot/webhook', (req, res) => {
  const signature = req.headers['x-bot-signature'];
  
  if (!verifyWebhookSignature(req.body, signature, BOT_TOKEN)) {
    return res.status(403).send('Invalid signature');
  }
  
  // 处理事件
  const { event, data } = req.body;
  console.log(`收到事件: ${event}`, data);
  
  res.status(200).send('OK');
});
```

### Python 验证

```python
import hmac
import hashlib
from flask import Flask, request

app = Flask(__name__)
BOT_TOKEN = 'your_bot_token'

def verify_signature(body: bytes, signature: str, token: str) -> bool:
    expected = 'sha256=' + hmac.new(
        token.encode(), body, hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(signature, expected)

@app.route('/bot/webhook', methods=['POST'])
def webhook():
    signature = request.headers.get('X-Bot-Signature', '')
    
    if not verify_signature(request.data, signature, BOT_TOKEN):
        return 'Invalid signature', 403
    
    event = request.json
    print(f"收到事件: {event['event']}", event['data'])
    
    return 'OK', 200
```

## 重试策略

| 次数 | 延迟 | 说明 |
|------|------|------|
| 第 1 次 | 立即 | 首次推送 |
| 第 2 次 | 10 秒后 | 首次超时或非 2xx |
| 第 3 次 | 60 秒后 | 二次失败 |
| 放弃 | — | 降级到 getUpdates 队列 |

> [!TIP]
> 如果 Webhook 持续失败，事件会自动存入 `getUpdates` 队列，Bot 可以通过长轮询获取。

## 调试工具

| 方法 | 路径 | 说明 |
|------|------|------|
| <span class="method-post">POST</span> | `/webhook/test` | 发送测试请求，验证连通性 |
| <span class="method-get">GET</span> | `/webhook/logs` | 查看推送日志（最近 100 条） |
| <span class="method-get">GET</span> | `/webhook/stats` | 推送统计（成功率/平均延迟） |

```bash
# 测试 Webhook 连通性
curl -X POST http://localhost:5000/api/bot/webhook/test \
  -H "Authorization: Bearer <bot_token>"
```

```json
{
  "code": 200,
  "data": {
    "status": "success",
    "response_time_ms": 125,
    "http_status": 200
  }
}
```

## getUpdates 降级

当 Webhook 不可用时，使用长轮询获取事件：

```bash
# 长轮询，最多等待 30 秒
GET /api/bot/getUpdates?timeout=30
Authorization: Bearer <bot_token>
```

返回自上次请求以来的所有事件，获取后自动清除。
