/**
 * Bot 事件类型常量定义
 * 共 22 种事件，分 6 组
 */

// ==================== 事件 Key 常量 ====================

export const BOT_EVENTS = {
  // 💬 消息事件
  MESSAGE_TEXT: 'message.text',
  MESSAGE_IMAGE: 'message.image',
  MESSAGE_FILE: 'message.file',
  MESSAGE_RECALLED: 'message.recalled',
  MESSAGE_DELETED: 'message.deleted',
  MESSAGE_PINNED: 'message.pinned',
  MESSAGE_UNPINNED: 'message.unpinned',

  // 🎵 音乐事件
  MUSIC_CHOSEN: 'music.chosen',
  MUSIC_STARTED: 'music.started',
  MUSIC_SKIPPED: 'music.skipped',
  MUSIC_REMOVED: 'music.removed',
  MUSIC_ENDED: 'music.ended',
  MUSIC_QUEUE_EMPTY: 'music.queue_empty',

  // 👥 成员事件
  MEMBER_JOINED: 'member.joined',
  MEMBER_LEFT: 'member.left',
  MEMBER_KICKED: 'member.kicked',
  MEMBER_ROLE_CHANGED: 'member.role_changed',
  MEMBER_BANNED: 'member.banned',

  // 🏠 房间事件
  ROOM_UPDATED: 'room.updated',
  ROOM_CREATED: 'room.created',

  // 🤖 Bot 事件 (已有，兼容保留)
  BOT_COMMAND: 'bot.command',
  BOT_CALLBACK_QUERY: 'bot.callback_query',
  BOT_MENTIONED: 'bot.mentioned',

  // 📢 系统事件
  SYSTEM_ANNOUNCEMENT: 'system.announcement',
} as const;

export type BotEventType = (typeof BOT_EVENTS)[keyof typeof BOT_EVENTS];

// ==================== 事件分组 ====================

export const BOT_EVENT_GROUPS = {
  message: {
    name: '消息事件',
    icon: '💬',
    events: [
      BOT_EVENTS.MESSAGE_TEXT,
      BOT_EVENTS.MESSAGE_IMAGE,
      BOT_EVENTS.MESSAGE_FILE,
      BOT_EVENTS.MESSAGE_RECALLED,
      BOT_EVENTS.MESSAGE_DELETED,
      BOT_EVENTS.MESSAGE_PINNED,
      BOT_EVENTS.MESSAGE_UNPINNED,
    ],
  },
  music: {
    name: '音乐事件',
    icon: '🎵',
    events: [
      BOT_EVENTS.MUSIC_CHOSEN,
      BOT_EVENTS.MUSIC_STARTED,
      BOT_EVENTS.MUSIC_SKIPPED,
      BOT_EVENTS.MUSIC_REMOVED,
      BOT_EVENTS.MUSIC_ENDED,
      BOT_EVENTS.MUSIC_QUEUE_EMPTY,
    ],
  },
  member: {
    name: '成员事件',
    icon: '👥',
    events: [
      BOT_EVENTS.MEMBER_JOINED,
      BOT_EVENTS.MEMBER_LEFT,
      BOT_EVENTS.MEMBER_KICKED,
      BOT_EVENTS.MEMBER_ROLE_CHANGED,
      BOT_EVENTS.MEMBER_BANNED,
    ],
  },
  room: {
    name: '房间事件',
    icon: '🏠',
    events: [BOT_EVENTS.ROOM_UPDATED, BOT_EVENTS.ROOM_CREATED],
  },
  bot: {
    name: 'Bot 事件',
    icon: '🤖',
    events: [BOT_EVENTS.BOT_COMMAND, BOT_EVENTS.BOT_CALLBACK_QUERY, BOT_EVENTS.BOT_MENTIONED],
  },
  system: {
    name: '系统事件',
    icon: '📢',
    events: [BOT_EVENTS.SYSTEM_ANNOUNCEMENT],
  },
};

// ==================== 事件元数据 ====================

export interface BotEventDefinition {
  key: string;
  name: string;
  group: string;
  description: string;
  scope: 'room' | 'global';
  payload_example: Record<string, any>;
}

