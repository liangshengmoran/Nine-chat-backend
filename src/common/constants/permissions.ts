/**
 * 动态权限系统 - 权限 Key 常量 + 默认角色-权限映射
 *
 * 共 7 组 45 项权限
 */

// ==================== 权限 Key 常量 ====================

export const PERM = {
  // ---- chat: 聊天权限（room 作用域）----
  CHAT_SEND_TEXT: 'chat.send_text',
  CHAT_SEND_IMAGE: 'chat.send_image',
  CHAT_SEND_EMOTICON: 'chat.send_emoticon',
  CHAT_SEND_FILE: 'chat.send_file',
  CHAT_USE_BOT_COMMAND: 'chat.use_bot_command',
  CHAT_QUOTE_MESSAGE: 'chat.quote_message',
  CHAT_RECALL_OWN: 'chat.recall_own',
  CHAT_RECALL_ANY: 'chat.recall_any',
  CHAT_VIEW_HISTORY: 'chat.view_history',
  CHAT_CLICK_INLINE_KEYBOARD: 'chat.click_inline_keyboard',

  // ---- music: 音乐权限（room 作用域）----
  MUSIC_CHOOSE: 'music.choose',
  MUSIC_CUT_OWN: 'music.cut_own',
  MUSIC_CUT_ANY: 'music.cut_any',
  MUSIC_REMOVE_OWN: 'music.remove_own',
  MUSIC_REMOVE_ANY: 'music.remove_any',
  MUSIC_COLLECT: 'music.collect',
  MUSIC_SEARCH: 'music.search',
  MUSIC_RECOMMEND: 'music.recommend',

  // ---- room: 房间管理权限（room 作用域）----
  ROOM_JOIN: 'room.join',
  ROOM_CREATE: 'room.create',
  ROOM_UPDATE_NOTICE: 'room.update_notice',
  ROOM_UPDATE_NAME: 'room.update_name',
  ROOM_UPDATE_BG: 'room.update_bg',
  ROOM_UPDATE_LOGO: 'room.update_logo',
  ROOM_UPDATE_PASSWORD: 'room.update_password',
  ROOM_BYPASS_PASSWORD: 'room.bypass_password',
  ROOM_KICK_USER: 'room.kick_user',
  ROOM_MANAGE_MODERATOR: 'room.manage_moderator',
  ROOM_TRANSFER_OWNERSHIP: 'room.transfer_ownership',

  // ---- user: 用户管理权限（global 作用域）----
  USER_VIEW_LIST: 'user.view_list',
  USER_VIEW_DETAIL: 'user.view_detail',
  USER_BAN: 'user.ban',
  USER_BATCH_BAN: 'user.batch_ban',
  USER_SET_ROLE: 'user.set_role',

  // ---- bot: Bot 管理权限（global 作用域）----
  BOT_CREATE: 'bot.create',
  BOT_APPROVE: 'bot.approve',
  BOT_SUSPEND: 'bot.suspend',
  BOT_DELETE: 'bot.delete',
  BOT_UPDATE_PERMISSIONS: 'bot.update_permissions',

  // ---- admin: 后台管理权限（global 作用域）----
  ADMIN_VIEW_DASHBOARD: 'admin.view_dashboard',
  ADMIN_MANAGE_ROOMS: 'admin.manage_rooms',
  ADMIN_MANAGE_MUSIC: 'admin.manage_music',
  ADMIN_MANAGE_MESSAGES: 'admin.manage_messages',
  ADMIN_MANAGE_ANNOUNCEMENTS: 'admin.manage_announcements',
  ADMIN_MANAGE_SENSITIVE_WORDS: 'admin.manage_sensitive_words',
  ADMIN_MANAGE_FEEDBACK: 'admin.manage_feedback',
  ADMIN_MANAGE_INVITE_CODES: 'admin.manage_invite_codes',
  ADMIN_MANAGE_IP_BLACKLIST: 'admin.manage_ip_blacklist',
  ADMIN_VIEW_LOGS: 'admin.view_logs',
  ADMIN_EXPORT_DATA: 'admin.export_data',

  // ---- system: 系统权限（global 作用域）----
  SYSTEM_MANAGE_ROLES: 'system.manage_roles',
  SYSTEM_ASSIGN_ROLES: 'system.assign_roles',
  SYSTEM_CLEANUP_DATA: 'system.cleanup_data',
} as const;

