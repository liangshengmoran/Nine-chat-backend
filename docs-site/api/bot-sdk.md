# SDK 使用

> 官方提供 TypeScript 和 Python SDK，封装了 API 调用、事件处理和 Webhook 服务器。

## TypeScript SDK

### 安装

```bash
npm install @nine-chat/bot-sdk
```

### 快速开始

```typescript
import { NineChatBot } from '@nine-chat/bot-sdk';

const bot = new NineChatBot({
  token: 'bot_xxxxxxxxxxxx',
  baseUrl: 'http://localhost:5000/api/bot',
  webhookPort: 3001,           // Webhook 监听端口
  webhookPath: '/bot/webhook', // Webhook 路径
});

// 监听文字消息
bot.on('message.text', async (event) => {
  const { user_nick, content, room_id } = event.data;
  console.log(`[${user_nick}]: ${content}`);
  
  // 回复消息
  await bot.sendMessage({
    room_id,
    message_content: `收到: ${content}`,
  });
});

// 注册斜杠命令
bot.command('help', async (event) => {
  const { room_id } = event.data;
  await bot.sendMessage({
    room_id,
    message_content: [
      '🤖 **音乐助手帮助**',
      '',
      '`/help` - 显示此帮助',
      '`/play <歌名>` - 点歌',
      '`/top` - 热门歌曲',
      '`/queue` - 播放队列',
    ].join('\n'),
    parse_mode: 'markdown',
  });
});

// 自动点歌命令
bot.command('play', async (event) => {
  const { room_id, args } = event.data;
  
  if (!args) {
    await bot.sendMessage({ room_id, message_content: '请输入歌名: /play 晴天' });
    return;
  }
  
  await bot.chooseMusic({
    room_id,
    keyword: args,
    source: 'kugou',
  });
});

// 处理按钮点击
bot.on('bot.callback_query', async (event) => {
  const { callback_data, room_id } = event.data;
  
  switch (callback_data) {
    case 'random_play':
      await bot.chooseMusic({ room_id, keyword: '热门歌曲', source: 'kugou' });
      break;
    case 'help':
      await bot.sendMessage({ room_id, message_content: '输入 /help 查看帮助' });
      break;
  }
});

// 启动 Bot
bot.start();
console.log('🤖 Bot 已启动');
```

### 核心 API

```typescript
class NineChatBot {
  // 事件监听
  on(event: string, handler: (event: BotEvent) => Promise<void>): void;
  
  // 命令注册
  command(name: string, handler: (event: BotEvent) => Promise<void>): void;
  
  // 发送消息
  sendMessage(params: {
    room_id: number;
    message_content: string;
    parse_mode?: 'markdown' | 'text';
    reply_markup?: InlineKeyboard;
  }): Promise<Message>;
  
  // 点歌
  chooseMusic(params: {
    room_id: number;
    keyword?: string;
    music_mid?: string;
    source?: 'kugou' | 'netease';
  }): Promise<void>;
  
  // 获取房间信息
  getRoomInfo(roomId: number): Promise<RoomInfo>;
  
  // 获取在线成员
  getRoomMembers(roomId: number): Promise<Member[]>;
  
  // 启动（Webhook 模式）
  start(): void;
  
  // 启动（轮询模式）
  startPolling(): void;
}
```

---

## Python SDK

### 安装

```bash
pip install nine-chat-bot
```

### 快速开始

```python
from nine_chat_bot import NineChatBot

bot = NineChatBot(
    token='bot_xxxxxxxxxxxx',
    base_url='http://localhost:5000/api/bot',
    webhook_port=3001,
)

@bot.on('message.text')
async def on_message(event):
    """处理文字消息"""
    user_nick = event['data']['user_nick']
    content = event['data']['content']
    room_id = event['data']['room_id']
    
    print(f'[{user_nick}]: {content}')
    
    await bot.send_message(
        room_id=room_id,
        message_content=f'收到: {content}',
    )

@bot.command('help')
async def help_cmd(event):
    """显示帮助"""
    room_id = event['data']['room_id']
    help_text = """🤖 **音乐助手帮助**

`/help` - 显示此帮助
`/play <歌名>` - 点歌
`/top` - 热门歌曲"""
    
    await bot.send_message(
        room_id=room_id,
        message_content=help_text,
        parse_mode='markdown',
    )

@bot.command('play')
async def play_cmd(event):
    """点歌"""
    room_id = event['data']['room_id']
    args = event['data'].get('args', '')
    
    if not args:
        await bot.send_message(room_id=room_id, message_content='请输入歌名: /play 晴天')
        return
    
    await bot.choose_music(
        room_id=room_id,
        keyword=args,
        source='kugou',
    )

@bot.on('bot.callback_query')
async def on_callback(event):
    """处理按钮点击"""
    callback_data = event['data']['callback_data']
    room_id = event['data']['room_id']
    
    if callback_data == 'random_play':
        await bot.choose_music(room_id=room_id, keyword='热门', source='kugou')

# 启动 Bot
bot.run()
```

### 核心方法

| 方法 | 说明 |
|------|------|
| `bot.on(event, handler)` | 注册事件处理器（装饰器） |
| `bot.command(name, handler)` | 注册斜杠命令（装饰器） |
| `bot.send_message(...)` | 发送消息 |
| `bot.choose_music(...)` | 点歌 |
| `bot.get_room_info(id)` | 获取房间信息 |
| `bot.get_room_members(id)` | 获取在线成员 |
| `bot.run()` | 启动（Webhook 模式） |
| `bot.run_polling()` | 启动（轮询模式） |

---

## 选择推送模式

| 模式 | 优点 | 缺点 | 适用场景 |
|------|------|------|----------|
| **Webhook** | 实时性好，服务器主动推送 | 需要公网地址 | 生产环境 |
| **getUpdates** | 无需公网地址 | 有轮询延迟 | 开发调试 |

```typescript
// Webhook 模式（默认）
bot.start();

// 轮询模式
bot.startPolling();
```
