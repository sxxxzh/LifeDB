# 管理员 API（需认证）

- BaseURL: `https://lifeapi.szhaovo.cn`

- 认证方式: `Authorization: Bearer <token>`（从 `/api/auth/exchange-token` 获取）
- 通用响应: 成功 `{ success: true, data, meta?, message? }`；失败 `{ success: false, error, message? }`

## POST `https://lifeapi.szhaovo.cn/api/cosmic/nodes`
- 代码: `routes/cosmic.js:154-437`
- 说明: 创建一条「瞬间」并计算/写入宇宙属性
- 请求头: `Authorization: Bearer <token>`，`Content-Type: application/json`
- 请求体（JSON）
  - 必填: `text`（非空）
  - 可选: `use_ai`(默认`true`), `ai_emotion`, `ai_importance`(0-5), `ai_tags`(数组), `ai_decide_galaxy`(默认`true`), `year`,`month`,`day`
  - AI 提示词: `ai_prompt_*` 字段（如系统/用户提示等）
- 响应
  - 成功: `{ success, data: node_withCosmic, message }`
  - 失败: `400/500` 视校验与计算错误
 - 示例
   - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/cosmic/nodes" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"text\":\"今天很开心\",\"ai_importance\":3,\"ai_tags\":[\"快乐\"]}"`

## DELETE `https://lifeapi.szhaovo.cn/api/cosmic/nodes/:id`
- 代码: `routes/cosmic.js:439-493`
- 说明: 删除指定瞬间及其关联文件（若存在）
- 路径参数: `id`
- 响应: `{ success, message }`；文件删除失败会记录错误但接口成功与否以数据删除为准
 - 示例
   - curl: `curl -X DELETE "https://lifeapi.szhaovo.cn/api/cosmic/nodes/123" -H "Authorization: Bearer <token>"`

## PUT `https://lifeapi.szhaovo.cn/api/cosmic/galaxies/:name/anchor`
- 代码: `routes/cosmic.js:558-681`
- 说明: 更新某星系锚点坐标，并对其节点进行统一偏移
- 路径参数: `name`
- 请求体: `position_x`, `position_y`, `position_z`（均必填）
- 响应: `{ success, data: { galaxy, offset, updated_nodes }, message }`
 - 示例
   - curl: `curl -X PUT "https://lifeapi.szhaovo.cn/api/cosmic/galaxies/工作/anchor" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"position_x\":100,\"position_y\":0,\"position_z\":-50}"`

## POST `https://lifeapi.szhaovo.cn/api/upload/moment`
- 代码: `routes/upload.js:9-336`
- 说明: 上传单文件并作为瞬间入库，计算宇宙属性
- 中间件: `req.upload.single('file')`（大小≤5MB，类型白名单）
- 请求: `multipart/form-data`
  - 字段: `file`(可选), `text`(可选), `use_ai`(默认true), `ai_importance`(0-5), `ai_tags`(数组), `ai_decide_galaxy`(默认`false`)
- 响应: `{ success, data: node_withCosmic, message, file_url }`
 - 示例
   - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/upload/moment" -H "Authorization: Bearer <token>" -F "file=@./example.jpg" -F "text=一次记录" -F "ai_importance=2"`

## POST `https://lifeapi.szhaovo.cn/api/upload/batch`
- 代码: `routes/upload.js:339-418`
- 说明: 批量上传最多 10 个文件并入库
- 中间件: `req.upload.array('files', 10)`
- 请求: `multipart/form-data`
  - 字段: `files[]`
- 响应: `{ success, data: [ { success, filename, file_path, file_url, file_size, file_type | error }... ], summary }`
 - 示例
   - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/upload/batch" -H "Authorization: Bearer <token>" -F "files[]=@a.jpg" -F "files[]=@b.png"`

## DELETE `https://lifeapi.szhaovo.cn/api/upload/file/:filePath(*)`
- 代码: `routes/upload.js:421-459`
- 说明: 从存储删除指定文件，并清空相关记录文件字段
- 路径参数: `filePath`（通配）
- 响应: `{ success, message }`
 - 示例
   - curl: `curl -X DELETE "https://lifeapi.szhaovo.cn/api/upload/file/moments/2025/11/a.jpg" -H "Authorization: Bearer <token>"`

## POST `https://lifeapi.szhaovo.cn/api/universe/summaries/weekly`
- 代码: `routes/universe.js:374-423`
- 说明: 生成并保存某周摘要（upsert 到 `weekly_summary`）
- 请求体（二选一）
  - `year` + `week_num`
  - `target_time`
