/**
 * @desc  权限部分暂时没做扩展 只有基础权限按接口加请求方式来区分 接口多了可以加中间件与装饰器
 */

export const secret = 'chat-cooper';
export const expiresIn = '7d';
export const whiteList = [
  '/api/user/login',
  '/api/user/register',
  '/api/upload/file',
  '/api/music/debug/refill',
  // Bot API - 使用 BotGuard 认证，绕过 JWT AuthGuard
  '/api/bot/info',
  '/api/bot/sendMessage',
  '/api/bot/chooseMusic',
  '/api/bot/getMessages',
  '/api/bot/getRoomInfo',
];

/**
 * post 请求的白名单，不限制身份的
 */
export const postWhiteList = ['/api/comment/set', '/api/user/update', '/api/chat/history'];