export const BOT_EVENT_DEFINITIONS: BotEventDefinition[] = [
  // 💬 消息事件
  {
    key: BOT_EVENTS.MESSAGE_TEXT,
    name: '文本消息',
    group: 'message',
    description: '用户在房间内发送了一条文本消息',
    scope: 'room',
    payload_example: {
      room_id: 888,
      message: { id: 1, message_content: '{"text":"你好"}', message_type: 1 },
      user_info: { id: 1, user_nick: '张三', user_avatar: '/avatar.jpg', user_role: 'user' },
    },
  },
  {
    key: BOT_EVENTS.MESSAGE_IMAGE,
    name: '图片消息',
    group: 'message',
    description: '用户在房间内发送了一条图片消息',
    scope: 'room',
    payload_example: {
      room_id: 888,
      message: { id: 2, message_content: '{"img":"https://..."}', message_type: 2 },
      user_info: { id: 1, user_nick: '张三' },
    },
  },
  {
    key: BOT_EVENTS.MESSAGE_FILE,
    name: '文件消息',
    group: 'message',
    description: '用户在房间内发送了一条文件消息',
    scope: 'room',
    payload_example: {
      room_id: 888,
      message: { id: 3, message_type: 3 },
      user_info: { id: 1, user_nick: '张三' },
    },
  },
  {
    key: BOT_EVENTS.MESSAGE_RECALLED,
    name: '消息撤回',
    group: 'message',
    description: '用户撤回了自己发送的消息',
    scope: 'room',
    payload_example: { room_id: 888, message_id: 42, user_info: { id: 1, user_nick: '张三' } },
  },
  {
    key: BOT_EVENTS.MESSAGE_DELETED,
    name: '消息删除',
    group: 'message',
    description: '管理员删除了一条消息',
    scope: 'room',
    payload_example: { room_id: 888, message_id: 42, operator: { id: 10, user_nick: '管理员' } },
  },
  {
    key: BOT_EVENTS.MESSAGE_PINNED,
    name: '消息置顶',
    group: 'message',
    description: '消息被置顶到房间顶部',
    scope: 'room',
    payload_example: { room_id: 888, message_id: 42, operator: { id: 10, user_nick: '管理员' } },
  },
  {
    key: BOT_EVENTS.MESSAGE_UNPINNED,
    name: '取消置顶',
    group: 'message',
    description: '房间置顶消息被取消',
    scope: 'room',
    payload_example: { room_id: 888, operator: { id: 10, user_nick: '管理员' } },
  },

  // 🎵 音乐事件
  {
    key: BOT_EVENTS.MUSIC_CHOSEN,
    name: '点歌',
    group: 'music',
    description: '有用户在房间内点歌',
    scope: 'room',
    payload_example: {
      room_id: 888,
      music_info: { music_mid: 'abc123', music_name: '晴天', music_singer: '周杰伦' },
      user_info: { id: 1, user_nick: '张三' },
      queue_position: 3,
    },
  },
  {
    key: BOT_EVENTS.MUSIC_STARTED,
    name: '开始播放',
    group: 'music',
    description: '开始播放新的歌曲',
    scope: 'room',
    payload_example: {
      room_id: 888,
      music_info: { music_mid: 'abc123', music_name: '晴天', music_singer: '周杰伦' },
      duration: 269,
    },
  },
  {
    key: BOT_EVENTS.MUSIC_SKIPPED,
    name: '切歌',
    group: 'music',
    description: '当前播放的歌曲被切换',
    scope: 'room',
    payload_example: {
      room_id: 888,
      music_info: { music_name: '晴天', music_singer: '周杰伦' },
      operator: { id: 10, user_nick: '房主' },
    },
  },
  {
    key: BOT_EVENTS.MUSIC_REMOVED,
    name: '歌曲移除',
    group: 'music',
    description: '歌曲从播放队列被移除',
    scope: 'room',
    payload_example: {
      room_id: 888,
      music_info: { music_name: '晴天', music_singer: '周杰伦' },
      operator: { id: 10, user_nick: '房主' },
    },
  },
  {
    key: BOT_EVENTS.MUSIC_ENDED,
    name: '播放结束',
    group: 'music',
    description: '歌曲自然播放完毕',
    scope: 'room',
    payload_example: {
      room_id: 888,
      music_info: { music_name: '晴天', music_singer: '周杰伦' },
      next_music: { music_name: '七里香', music_singer: '周杰伦' },
    },
  },
  {
    key: BOT_EVENTS.MUSIC_QUEUE_EMPTY,
    name: '队列清空',
    group: 'music',
    description: '歌曲播放队列已清空',
    scope: 'room',
    payload_example: { room_id: 888 },
  },

  // 👥 成员事件
  {
    key: BOT_EVENTS.MEMBER_JOINED,
    name: '用户加入',
    group: 'member',
    description: '有用户加入了房间',
    scope: 'room',
    payload_example: {
      room_id: 888,
      user_info: { id: 5, user_nick: '新用户', user_avatar: '/avatar.jpg' },
      online_count: 12,
    },
  },
  {
    key: BOT_EVENTS.MEMBER_LEFT,
    name: '用户离开',
    group: 'member',
    description: '有用户离开了房间',
    scope: 'room',
    payload_example: {
      room_id: 888,
      user_info: { id: 5, user_nick: '新用户' },
      online_count: 11,
    },
  },
  {
    key: BOT_EVENTS.MEMBER_KICKED,
    name: '用户被踢',
    group: 'member',
    description: '用户被管理员踢出房间',
    scope: 'room',
    payload_example: {
      room_id: 888,
      target_user: { id: 5, user_nick: '违规用户' },
      operator: { id: 10, user_nick: '管理员' },
      reason: '发布广告',
    },
  },
  {
    key: BOT_EVENTS.MEMBER_ROLE_CHANGED,
    name: '角色变更',
    group: 'member',
    description: '用户在房间中的角色发生变更（如设为/取消房管）',
    scope: 'room',
    payload_example: {
      room_id: 888,
      user_info: { id: 5, user_nick: '张三' },
      old_role: 'user',
      new_role: 'moderator',
      operator: { id: 10, user_nick: '房主' },
    },
  },
  {
    key: BOT_EVENTS.MEMBER_BANNED,
    name: '用户封禁',
    group: 'member',
    description: '用户被系统封禁',
    scope: 'global',
    payload_example: {
      user_info: { id: 5, user_nick: '违规用户' },
      operator: { id: 10, user_nick: '管理员' },
    },
  },

  // 🏠 房间事件
  {
    key: BOT_EVENTS.ROOM_UPDATED,
    name: '房间信息更新',
    group: 'room',
    description: '房间基本信息被修改（名称、公告、背景等）',
    scope: 'room',
    payload_example: {
      room_id: 888,
      changes: { room_name: '新房间名', room_notice: '新公告' },
      operator: { id: 10, user_nick: '房主' },
    },
  },
  {
    key: BOT_EVENTS.ROOM_CREATED,
    name: '房间创建',
    group: 'room',
    description: '新房间被创建',
    scope: 'global',
    payload_example: {
      room_id: 999,
      room_info: { room_name: '新房间', room_user_id: 10 },
    },
  },

  // 🤖 Bot 事件
  {
    key: BOT_EVENTS.BOT_COMMAND,
    name: '命令触发',
    group: 'bot',
    description: '用户触发了 Bot 注册的 /命令',
    scope: 'room',
    payload_example: {
      room_id: 888,
      command: 'play',
      args: '晴天 周杰伦',
      message: { id: 50 },
      from_user: { id: 1, user_nick: '张三' },
      matched_pattern: '/play',
    },
  },
  {
    key: BOT_EVENTS.BOT_CALLBACK_QUERY,
    name: '按钮点击',
    group: 'bot',
    description: '用户点击了 Bot 消息中的 Inline Keyboard 按钮',
    scope: 'room',
    payload_example: {
      callback_query_id: 'cb_888_1709600000',
      from: { user_id: 1, user_nick: '张三' },
      message_id: 50,
      callback_data: 'action:confirm',
      room_id: 888,
    },
  },
  {
    key: BOT_EVENTS.BOT_MENTIONED,
    name: 'Bot 被@提及',
    group: 'bot',
    description: '用户在消息中 @了这个 Bot',
    scope: 'room',
    payload_example: {
      room_id: 888,
      message: { id: 50, message_content: '{"text":"@music_bot 播放晴天"}' },
      from_user: { id: 1, user_nick: '张三' },
    },
  },

  // 📢 系统事件
  {
    key: BOT_EVENTS.SYSTEM_ANNOUNCEMENT,
    name: '系统公告',
    group: 'system',
    description: '管理员发布了新的系统公告',
    scope: 'global',
    payload_example: {
      announcement_id: 1,
      title: '系统维护通知',
      content: '今晚 22:00 - 23:00 将进行系统维护...',
    },
  },
];

// ==================== 辅助函数 ====================

/** 获取所有事件 key 列表 */
export function getAllEventKeys(): string[] {
  return BOT_EVENT_DEFINITIONS.map((d) => d.key);
}

/** 验证事件 key 是否合法 */
export function isValidEventKey(key: string): boolean {
  return BOT_EVENT_DEFINITIONS.some((d) => d.key === key);
}

/** 按组获取事件定义 */
export function getEventsByGroup(group: string): BotEventDefinition[] {
  return BOT_EVENT_DEFINITIONS.filter((d) => d.group === group);
}