export type PermissionKey = (typeof PERM)[keyof typeof PERM];

// ==================== 权限项定义（用于 seed） ====================

export interface PermissionDef {
  perm_key: string;
  perm_name: string;
  perm_group: string;
  description: string;
  scope_type: 'global' | 'room';
  config_schema: Record<string, any> | null;
}

export const PERMISSION_DEFINITIONS: PermissionDef[] = [
  // == chat ==
  {
    perm_key: PERM.CHAT_SEND_TEXT,
    perm_name: '发送文本消息',
    perm_group: 'chat',
    description: '允许发送文字消息',
    scope_type: 'room',
    config_schema: { max_length: 500 },
  },
  {
    perm_key: PERM.CHAT_SEND_IMAGE,
    perm_name: '发送图片消息',
    perm_group: 'chat',
    description: '允许发送图片',
    scope_type: 'room',
    config_schema: { max_size_kb: 5120 },
  },
  {
    perm_key: PERM.CHAT_SEND_EMOTICON,
    perm_name: '发送表情包',
    perm_group: 'chat',
    description: '允许发送/搜索表情包',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.CHAT_SEND_FILE,
    perm_name: '发送文件消息',
    perm_group: 'chat',
    description: '允许发送文件',
    scope_type: 'room',
    config_schema: { max_size_kb: 10240 },
  },
  {
    perm_key: PERM.CHAT_USE_BOT_COMMAND,
    perm_name: '使用Bot命令',
    perm_group: 'chat',
    description: '允许使用 / 前缀的 Bot 命令',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.CHAT_QUOTE_MESSAGE,
    perm_name: '引用消息',
    perm_group: 'chat',
    description: '允许引用他人消息',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.CHAT_RECALL_OWN,
    perm_name: '撤回自己的消息',
    perm_group: 'chat',
    description: '允许在时限内撤回自己发送的消息',
    scope_type: 'room',
    config_schema: { time_limit_sec: 120 },
  },
  {
    perm_key: PERM.CHAT_RECALL_ANY,
    perm_name: '删除任何人的消息',
    perm_group: 'chat',
    description: '允许删除/撤回房间中任何人的消息',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.CHAT_VIEW_HISTORY,
    perm_name: '查看历史消息',
    perm_group: 'chat',
    description: '允许查看历史消息',
    scope_type: 'room',
    config_schema: { max_pages: -1 },
  },
  {
    perm_key: PERM.CHAT_CLICK_INLINE_KEYBOARD,
    perm_name: '点击内联键盘',
    perm_group: 'chat',
    description: '允许点击Bot消息中的内联键盘按钮',
    scope_type: 'room',
    config_schema: null,
  },
  // == music ==
  {
    perm_key: PERM.MUSIC_CHOOSE,
    perm_name: '点歌',
    perm_group: 'music',
    description: '允许在房间内点歌',
    scope_type: 'room',
    config_schema: { cooldown_sec: 8 },
  },
  {
    perm_key: PERM.MUSIC_CUT_OWN,
    perm_name: '切自己的歌',
    perm_group: 'music',
    description: '允许切掉自己点的歌',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.MUSIC_CUT_ANY,
    perm_name: '切任何人的歌',
    perm_group: 'music',
    description: '允许切掉任何人点的歌',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.MUSIC_REMOVE_OWN,
    perm_name: '移除自己的歌',
    perm_group: 'music',
    description: '允许从队列移除自己点的歌',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.MUSIC_REMOVE_ANY,
    perm_name: '移除任何人的歌',
    perm_group: 'music',
    description: '允许从队列移除任何人的歌',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.MUSIC_COLLECT,
    perm_name: '收藏歌曲',
    perm_group: 'music',
    description: '允许收藏歌曲',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.MUSIC_SEARCH,
    perm_name: '搜索歌曲',
    perm_group: 'music',
    description: '允许搜索歌曲',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.MUSIC_RECOMMEND,
    perm_name: '加入推荐曲库',
    perm_group: 'music',
    description: '收藏歌曲时自动加入推荐曲库',
    scope_type: 'room',
    config_schema: null,
  },
  // == room ==
  {
    perm_key: PERM.ROOM_JOIN,
    perm_name: '加入房间',
    perm_group: 'room',
    description: '允许加入房间',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_CREATE,
    perm_name: '创建房间',
    perm_group: 'room',
    description: '允许创建个人房间',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_UPDATE_NOTICE,
    perm_name: '修改房间公告',
    perm_group: 'room',
    description: '允许修改房间公告',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_UPDATE_NAME,
    perm_name: '修改房间名称',
    perm_group: 'room',
    description: '允许修改房间名称',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_UPDATE_BG,
    perm_name: '修改房间背景',
    perm_group: 'room',
    description: '允许修改房间背景图',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_UPDATE_LOGO,
    perm_name: '修改房间Logo',
    perm_group: 'room',
    description: '允许修改房间Logo',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_UPDATE_PASSWORD,
    perm_name: '设置房间密码',
    perm_group: 'room',
    description: '允许设置/修改房间密码',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_BYPASS_PASSWORD,
    perm_name: '免密进入房间',
    perm_group: 'room',
    description: '允许免密码进入任何房间',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_KICK_USER,
    perm_name: '踢出用户',
    perm_group: 'room',
    description: '允许将用户踢出房间',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_MANAGE_MODERATOR,
    perm_name: '管理房管',
    perm_group: 'room',
    description: '允许任命/移除房间管理员',
    scope_type: 'room',
    config_schema: null,
  },
  {
    perm_key: PERM.ROOM_TRANSFER_OWNERSHIP,
    perm_name: '转让房主',
    perm_group: 'room',
    description: '允许将房主身份转让给他人',
    scope_type: 'room',
    config_schema: null,
  },
  // == user ==
  {
    perm_key: PERM.USER_VIEW_LIST,
    perm_name: '查看用户列表',
    perm_group: 'user',
    description: '允许查看用户列表',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.USER_VIEW_DETAIL,
    perm_name: '查看用户详情',
    perm_group: 'user',
    description: '允许查看用户详细信息',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.USER_BAN,
    perm_name: '封禁用户',
    perm_group: 'user',
    description: '允许封禁/解封用户',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.USER_BATCH_BAN,
    perm_name: '批量封禁用户',
    perm_group: 'user',
    description: '允许批量封禁用户',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.USER_SET_ROLE,
    perm_name: '修改用户角色',
    perm_group: 'user',
    description: '允许修改用户系统角色',
    scope_type: 'global',
    config_schema: null,
  },
  // == bot ==
  {
    perm_key: PERM.BOT_CREATE,
    perm_name: '创建Bot',
    perm_group: 'bot',
    description: '允许创建Bot',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.BOT_APPROVE,
    perm_name: '审批Bot',
    perm_group: 'bot',
    description: '允许审批通过/拒绝Bot',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.BOT_SUSPEND,
    perm_name: '暂停Bot',
    perm_group: 'bot',
    description: '允许暂停/禁用Bot',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.BOT_DELETE,
    perm_name: '删除Bot',
    perm_group: 'bot',
    description: '允许删除Bot',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.BOT_UPDATE_PERMISSIONS,
    perm_name: '修改Bot权限',
    perm_group: 'bot',
    description: '允许修改Bot权限配置',
    scope_type: 'global',
    config_schema: null,
  },
  // == admin ==
  {
    perm_key: PERM.ADMIN_VIEW_DASHBOARD,
    perm_name: '查看仪表盘',
    perm_group: 'admin',
    description: '允许查看管理后台仪表盘',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_ROOMS,
    perm_name: '管理房间',
    perm_group: 'admin',
    description: '允许在管理后台编辑/删除任意房间',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_MUSIC,
    perm_name: '管理曲库',
    perm_group: 'admin',
    description: '允许在管理后台管理曲库',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_MESSAGES,
    perm_name: '管理消息',
    perm_group: 'admin',
    description: '允许在管理后台查看/删除/批量删除消息',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_ANNOUNCEMENTS,
    perm_name: '管理公告',
    perm_group: 'admin',
    description: '允许创建/编辑/删除系统公告',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_SENSITIVE_WORDS,
    perm_name: '管理敏感词',
    perm_group: 'admin',
    description: '允许管理敏感词库',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_FEEDBACK,
    perm_name: '管理反馈',
    perm_group: 'admin',
    description: '允许查看和回复用户反馈',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_INVITE_CODES,
    perm_name: '管理邀请码',
    perm_group: 'admin',
    description: '允许创建和管理邀请码',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_MANAGE_IP_BLACKLIST,
    perm_name: '管理IP黑名单',
    perm_group: 'admin',
    description: '允许管理IP黑名单',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_VIEW_LOGS,
    perm_name: '查看操作日志',
    perm_group: 'admin',
    description: '允许查看操作日志',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.ADMIN_EXPORT_DATA,
    perm_name: '导出数据',
    perm_group: 'admin',
    description: '允许导出管理数据',
    scope_type: 'global',
    config_schema: null,
  },
  // == system ==
  {
    perm_key: PERM.SYSTEM_MANAGE_ROLES,
    perm_name: '管理角色',
    perm_group: 'system',
    description: '允许创建/编辑/删除角色',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.SYSTEM_ASSIGN_ROLES,
    perm_name: '分配角色',
    perm_group: 'system',
    description: '允许给用户分配/撤销角色',
    scope_type: 'global',
    config_schema: null,
  },
  {
    perm_key: PERM.SYSTEM_CLEANUP_DATA,
    perm_name: '清理数据',
    perm_group: 'system',
    description: '允许清理过期数据',
    scope_type: 'global',
    config_schema: null,
  },
];

