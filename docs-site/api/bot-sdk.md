# SDK 使用

> 官方提供 TypeScript 和 Python SDK，封装了 API 调用、事件处理、中间件、消息格式化和 Webhook 服务器。

## TypeScript SDK

### 安装

```bash
cd Nine-chat-sdk/typescript
npm install
npm run build
```

### 快速开始

```typescript
import { NineChatBot, Events } from '@nine-chat/bot-sdk';

const bot = new NineChatBot({
  token: 'bot_xxxxxxxxxxxx',
  apiUrl: 'http://localhost:5000/api/bot',
});

// 监听文字消息
bot.on(Events.MESSAGE_TEXT, async (ctx) => {
  console.log(`${ctx.user_nick}: ${ctx.text}`);
});

// 欢迎新成员
bot.on(Events.MEMBER_JOINED, async (ctx) => {
  await ctx.reply(`欢迎 ${ctx.user_nick}！🎉`);
});

// 注册斜杠命令
bot.command('help', async (ctx) => {
  await ctx.reply('可用命令:\n/help - 显示帮助\n/play - 点歌');
});

// 启动 Bot
bot.launch();
```

### 事件类型常量

使用 `Events` 常量代替手写字符串，获得 TypeScript 类型安全和 IDE 补全：

```typescript
import { Events, EventType } from '@nine-chat/bot-sdk';

bot.on(Events.MESSAGE_TEXT, ...)     // 代替 "message.text"
bot.on(Events.MEMBER_JOINED, ...)   // 代替 "member.joined"
bot.on(Events.MUSIC_STARTED, ...)   // 代替 "music.started"
bot.on(Events.CALLBACK_QUERY, ...)  // 代替 "callback_query"
bot.on(Events.ALL, ...)             // 通配符 "*"
```

**所有常量：** `MESSAGE_TEXT`, `MESSAGE_IMAGE`, `MESSAGE_FILE`, `MESSAGE_RECALLED`, `MESSAGE_DELETED`, `MEMBER_JOINED`, `MEMBER_LEFT`, `MEMBER_KICKED`, `MUSIC_CHOSEN`, `MUSIC_STARTED`, `MUSIC_SKIPPED`, `MUSIC_REMOVED`, `ROOM_UPDATED`, `BOT_COMMAND`, `CALLBACK_QUERY`, `ALL`

### 中间件

洋葱模型中间件，支持 `next()` 链式调用：

```typescript
// 日志中间件
bot.use(async (ctx, next) => {
  console.log(`[收到] ${ctx.event}`);
  await next();
  console.log(`[完成] ${ctx.event}`);
});

// 用户过滤中间件
bot.use(async (ctx, next) => {
  if (BANNED_USERS.includes(ctx.user_id)) return; // 阻止后续处理
  await next();
});
```

### 生命周期钩子

```typescript
bot.onReady(async () => {
  const info = await bot.getInfo();
  console.log(`Bot 已启动: ${info.data.bot_name}`);
});

bot.onError((ctx, err) => {
  console.error(`处理 ${ctx.event} 时出错:`, err);
});

bot.onShutdown(() => {
  console.log('Bot 已停止');
});
```

### 消息格式化工具

```typescript
import { Bold, Italic, Code, CodeBlock, Link, Mention, Escape } from '@nine-chat/bot-sdk';

await ctx.reply(
  `${Bold('标题')}\n` +
  `${Italic('斜体')} | ${Code('内联代码')}\n` +
  `${Link('链接', 'https://example.com')}\n` +
  `${Mention(123)}`,
  { parseMode: 'markdown' },
);
```

### 内联键盘

```typescript
import { InlineKeyboard } from '@nine-chat/bot-sdk';

const kb = new InlineKeyboard()
  .addRow(
    { text: '👍 赞同', callback_data: 'vote_yes' },
    { text: '👎 反对', callback_data: 'vote_no' },
  )
  .addRow(
    { text: '🔗 链接', url: 'https://example.com' },
  );

await bot.sendMessage(ctx.room_id, '投票:', { replyMarkup: kb.toJSON() });

bot.on(Events.CALLBACK_QUERY, async (ctx) => {
  await bot.answerCallbackQuery(ctx.data.callback_query_id, '已收到');
});
```

