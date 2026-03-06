# 音乐 API

> 基础路径: `/api/music` · 歌曲搜索、播放、收藏、曲库管理

## 接口概览

| 方法 | 路径 | 说明 | 认证 |
|------|------|------|------|
| <span class="method-get">GET</span> | `/search` | 搜索歌曲 | 无 |
| <span class="method-get">GET</span> | `/playUrl` | 获取播放地址 | 无 |
| <span class="method-get">GET</span> | `/detail` | 获取歌曲详情+歌词 | 无 |
| <span class="method-get">GET</span> | `/hot` | 热门推荐歌曲 | 无 |
| <span class="method-post">POST</span> | `/collectMusic` | 收藏歌曲 | <span class="auth-jwt">JWT</span> |
| <span class="method-get">GET</span> | `/collectList` | 获取收藏列表 | <span class="auth-jwt">JWT</span> |
| <span class="method-post">POST</span> | `/removeCollect` | 取消收藏 | <span class="auth-jwt">JWT</span> |
| <span class="method-post">POST</span> | `/getAlbumList` | 通过专辑批量添加歌曲 | 无 |
| <span class="method-post">POST</span> | `/debug/refill` | [调试] 批量填充曲库 | 无 |

---

## GET /search

搜索歌曲，支持歌名、歌手、专辑等关键词。**同时支持酷狗和网易云双音源。**

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `keyword` | string | ✅ | — | 搜索关键词（歌名/歌手/专辑） |
| `page` | number | ❌ | 1 | 页码 |
| `pagesize` | number | ❌ | 30 | 每页数量 |
| `source` | string | ❌ | `kugou` | 音源：`kugou`（酷狗）/ `netease`（网易云） |

### 请求示例

```bash
# 酷狗搜索（默认）
curl "http://localhost:5000/api/music/search?keyword=周杰伦&page=1&pagesize=30"

# 网易云搜索
curl "http://localhost:5000/api/music/search?keyword=周杰伦&source=netease"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    {
      "music_mid": "E2C4039A49F514784862D05C7C0F3D0E",
      "music_name": "晴天",
      "music_singer": "周杰伦",
      "music_album": "叶惠美",
      "music_cover": "https://imge.kugou.com/stdpath/...",
      "music_duration": 269,
      "source": "kugou",
      "isPlay": true
    }
  ]
}
```

### 返回字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `music_mid` | string | 唯一标识（酷狗 Hash / 网易云 ID） |
| `music_name` | string | 歌名 |
| `music_singer` | string | 歌手 |
| `music_album` | string | 专辑 |
| `music_cover` | string | 封面图 URL |
| `music_duration` | number | 时长（秒） |
| `source` | string | 音源标识 |
| `isPlay` | boolean | 是否可播放（VIP 歌曲可能为 false） |

### 酷狗接口说明

> 内部使用酷狗 API `/search?keywords=xxx&page=1&pagesize=30&type=song` 搜索。需要完整的 Cookie 认证参数（`KUGOU_API_PLATFORM`, `MAC`, `MID`, `GUID`, `DEV`）。返回字段自动兼容 `SongName` / `songname` / `audio_name` 等多种格式。

---

## GET /playUrl

根据歌曲标识获取音乐播放地址。

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | string | ✅ | — | 歌曲 ID（酷狗 hash / 网易云 id） |
| `source` | string | ❌ | `kugou` | 音源：`kugou` / `netease` |

### 请求示例

```bash
# 酷狗
curl "http://localhost:5000/api/music/playUrl?id=E2C4039A49F514784862D05C7C0F3D0E&source=kugou"

# 网易云
curl "http://localhost:5000/api/music/playUrl?id=123456&source=netease"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "play_url": "https://webfs.tx.kugou.com/xxx.mp3"
  }
}
```

### 酷狗接口流程

1. 调用 `/song/url/new?hash=xxx&quality=high` 获取播放地址
2. 需要 Cookie 认证参数
3. 播放地址在响应的 `data[0].info.tracker_url[0]` 中

### 错误码

| 状态码 | 说明 | 常见原因 |
|--------|------|----------|
| 400 | 获取播放地址失败 | VIP 歌曲无权播放、Cookie 过期 |

---

## GET /detail

获取歌曲详细信息，包含**歌词**、封面、时长等。

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `id` | string | ✅ | — | 歌曲 ID |
| `source` | string | ❌ | `kugou` | 音源 |

### 请求示例

```bash
curl "http://localhost:5000/api/music/detail?id=E2C4039A49F514784862D05C7C0F3D0E"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": {
    "music_lrc": [
      { "time": "13", "lineLyric": "从前 有一个女孩" },
      { "time": "15", "lineLyric": "喜欢上了个男孩" },
      { "time": "18", "lineLyric": "这是一个很短的故事" }
    ],
    "music_info": {
      "music_mid": "E2C4039A49F514784862D05C7C0F3D0E",
      "music_name": "TA",
      "music_singer": "不是花火呀",
      "music_album": "",
      "music_cover": "https://imge.kugou.com/stdpath/...",
      "music_duration": 235,
      "source": "kugou"
    }
  }
}
```

