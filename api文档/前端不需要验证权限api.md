# 前端无需权限 API（公共）

- BaseURL: `https://lifeapi.szhaovo.cn`

- 认证: 不需要认证；如提供 `Authorization` 也不会影响结果（除非另有说明）
- 通用响应: 成功 `{ success: true, data, meta?, message? }`；失败 `{ success: false, error, message? }`

## GET `https://lifeapi.szhaovo.cn/`
- 代码: `server.js:85-99`
- 说明: 返回服务信息、可用路由、环境开关
- 响应: `{ success, data: { name, version, routes, features } }`

## GET `https://lifeapi.szhaovo.cn/health`
- 代码: `server.js:71-83`
- 说明: 健康检查与基础连接状态
- 响应: `{ success, data: { status, time, env, supabase: { configured } } }`

## 认证模块 `https://lifeapi.szhaovo.cn/api/auth`
### POST `https://lifeapi.szhaovo.cn/api/auth/exchange-token`
- 代码: `routes/auth.js:8-54`
- 请求体: `secret_key` 必填；`client_id` 选填（默认 `anonymous`）
- 响应: `{ success, data: { token, token_type, expires_in, expires_at, client_id }, message }`

### POST `https://lifeapi.szhaovo.cn/api/auth/verify-token`
- 代码: `routes/auth.js:57-89`
- 请求体: `token` 必填
- 响应: `{ success, data: { valid, decoded, expires_at, is_expiring_soon, client_id } }`；非法返回 `401`

### POST `https://lifeapi.szhaovo.cn/api/auth/refresh-token`
- 代码: `routes/auth.js:91-125`
- 请求体: `token` 必填（允许过期 token 刷新）
- 响应: `{ success, data: { token, token_type, expires_in, expires_at, client_id }, message }`

### GET `https://lifeapi.szhaovo.cn/api/auth/server-time`
- 代码: `routes/auth.js:127-137`
- 响应: `{ success, data: { server_time, timestamp, timezone } }`

### GET `https://lifeapi.szhaovo.cn/api/auth/config`
- 代码: `routes/auth.js:139-155`
- 响应: `{ success, data: { token_expiry_hours, auth_enabled, supported_endpoints } }`

## 宇宙数据 `https://lifeapi.szhaovo.cn/api/cosmic`
### GET `https://lifeapi.szhaovo.cn/api/cosmic/nodes`
- 代码: `routes/cosmic.js:9-111`
- 查询参数
  - `limit`(默认100), `offset`(默认0)
  - `start_date`, `end_date`
  - `emotion`, `importance`
  - `dimension`(`all|day|week|month|year`，默认`all`)
  - `search`
  - `fields`(`basic|full`，默认`basic`)
- 响应: `{ success, data: nodes[...], meta: { total, limit, offset, dimension, fields } }`

### GET `https://lifeapi.szhaovo.cn/api/cosmic/nodes/:id`
- 代码: `routes/cosmic.js:113-152`
- 路径参数: `id`
- 响应: `{ success, data: node_with_cosmic }`；未找到返回 `404`

### GET `https://lifeapi.szhaovo.cn/api/cosmic/stats`
- 代码: `routes/cosmic.js:495-513`
- 响应: `{ success, data: { total_moments, today_moments, emotion_distribution, top_emotion, cosmic_density, total_mass } }`

### POST `https://lifeapi.szhaovo.cn/api/cosmic/nodes/batch`
- 代码: `routes/cosmic.js:515-556`
- 请求体: `ids` 数组必填；`dimension` 选填
- 响应: `{ success, data: nodes_with_cosmic, meta: { total, dimension } }`

## 上传 `https://lifeapi.szhaovo.cn/api/upload`
### GET `https://lifeapi.szhaovo.cn/api/upload/file/:filePath(*)`
- 代码: `routes/upload.js:462-507`
- 路径参数: `filePath`
- 响应: `{ success, data: { name, size, content_type, created_at, public_url } }`；不存在返回 `404`

## 宇宙视图 `https://lifeapi.szhaovo.cn/api/universe`
### GET `https://lifeapi.szhaovo.cn/api/universe/state`
- 代码: `routes/universe.js:9-43`
- 响应: `{ success, data: { stats, recent_nodes, cosmic_constants, observer_position, current_time, universe_age } }`

### POST `https://lifeapi.szhaovo.cn/api/universe/time-travel`
- 代码: `routes/universe.js:54-171`
- 请求体: `target_time` 必填；`dimension`(`day|week|month|year|default`)，`fields`(`basic|full`)
- 响应: `{ success, data: { nodes, time_range:{start,end,target}, time_warp_effect, dimension, node_count, fields } }`

### GET `https://lifeapi.szhaovo.cn/api/universe/constellations`
- 代码: `routes/universe.js:174-252`
- 响应: `{ success, data: [ { name, node_count, dominant_emotion, time_span, brightness, color, center } ], meta: { total, total_nodes } }`

### POST `https://lifeapi.szhaovo.cn/api/universe/dimension-switch`
- 代码: `routes/universe.js:257-299`
- 请求体: `dimension` 必填（`day|week|month|year|all`）；`center_time` 默认当前
- 响应: 参见路由体内计算，含时间范围与节点结果

### GET `https://lifeapi.szhaovo.cn/api/universe/summaries/weekly`
- 代码: `routes/universe.js:485-500`
- 查询: `year`, `week_num` 必填
- 响应: `{ success, data: { year, week_num, summary, count } }`；未找到返回 `404`

### GET `https://lifeapi.szhaovo.cn/api/universe/summaries/monthly`
- 代码: `routes/universe.js:501-516`
- 查询: `year`, `month` 必填
- 响应: `{ success, data: { year, month, summary, count } }`；未找到返回 `404`

### GET `https://lifeapi.szhaovo.cn/api/universe/summaries/life`
- 代码: `routes/universe.js:517-544`
- 响应: `{ success, data: { year, summary, count, updated_at } }`

---

### 附注
- 文件下载仅提供元数据与公共 URL；删除需使用管理员接口
- 统一错误处理与 404 在 `server.js:101-118`