### 定时消息

```typescript
const result = await bot.scheduleMessage({
  roomId: 888,
  messageType: 'text',
  messageContent: '☀️ 早上好！',
  sendAt: '2026-03-07T08:00:00',
  repeat: 'daily',
  timezone: '+08:00',
});

await bot.cancelScheduledMessage(result.data.scheduled_id);
await bot.getScheduledMessages();
```

### 调试模式

```typescript
const bot = new NineChatBot({ token: 'bot_xxx', debug: true });
```

开启后打印: 请求 URL、请求体、响应状态码、响应体（前 200 字符）、事件详情。

### API 参考

#### 消息操作

| 方法 | 说明 |
|------|------|
| `sendMessage(roomId, content, options?)` | 发送消息（支持 Markdown/内联键盘/@提及/回复） |
| `editMessage(messageId, content)` | 编辑已发消息 |
| `deleteMessage(messageId)` | 撤回已发消息 |
| `getMessages(roomId, page?, pagesize?)` | 获取消息历史 |
| `sendDocument(roomId, fileUrl, ...)` | 发送文件消息 |

#### 聊天交互

| 方法 | 说明 |
|------|------|
| `sendChatAction(roomId, action?)` | 发送"正在输入"状态 |
| `answerCallbackQuery(id, text?, ...)` | 回应内联键盘按钮回调 |
| `pinMessage(roomId, messageId)` | 置顶消息 |
| `unpinMessage(roomId)` | 取消置顶 |

#### 房间与 Bot 信息

| 方法 | 说明 |
|------|------|
| `getInfo()` | 获取 Bot 自身信息 |
| `getRoomInfo(roomId)` | 获取房间信息 |
| `getRoomMembers(roomId)` | 获取房间在线成员 |
| `chooseMusic(roomId, musicMid, source?)` | 点歌 |

#### 定时消息

| 方法 | 说明 |
|------|------|
| `scheduleMessage(options)` | 创建定时/周期消息 |
| `cancelScheduledMessage(id)` | 取消定时消息 |
| `getScheduledMessages()` | 获取定时消息列表 |

#### 事件订阅 & Webhook

| 方法 | 说明 |
|------|------|
| `getSubscriptions()` | 获取事件订阅配置 |
| `setSubscriptions(events)` | 设置事件订阅 |
| `testWebhook()` | 测试 Webhook 连通性 |
| `getWebhookLogs(limit?)` | 获取投递日志 |
| `getWebhookStats()` | 获取投递统计 |

#### EventContext 便捷方法/属性

| 名称 | 说明 |
|------|------|
| `ctx.user_id` | 发送者用户 ID |
| `ctx.user_nick` | 发送者昵称 |
| `ctx.reply(text, options?)` | 快捷回复（自动引用原消息） |
| `ctx.sendMessage(...)` | 发送消息 |
| `ctx.editMessage(...)` | 编辑消息 |
| `ctx.deleteMessage(...)` | 撤回消息 |
| `ctx.sendDocument(...)` | 发送文件 |
| `ctx.chooseMusic(...)` | 点歌 |
| `ctx.sendChatAction(...)` | 发送聊天动作 |

### 错误处理

```typescript
import { BotAPIError, BotRateLimitError } from '@nine-chat/bot-sdk';

try {
  await bot.sendMessage(888, 'Hello!');
} catch (e) {
  if (e instanceof BotRateLimitError) {
    console.log('请求过于频繁');
  } else if (e instanceof BotAPIError) {
    console.log(`API 错误: [${e.status}] ${e.message}`);
  }
}
```

### TypeScript 类型

```typescript
import type {
  BotConfig, EventContext, EventType,
  SendMessageOptions, ScheduleMessageOptions,
  InlineKeyboardButton, InlineKeyboardMarkup,
} from '@nine-chat/bot-sdk';
```

### 示例 Bot