// ==================== 默认角色定义 ====================

export interface DefaultRoleDef {
  role_key: string;
  role_name: string;
  role_color: string;
  role_level: number;
  is_system: boolean;
  description: string;
}

export const DEFAULT_ROLES: DefaultRoleDef[] = [
  {
    role_key: 'guest',
    role_name: '游客',
    role_color: '#cccccc',
    role_level: 0,
    is_system: true,
    description: '游客 - 仅限浏览',
  },
  {
    role_key: 'bot',
    role_name: '机器人',
    role_color: '#667eea',
    role_level: 1,
    is_system: true,
    description: '机器人 - API接入权限',
  },
  {
    role_key: 'user',
    role_name: '用户',
    role_color: '#999999',
    role_level: 1,
    is_system: true,
    description: '普通用户 - 基础互动权限',
  },
  {
    role_key: 'moderator',
    role_name: '房间管理员',
    role_color: '#3498db',
    role_level: 2,
    is_system: true,
    description: '房间管理员 - 协助管理权限',
  },
  {
    role_key: 'owner',
    role_name: '房主',
    role_color: '#9b59b6',
    role_level: 3,
    is_system: true,
    description: '房主 - 房间管理权限',
  },
  {
    role_key: 'admin',
    role_name: '管理员',
    role_color: '#d4af37',
    role_level: 4,
    is_system: true,
    description: '管理员 - 系统管理权限',
  },
  {
    role_key: 'super',
    role_name: '超级管理员',
    role_color: '#d4af37',
    role_level: 5,
    is_system: true,
    description: '超级管理员 - 系统最高权限',
  },
];