- 响应: `{ success, data: { year, week_num, summary, count } }`
 - 示例
   - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/universe/summaries/weekly" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"year\":2025,\"week_num\":48}"`

## POST `https://lifeapi.szhaovo.cn/api/universe/summaries/monthly`
- 代码: `routes/universe.js:423-484`
- 说明: 生成并保存某月摘要（upsert 到 `monthly_summary`）
- 请求体（二选一）
  - `year` + `month`
  - `target_time`
- 响应: `{ success, data: { year, month, summary, count } }`
 - 示例
   - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/universe/summaries/monthly" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"year\":2025,\"month\":11}"`

## POST `https://lifeapi.szhaovo.cn/api/universe/summaries/life-annual`
- 代码: `routes/universe.js:460-484`
- 说明: 生成并保存某年的人生摘要（upsert 到 `life_summary`）
- 请求体: `year`（可选，默认当前年）
- 响应: `{ success, data: { year, summary, count } }`
 - 示例
   - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/universe/summaries/life-annual" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"year\":2025}"`

---

### 认证与限流说明
- 认证失败返回 `401`：`{ success: false, error: 'Unauthorized' }`
- 上传文件大小限制 `5MB`，类型白名单：`image/*, audio/*(部分), video/*(部分), text/plain|markdown, application/pdf`
- 统一错误处理位于 `server.js:101-118`

### 获取 Token 指南
- 使用 `POST https://lifeapi.szhaovo.cn/api/auth/exchange-token` 获取 `token`
- 请求体: `{ "secret_key": "<你的密钥>", "client_id": "optional" }`
- 响应: `{ success, data: { token, token_type, expires_in, expires_at, client_id } }`
- 示例
  - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/auth/exchange-token" -H "Content-Type: application/json" -d "{\"secret_key\":\"<SECRET>\"}"`

---

## 公共 API（无需认证）

### GET `https://lifeapi.szhaovo.cn/`
- 代码: `server.js:85-99`
- 说明: 返回服务信息、可用路由、环境开关
- 响应: `{ success, data: { name, version, routes, features } }`

### GET `https://lifeapi.szhaovo.cn/health`
- 代码: `server.js:71-83`
- 说明: 健康检查与基础连接状态
- 响应: `{ success, data: { status, time, env, supabase: { configured } } }`

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

### GET `https://lifeapi.szhaovo.cn/api/cosmic/nodes`
- 代码: `routes/cosmic.js:9-111`
- 查询参数: `limit`, `offset`, `start_date`, `end_date`, `emotion`, `importance`, `dimension`, `search`, `fields`
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

### GET `https://lifeapi.szhaovo.cn/api/upload/file/:filePath(*)`
- 代码: `routes/upload.js:462-507`
- 路径参数: `filePath`
- 响应: `{ success, data: { name, size, content_type, created_at, public_url } }`；不存在返回 `404`

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
## PUT `https://lifeapi.szhaovo.cn/api/cosmic/nodes/:id`
- 代码: `routes/cosmic.js:495-569`
- 说明: 更新节点文本与AI属性，并重新计算宇宙属性
- 路径参数: `id`
- 请求头: `Authorization: Bearer <token>`，`Content-Type: application/json`
- 请求体: 可选字段 `{ text, ai_emotion, ai_importance(0-5), ai_tags[], ai_summary, position_x?, position_y?, position_z? }`
- 响应: `{ success, data: node_withCosmic, message }`
- 示例
  - curl: `curl -X PUT "https://lifeapi.szhaovo.cn/api/cosmic/nodes/123" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"text\":\"修订后的内容\",\"ai_importance\":4,\"ai_tags\":[\"工作\",\"周报\"]}"`
## POST `https://lifeapi.szhaovo.cn/api/cosmic/nodes/:id/reassign-distance`
- 代码: `routes/cosmic.js:...`
- 说明: 管理员按范围与最小间距为节点重新分配坐标（使用真实星系锚点，方向基于内容哈希）
- 路径参数: `id`
- 请求体: `{ rangeMin?: number, rangeMax?: number, minDist?: number, preferredMin?: number, preferredMax?: number, maxRadius?: number, step?: number }`
- 响应: `{ success, data: { id, position_x, position_y, position_z } }`
- 示例
  - curl: `curl -X POST "https://lifeapi.szhaovo.cn/api/cosmic/nodes/123/reassign-distance" -H "Authorization: Bearer <token>" -H "Content-Type: application/json" -d "{\"rangeMin\":0,\"rangeMax\":800,\"minDist\":120,\"preferredMin\":300,\"preferredMax\":500,\"maxRadius\":800,\"step\":30}"`
