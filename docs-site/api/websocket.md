# WebSocket 事件

> 连接地址: `ws://localhost:5000/chat` · 协议: Socket.IO 4

## 连接方式

### 基础连接

```javascript
import io from 'socket.io-client';

const socket = io('http://localhost:5000/chat', {
  query: {
    token: 'your_jwt_token',   // JWT 认证（必须）
    room_id: 888,              // 要加入的房间 ID（必须）
  },
  transports: ['websocket'],   // 推荐直接使用 WebSocket 协议
});

socket.on('connect', () => {
  console.log('已连接:', socket.id);
});

socket.on('connect_error', (err) => {
  console.log('连接失败:', err.message);
});
```

### 连接认证流程

```
客户端发起连接（携带 token + room_id）
       ↓
服务端 handleConnection 验证 JWT Token
       ↓
  Token 有效？ ── 否 ──→ 断开连接
       ↓ 是
  房间需要密码？ ── 是 ──→ 触发 roomPasswordRequired 事件
       ↓ 否
  加入 Socket.IO Room
       ↓
  initRoom: 初始化个人信息、歌曲队列、当前播放时间
       ↓
  通知房间内其他用户：有新用户加入
       ↓
  推送 connectSuccess 事件给客户端
```

| 场景 | 结果 |
|------|------|
| Token 有效，房间公开 | 连接成功，自动加入房间 |
| Token 无效/过期 | 连接被拒绝，客户端收到 `connect_error` |
| 房间需要密码 | 触发 `roomPasswordRequired` 事件，等待客户端提交密码 |
| 房间不存在 | 自动创建房间并加入 |

### connectSuccess 事件数据

连接成功后，服务端推送完整的房间初始状态：

```javascript
socket.on('connectSuccess', (data) => {
  console.log('房间信息:', data.roomInfo);
  console.log('在线用户:', data.onlineUsers);
  console.log('当前音乐:', data.musicState);
});
```

```json
{
  "roomInfo": {
    "room_id": 888,
    "room_name": "音乐小屋",
    "room_notice": "欢迎！",
    "room_user_id": 1,
    "room_bg": null
  },
  "onlineUsers": [
    {
      "id": 1,
      "user_nick": "张三",
      "user_avatar": "/avatars/user1.png",
      "user_role": "user",
      "is_moderator": false
    }
  ],
  "musicState": {
    "currentMusic": {
      "music_name": "晴天",
      "music_singer": "周杰伦",
      "playUrl": "https://webfs.tx.kugou.com/xxx.mp3",
      "music_cover": "https://imge.kugou.com/..."
    },
    "queue": [],
    "progress": 45.5,
    "lyrics": [
      { "time": "0", "lineLyric": "晴天 - 周杰伦" },
      { "time": "2", "lineLyric": "故事的小黄花..." }
    ]
  }
}
```

---

## 客户端 → 服务端 事件

### <span class="ws-event">message</span> 发送消息

服务端处理流程：
1. **封禁检查** — 检查发送者 `user_status`，被封禁用户无法发送
2. **敏感词过滤** — 文本消息经过 `adminService.filterSensitiveWords()` 过滤
3. **消息存储** — 保存到 `tb_message` 表
4. **房管标识** — 查询发送者是否为房管，附加 `is_moderator` 标识
5. **广播消息** — 通过 `socket.to(room_id).emit('message', ...)` 推送给房间所有人
6. **Bot 事件** — 触发 `message.text` / `message.image` Bot 事件
7. **命令检测** — 如果消息以 `/` 开头，触发 Bot 斜杠命令处理

```javascript
socket.emit('message', {
  message_type: 1,                   // 1=文字, 2=图片, 3=表情包
  message_content: JSON.stringify({  // 内容（JSON 字符串）
    text: 'Hello!',
  }),
  quote_message: {                   // 引用消息（可选）
    id: 456,
    message_content: '被引用的消息',
    message_type: 1,
    user_info: { id: 2, user_nick: '李四' },
  },
});
```

**消息类型对照：**

| message_type | 说明 | message_content 格式 |
|--------------|------|----------------------|
| `1` | 文字消息 | `{ "text": "消息内容" }` 的 JSON 字符串 |
| `2` | 图片消息 | `{ "url": "/uploads/xxx.png" }` 的 JSON 字符串 |
| `3` | 表情包 | 表情包 URL |

### <span class="ws-event">chooseMusic</span> 点歌

```javascript
socket.emit('chooseMusic', {
  music_mid: 'a1b2c3d4',          // 歌曲唯一标识（hash/id）
  music_name: '晴天',              // 歌名
  music_singer: '周杰伦',          // 歌手
  music_duration: 269,             // 时长（秒）
  source: 'kugou',                 // kugou / netease
});
```