// ==================== 默认角色-权限映射 ====================

/**
 * 每个角色直接拥有的权限 key 列表
 * 注：高级角色会继承低级角色的权限（通过 role_level），所以这里只列每级新增的权限
 *
 * 继承链：super > admin > owner > moderator > user > guest
 */
export const DEFAULT_ROLE_PERMISSIONS: Record<
  string,
  { perms: string[]; configs?: Record<string, Record<string, any>> }
> = {
  guest: {
    perms: [PERM.CHAT_VIEW_HISTORY, PERM.ROOM_JOIN],
  },
  user: {
    perms: [
      // chat
      PERM.CHAT_SEND_TEXT,
      PERM.CHAT_SEND_IMAGE,
      PERM.CHAT_SEND_EMOTICON,
      PERM.CHAT_SEND_FILE,
      PERM.CHAT_USE_BOT_COMMAND,
      PERM.CHAT_QUOTE_MESSAGE,
      PERM.CHAT_RECALL_OWN,
      PERM.CHAT_CLICK_INLINE_KEYBOARD,
      // music
      PERM.MUSIC_CHOOSE,
      PERM.MUSIC_CUT_OWN,
      PERM.MUSIC_REMOVE_OWN,
      PERM.MUSIC_COLLECT,
      PERM.MUSIC_SEARCH,
      // room
      PERM.ROOM_CREATE,
      // bot
      PERM.BOT_CREATE,
    ],
    configs: {
      [PERM.MUSIC_CHOOSE]: { cooldown_sec: 8 },
      [PERM.CHAT_RECALL_OWN]: { time_limit_sec: 120 },
      [PERM.CHAT_SEND_TEXT]: { max_length: 500 },
      [PERM.CHAT_SEND_IMAGE]: { max_size_kb: 5120 },
      [PERM.CHAT_SEND_FILE]: { max_size_kb: 10240 },
    },
  },
  moderator: {
    perms: [PERM.CHAT_RECALL_ANY, PERM.MUSIC_CUT_ANY, PERM.MUSIC_REMOVE_ANY, PERM.MUSIC_RECOMMEND, PERM.ROOM_KICK_USER],
    configs: {
      [PERM.MUSIC_CHOOSE]: { cooldown_sec: 0 },
    },
  },
  owner: {
    perms: [
      PERM.ROOM_UPDATE_NOTICE,
      PERM.ROOM_UPDATE_NAME,
      PERM.ROOM_UPDATE_BG,
      PERM.ROOM_UPDATE_LOGO,
      PERM.ROOM_UPDATE_PASSWORD,
      PERM.ROOM_MANAGE_MODERATOR,
      PERM.ROOM_TRANSFER_OWNERSHIP,
    ],
  },
  admin: {
    perms: [
      PERM.ROOM_BYPASS_PASSWORD,
      // user
      PERM.USER_VIEW_LIST,
      PERM.USER_VIEW_DETAIL,
      PERM.USER_BAN,
      PERM.USER_BATCH_BAN,
      PERM.USER_SET_ROLE,
      // bot
      PERM.BOT_APPROVE,
      PERM.BOT_SUSPEND,
      PERM.BOT_DELETE,
      PERM.BOT_UPDATE_PERMISSIONS,
      // admin
      PERM.ADMIN_VIEW_DASHBOARD,
      PERM.ADMIN_MANAGE_ROOMS,
      PERM.ADMIN_MANAGE_MUSIC,
      PERM.ADMIN_MANAGE_MESSAGES,
      PERM.ADMIN_MANAGE_ANNOUNCEMENTS,
      PERM.ADMIN_MANAGE_SENSITIVE_WORDS,
      PERM.ADMIN_MANAGE_FEEDBACK,
      PERM.ADMIN_MANAGE_INVITE_CODES,
      PERM.ADMIN_MANAGE_IP_BLACKLIST,
      PERM.ADMIN_VIEW_LOGS,
      PERM.ADMIN_EXPORT_DATA,
      // system
      PERM.SYSTEM_ASSIGN_ROLES,
    ],
  },
  super: {
    perms: [PERM.SYSTEM_MANAGE_ROLES, PERM.SYSTEM_CLEANUP_DATA],
  },
};