| 示例 | 文件 | 演示内容 |
|------|------|---------|
| Echo Bot | `examples/echo_bot.ts` | 事件/命令/中间件/生命周期 |
| Music Bot | `examples/music_bot.ts` | 点歌/内联键盘/回调 |
| Moderator Bot | `examples/moderator_bot.ts` | 过滤中间件/撤回/置顶/在线 |
| Scheduled Bot | `examples/scheduled_bot.ts` | 定时消息/Webhook 测试 |

---

## Python SDK

### 安装

```bash
cd Nine-chat-sdk/python
pip install -e .
```

### 快速开始

```python
from nine_chat_bot import NineChatBot, Events

bot = NineChatBot(
    token="bot_xxxxxxxxxxxx",
    api_url="http://localhost:5000/api/bot",
)

@bot.on(Events.MESSAGE_TEXT)
async def handle_text(ctx):
    """处理文字消息"""
    print(f"{ctx.user_nick}: {ctx.text}")

@bot.on(Events.MEMBER_JOINED)
async def welcome(ctx):
    """欢迎新成员"""
    await ctx.reply(f"欢迎 {ctx.user_nick}！🎉")

@bot.command("help")
async def help_cmd(ctx):
    """显示帮助"""
    await ctx.reply("可用命令:\n/help - 显示帮助\n/play - 点歌")

# 使用轮询模式启动
bot.run(mode="polling")
```

### 事件类型常量

```python
from nine_chat_bot import Events

@bot.on(Events.MESSAGE_TEXT)     # 代替 "message.text"
@bot.on(Events.MEMBER_JOINED)   # 代替 "member.joined"
@bot.on(Events.MUSIC_STARTED)   # 代替 "music.started"
@bot.on(Events.CALLBACK_QUERY)  # 代替 "callback_query"
@bot.on(Events.ALL)             # 通配符 "*"
```

### 中间件

洋葱模型中间件，按注册顺序从外到内执行：

```python
@bot.use
async def log_middleware(ctx, next):
    print(f"[收到] {ctx.event}")
    await next()  # 继续执行下一个中间件或事件处理
    print(f"[完成] {ctx.event}")

@bot.use
async def auth_middleware(ctx, next):
    if ctx.user_id in BANNED_USERS:
        return  # 不调用 next()，阻止后续处理
    await next()
```

### 生命周期钩子

```python
@bot.on_ready
async def ready():
    info = await bot.get_info()
    print(f"Bot 已启动: {info['data']['bot_name']}")

@bot.on_error
async def error_handler(ctx, err):
    print(f"处理 {ctx.event} 时出错: {err}")

@bot.on_shutdown
async def shutdown():
    print("Bot 已停止")
```

### 消息格式化工具

```python
from nine_chat_bot import Bold, Italic, Code, CodeBlock, Link, Mention, Escape

await ctx.reply(
    f"{Bold('标题')}\n"
    f"{Italic('斜体')} | {Code('内联代码')}\n"
    f"{Link('链接', 'https://example.com')}\n"
    f"{Mention(123)}",  # @提及用户 123
    parse_mode="markdown",
)
```

### 内联键盘

```python
from nine_chat_bot import InlineKeyboard, InlineKeyboardButton

kb = InlineKeyboard()
kb.add_row(
    InlineKeyboardButton("👍 赞同", callback_data="vote_yes"),
    InlineKeyboardButton("👎 反对", callback_data="vote_no"),
)
kb.add_row(
    InlineKeyboardButton("🔗 链接", url="https://example.com"),
)

await bot.send_message(ctx.room_id, "投票:", reply_markup=kb)

@bot.on(Events.CALLBACK_QUERY)
async def handle_cb(ctx):
    await bot.answer_callback_query(ctx.data["callback_query_id"], text="已收到")
```

### 定时消息

```python
result = await bot.schedule_message(
    room_id=888,
    message_type="text",
    message_content="☀️ 早上好！",
    send_at="2026-03-07T08:00:00",
    repeat="daily",     # once / daily / weekly
    timezone="+08:00",
)

# 取消定时消息
await bot.cancel_scheduled_message(result["data"]["scheduled_id"])

# 获取定时消息列表
await bot.get_scheduled_messages()
```

### 调试模式

```python
bot = NineChatBot(token="bot_xxx", debug=True)
```