服务端流程：
1. 检查权限（`music.choose`）
2. 查询播放地址和歌词
3. 加入房间播放队列
4. 如果队列为空则立即播放，否则排队
5. 广播 `chooseMusic` 事件通知房间
6. 触发 Bot `music.chosen` 事件

### <span class="ws-event">cutMusic</span> 切歌

```javascript
socket.emit('cutMusic', {
  music_name: '晴天',
  music_singer: '周杰伦',
  choose_user_id: 1,              // 点歌者 ID
});
```

**权限规则：**
- 普通用户：只能切自己点的歌（`music.cut_own`）
- 房管/房主：可以切任何人的歌（`music.cut_any`）

### <span class="ws-event">removeQueueMusic</span> 移除队列中的歌

```javascript
socket.emit('removeQueueMusic', {
  music_mid: 'a1b2c3d4',
  music_name: '晴天',
  music_singer: '周杰伦',
});
```

### <span class="ws-event">recallMessage</span> 撤回消息

```javascript
socket.emit('recallMessage', {
  id: 123,                        // 消息 ID
  user_nick: '张三',              // 撤回提示用
});
```

服务端处理：
1. 验证消息是否属于当前用户
2. 检查消息是否在 **2 分钟**内（普通用户限制）
3. 更新 `message_status` 为 `-1`（已撤回）
4. 广播撤回事件给房间所有人

> 房管/管理员可以撤回**任何人、任何时间**的消息（无 2 分钟限制）。

### <span class="ws-event">deleteMessage</span> 管理员删除消息

```javascript
socket.emit('deleteMessage', {
  message_id: 123,
});
```

> 需要管理员或房管权限。更新 `message_status` 为 `-2`。

### <span class="ws-event">kickUser</span> 踢出用户

```javascript
socket.emit('kickUser', {
  target_user_id: 5,
  reason: '违规发言',
});
```

服务端处理：
1. 验证操作者权限（房主/房管/管理员）
2. 权限等级检查：不能踢出同等级或更高等级的用户
3. 向被踢用户发送 `kicked` 事件
4. 断开被踢用户的 WebSocket 连接
5. 广播在线用户列表更新
6. 触发 Bot `member.kicked` 事件

### <span class="ws-event">updateRoomUserInfo</span> 实时更新用户信息

修改了昵称/头像后，通知房间内其他用户实时更新显示：

```javascript
socket.emit('updateRoomUserInfo', {
  user_id: 1,
  user_nick: '新昵称',
  user_avatar: '/uploads/new_avatar.png',
});
```

### <span class="ws-event">updateRoomInfo</span> 实时更新房间信息

```javascript
socket.emit('updateRoomInfo', {
  room_name: '新房间名',
  room_notice: '新公告',
});
```

### <span class="ws-event">callbackQuery</span> Bot 内联键盘点击

用户点击 Bot 消息中的按钮触发：

```javascript
socket.emit('callbackQuery', {
  callback_data: 'vote_yes',
  message: { id: 456, ... },
  bot_id: 1,
});
```

---

## 服务端 → 客户端 事件

### 通用事件

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| <span class="ws-event">connectSuccess</span> | 连接成功 | `roomInfo` + `onlineUsers` + `musicState` |
| <span class="ws-event">message</span> | 收到新消息 | 完整消息对象（含 `user_info` + `quote_info`） |
| <span class="ws-event">tips</span> | 系统提示 | `{ code: -1, msg: '提示内容' }` |

### 用户相关

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| <span class="ws-event">offline</span> | 用户离开房间 | `{ code: 1, on_line_user_list: [...], msg: '[张三]离开房间了' }` |
| <span class="ws-event">kicked</span> | 你被踢出房间 | `{ reason: '违规发言' }` |
| <span class="ws-event">roomPasswordRequired</span> | 房间需要密码 | `{ room_id: 888 }` |

### 消息相关

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| <span class="ws-event">recallMessage</span> | 消息被撤回 | `{ id: 123, user_nick: '张三' }` |
| <span class="ws-event">messageDeleted</span> | 消息被管理员删除 | `{ message_id: 123 }` |

### message 事件数据结构

```json
{
  "data": {
    "id": 123,
    "user_id": 1,
    "room_id": "888",
    "message_type": 1,
    "message_content": { "text": "Hello!" },
    "message_status": 1,
    "reply_markup": null,
    "mentions": null,
    "createdAt": "2026-03-05T10:00:00.000Z",
    "user_info": {
      "id": 1,
      "user_nick": "张三",
      "user_avatar": "/avatars/user1.png",
      "user_role": "user",
      "user_id": 1,
      "is_moderator": false
    },
    "quote_info": {
      "quote_user_nick": "李四",
      "quote_message_content": "被引用的消息",
      "quote_message_type": 1,
      "quote_message_id": 456,
      "quote_message_status": 1,
      "quote_user_id": 2
    }
  },
  "msg": "有一条新消息"
}
```