/**
 * 获取角色的完整权限列表（含继承）
 * 例如 moderator 会继承 user 和 guest 的权限
 */
export function getInheritedPermissions(roleKey: string): string[] {
  const inheritanceChain = ['guest', 'user', 'moderator', 'owner', 'admin', 'super'];
  const roleIndex = inheritanceChain.indexOf(roleKey);
  if (roleIndex === -1) return DEFAULT_ROLE_PERMISSIONS[roleKey]?.perms || [];

  const allPerms = new Set<string>();
  for (let i = 0; i <= roleIndex; i++) {
    const rk = inheritanceChain[i];
    const def = DEFAULT_ROLE_PERMISSIONS[rk];
    if (def) {
      def.perms.forEach((p) => allPerms.add(p));
    }
  }
  return Array.from(allPerms);
}

/**
 * 获取角色的完整配置映射（含继承，高级角色覆盖低级角色的配置）
 */
export function getInheritedConfigs(roleKey: string): Record<string, Record<string, any>> {
  const inheritanceChain = ['guest', 'user', 'moderator', 'owner', 'admin', 'super'];
  const roleIndex = inheritanceChain.indexOf(roleKey);
  if (roleIndex === -1) return DEFAULT_ROLE_PERMISSIONS[roleKey]?.configs || {};

  const merged: Record<string, Record<string, any>> = {};
  for (let i = 0; i <= roleIndex; i++) {
    const rk = inheritanceChain[i];
    const def = DEFAULT_ROLE_PERMISSIONS[rk];
    if (def?.configs) {
      Object.entries(def.configs).forEach(([permKey, cfg]) => {
        merged[permKey] = { ...merged[permKey], ...cfg };
      });
    }
  }
  return merged;
}