开启后会打印详细日志：请求 URL、请求体、响应状态码、响应体（前 200 字符）、事件详情。

### Async Context Manager

```python
async with NineChatBot(token="bot_xxx") as bot:
    info = await bot.get_info()
    await bot.send_message(888, "Hello!")
# 退出时自动关闭 HTTP session
```

### API 参考

#### 消息操作

| 方法 | 说明 |
|------|------|
| `send_message(room_id, content, ...)` | 发送消息（支持 Markdown/内联键盘/@提及/回复） |
| `edit_message(message_id, content)` | 编辑已发消息 |
| `delete_message(message_id)` | 撤回已发消息 |
| `get_messages(room_id, page, pagesize)` | 获取消息历史 |
| `send_document(room_id, file_url, ...)` | 发送文件消息 |

#### 聊天交互

| 方法 | 说明 |
|------|------|
| `send_chat_action(room_id, action)` | 发送"正在输入"状态 |
| `answer_callback_query(id, text, ...)` | 回应内联键盘按钮回调 |
| `pin_message(room_id, message_id)` | 置顶消息 |
| `unpin_message(room_id)` | 取消置顶 |

#### 房间与 Bot 信息

| 方法 | 说明 |
|------|------|
| `get_info()` | 获取 Bot 自身信息 |
| `get_room_info(room_id)` | 获取房间信息 |
| `get_room_members(room_id)` | 获取房间在线成员 |
| `choose_music(room_id, music_mid, source)` | 点歌 |

#### 定时消息

| 方法 | 说明 |
|------|------|
| `schedule_message(room_id, ...)` | 创建定时/周期消息 |
| `cancel_scheduled_message(id)` | 取消定时消息 |
| `get_scheduled_messages()` | 获取定时消息列表 |

#### 事件订阅 & Webhook

| 方法 | 说明 |
|------|------|
| `get_subscriptions()` | 获取事件订阅配置 |
| `set_subscriptions(events)` | 设置事件订阅 |
| `test_webhook()` | 测试 Webhook 连通性 |
| `get_webhook_logs(limit)` | 获取投递日志 |
| `get_webhook_stats()` | 获取投递统计 |

#### EventContext 便捷方法/属性

| 名称 | 说明 |
|------|------|
| `ctx.user_id` | 发送者用户 ID |
| `ctx.user_nick` | 发送者昵称 |
| `ctx.reply(text, ...)` | 快捷回复（自动引用原消息） |
| `ctx.send_message(...)` | 发送消息 |
| `ctx.edit_message(...)` | 编辑消息 |
| `ctx.delete_message(...)` | 撤回消息 |
| `ctx.send_document(...)` | 发送文件 |
| `ctx.choose_music(...)` | 点歌 |
| `ctx.send_chat_action(...)` | 发送聊天动作 |

### 错误处理

```python
from nine_chat_bot import BotAPIError, BotRateLimitError

try:
    await bot.send_message(888, "Hello!")
except BotRateLimitError:
    print("请求过于频繁")
except BotAPIError as e:
    print(f"API 错误: [{e.status}] {e.message}")
```

### 示例 Bot

| 示例 | 文件 | 演示内容 |
|------|------|---------|
| Echo Bot | `examples/echo_bot.py` | 事件/命令/中间件/生命周期 |
| Music Bot | `examples/music_bot.py` | 点歌/内联键盘/回调 |
| Moderator Bot | `examples/moderator_bot.py` | 过滤中间件/撤回/置顶/在线 |
| Scheduled Bot | `examples/scheduled_bot.py` | 定时消息/Webhook 测试 |

---

## 选择推送模式

| 模式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Webhook** | 实时性好，服务器主动推送 | 需要公网地址 | 生产环境 |
| **getUpdates** | 无需公网地址 | 有轮询延迟 | 开发调试 |

```typescript
// TypeScript - Webhook 模式（默认）
bot.launch();

// TypeScript - 轮询模式
bot.launch({ mode: 'polling' });
```

```python
# Python - Webhook 模式（默认）
bot.run()

# Python - 轮询模式
bot.run(mode="polling")
```