### 歌词字段说明

| 字段 | 类型 | 说明 |
|------|------|------|
| `time` | string | 歌词时间点（秒） |
| `lineLyric` | string | 该时间点对应的歌词文本 |

### 酷狗歌词获取流程

1. 调用 `/search/lyric?hash=xxx` 获取歌词 `id` 和 `accesskey`
2. 调用 `/lyric?id=xxx&accesskey=xxx&fmt=krc&decode=true` 获取 KRC 格式歌词
3. 解析 `decodeContent` 中的歌词，格式: `[毫秒,持续时间]<逐字标记>歌词`

---

## GET /hot

获取平台热门推荐歌曲列表，使用酷狗每日推荐接口。

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `page` | number | ❌ | 1 | 页码 |
| `pagesize` | number | ❌ | 30 | 每页数量 |
| `user_id` | number | ❌ | — | 用户 ID（可选，用于回退到用户收藏） |

### 请求示例

```bash
curl "http://localhost:5000/api/music/hot?page=1&pagesize=30"
```

---

## POST /collectMusic

将歌曲添加到当前用户的收藏列表。**管理员收藏的歌曲会自动加入推荐列表。**

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `music_mid` | string | ✅ | 歌曲唯一标识 |
| `music_name` | string | ✅ | 歌名 |
| `music_singer` | string | ✅ | 歌手 |
| `music_album` | string | ❌ | 专辑 |
| `music_cover` | string | ❌ | 封面 URL |
| `source` | string | ❌ | 音源 |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/music/collectMusic \
  -H "Authorization: Bearer <jwt_token>" \
  -H "Content-Type: application/json" \
  -d '{
    "music_mid": "E2C4039A49F514784862D05C7C0F3D0E",
    "music_name": "晴天",
    "music_singer": "周杰伦",
    "source": "kugou"
  }'
```

### 错误码

| 状态码 | 说明 |
|--------|------|
| 400 | 已收藏过该歌曲 |
| 401 | 未授权 |

---

## GET /collectList

获取当前登录用户的歌曲收藏列表，支持分页。

### 请求示例

```bash
curl "http://localhost:5000/api/music/collectList?page=1&pagesize=30" \
  -H "Authorization: Bearer <jwt_token>"
```

### 成功响应（200）

```json
{
  "code": 200,
  "data": [
    {
      "id": 1,
      "music_mid": "E2C4039A49F514784862D05C7C0F3D0E",
      "music_name": "晴天",
      "music_singer": "周杰伦",
      "music_album": "叶惠美",
      "music_cover": "https://...",
      "source": "kugou"
    }
  ]
}
```

---

## POST /removeCollect

从用户收藏列表中移除指定歌曲。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `id` | number | ✅ | 收藏记录的 ID（从 collectList 返回） |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/music/removeCollect \
  -H "Authorization: Bearer <jwt_token>" \
  -d '{ "id": 1 }'
```

---

## POST /getAlbumList

通过酷狗专辑 ID 批量添加歌曲到曲库，用于初始化歌曲库。

### 请求参数

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `albumId` | string | ✅ | 酷狗专辑 ID |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/music/getAlbumList \
  -H "Content-Type: application/json" \
  -d '{ "albumId": "abc123" }'
```

---

## POST /debug/refill

调试接口：通过搜索关键词批量添加歌曲到曲库。

**默认关键词：** 热门、流行、经典、抖音、网红、周杰伦、陈奕迅、林俊杰

### 请求参数

| 字段 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| `keywords` | string[] | ❌ | 默认列表 | 搜索关键词数组 |
| `countPerKeyword` | number | ❌ | 10 | 每个关键词取几首 |
| `clearExisting` | boolean | ❌ | false | 是否清空现有曲库后再填充 |

### 请求示例

```bash
curl -X POST http://localhost:5000/api/music/debug/refill \
  -H "Content-Type: application/json" \
  -d '{
    "keywords": ["周杰伦", "陈奕迅"],
    "countPerKeyword": 5,
    "clearExisting": false
  }'
```

### 成功响应（200）

```json
{
  "success": true,
  "message": "曲库填充完成",
  "data": {
    "added_count": 50,
    "skipped_count": 10,
    "failed_keywords": [],
    "total_count": 52,
    "added_songs": [
      { "music_name": "晴天", "music_singer": "周杰伦" }
    ]
  }
}
```

> 建议在曲库为空或歌曲播放经常失败时使用此接口快速填充。