### 音乐相关

| 事件 | 触发时机 | 数据 |
|------|----------|------|
| <span class="ws-event">switchMusic</span> | 切换播放歌曲 | `musicInfo` + `playUrl` + `lyrics` + `queue` |
| <span class="ws-event">chooseMusic</span> | 有人点歌（加入队列） | `musicInfo` + `queue` + `user_nick` |

### 房间相关

| 事件 | 说明 |
|------|------|
| <span class="ws-event">updateRoomlist</span> | 房间列表更新（有新房间创建/关闭） |
| <span class="ws-event">updateRoomInfo</span> | 房间信息变更（名称/公告等） |
| <span class="ws-event">updateRoomUserInfo</span> | 房间内用户信息变更（昵称/头像） |

---

## 房间生命周期

```
用户加入 → 初始化房间数据（歌曲队列、在线列表）
              ↓
         房间运行中...（消息、点歌、切歌）
              ↓
最后一个用户离开 → 启动延迟关闭定时器
              ↓
         等待期间有人加入？ ─── 是 ──→ 取消定时器，继续运行
              ↓ 否
         清理房间数据（播放队列、在线列表、定时器）
```

> 房间不会立即关闭 — 当最后一个用户离开时，服务端启动延迟定时器。如果在延迟期间有新用户加入，定时器会被取消，房间继续保持。

---

## 敏感词过滤

所有文本消息在发送前经过敏感词过滤：

```
用户发送 "你好xxx世界"
       ↓
adminService.filterSensitiveWords("你好xxx世界")
       ↓
  blocked: false → 替换为 "你好***世界"，正常发送
  blocked: true  → 返回 tips 错误 "消息包含违规内容，无法发送"
```

---

## 完整前端示例

```javascript
import io from 'socket.io-client';

const token = localStorage.getItem('token');
const socket = io('http://localhost:5000/chat', {
  query: { token, room_id: 888 },
  transports: ['websocket'],
});

// ==================== 连接事件 ====================

socket.on('connectSuccess', ({ roomInfo, onlineUsers, musicState }) => {
  console.log('房间:', roomInfo.room_name);
  console.log('在线:', onlineUsers.length, '人');
  if (musicState.currentMusic) {
    console.log('正在播放:', musicState.currentMusic.music_name);
  }
});

socket.on('roomPasswordRequired', ({ room_id }) => {
  const password = prompt('请输入房间密码:');
  socket.emit('verifyRoomPassword', { room_id, password });
});

// ==================== 消息事件 ====================

socket.on('message', ({ data, msg }) => {
  const { user_info, message_content, message_type } = data;
  if (message_type === 1) {
    const text = typeof message_content === 'string'
      ? JSON.parse(message_content).text
      : message_content.text;
    console.log(`[${user_info.user_nick}]: ${text}`);
  }
});

socket.on('recallMessage', ({ id, user_nick }) => {
  console.log(`${user_nick} 撤回了一条消息 (ID: ${id})`);
});

socket.on('messageDeleted', ({ message_id }) => {
  console.log(`消息 ${message_id} 已被管理员删除`);
});

// ==================== 音乐事件 ====================

socket.on('switchMusic', ({ musicInfo, playUrl, lyrics }) => {
  console.log('切换到:', musicInfo.music_name);
  audioPlayer.src = playUrl;
  audioPlayer.play();
});

// ==================== 用户事件 ====================

socket.on('offline', ({ msg, on_line_user_list }) => {
  console.log(msg); // "[张三]离开房间了"
  updateOnlineList(on_line_user_list);
});

socket.on('kicked', ({ reason }) => {
  alert(`你被踢出房间: ${reason}`);
  socket.disconnect();
});

// ==================== 系统提示 ====================

socket.on('tips', ({ code, msg }) => {
  if (code === -1) {
    console.error('错误:', msg);
  } else {
    console.log('提示:', msg);
  }
});

// ==================== 发送操作 ====================

function sendMessage(text) {
  socket.emit('message', {
    message_type: 1,
    message_content: JSON.stringify({ text }),
  });
}

function sendImage(imageUrl) {
  socket.emit('message', {
    message_type: 2,
    message_content: JSON.stringify({ url: imageUrl }),
  });
}

function chooseMusic(music) {
  socket.emit('chooseMusic', {
    music_mid: music.music_mid,
    music_name: music.music_name,
    music_singer: music.music_singer,
    music_duration: music.music_duration,
    source: music.source,
  });
}
```
