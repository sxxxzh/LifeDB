# AGENTS.md

## Project overview

Express.js backend (plain JS, no TypeScript at root) deployed on **Vercel** (`vercel.json` routes everything to `server.js`). Uses **Supabase** (PostgreSQL + Storage) for persistence and **DeepSeek** (OpenAI-compatible AI provider) for AI features. A separate Cloudflare Worker (`cloudflare/`) pre-warms the Vercel endpoint every 5 minutes.

## Commands

```bash
npm run dev      # start with nodemon auto-restart (port 3333)
npm start        # production start (node server.js)
npm run build    # no-op placeholder
```

There is **no test framework, no linter, no formatter, no CI**. Individual test scripts live in `test/` and run with `node test/<script>.js`.

## Required environment variables (.env)

| Variable | Purpose |
|---|---|
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_KEY` | Supabase service_role key (needed for bucket creation; falls back to `SUPABASE_ANON_KEY`) |
| `DEEPSEEK_API_KEY` | DeepSeek API key (falls back to `OPENAI_API_KEY`) |
| `DEEPSEEK_BASE_URL` | Defaults to `https://api.deepseek.com/v1` if unset |
| `DEEPSEEK_CHAT_MODEL` | Defaults to `deepseek-chat` |
| `PORT` | Defaults to `3333` |
| `ZILLIZ_ENDPOINT` | Zilliz Cloud REST API endpoint |
| `ZILLIZ_API_KEY` | Zilliz Cloud API key |
| `EMBEDDING_PROVIDER` | `deepseek` (default), `openai`, or `siliconflow` |
| `EMBEDDING_DIMENSION` | Defaults to `1024` |

## Architecture notes

- **Vercel deployment**: `vercel.json` uses `@vercel/node` to wrap `server.js`. The Vercel project name is `"express-life"`. `server.js` exports `app` (line 302) for serverless — `app.listen()` is called but Vercel ignores it.
- **Frontend sub-projects**: Located in `test/static/admin/` and `test/static/web/` (React 19 + TS + Vite). These are **gitignored** — `.gitignore` excludes `test/static`.
- **Cloudflare Worker**: `cloudflare/wrangler.toml` defines a cron worker (`vercel-prewarm`) that hits `https://lifeapi.szhaovo.cn` every 5 minutes. Separate from the main Express app.
- **Database**: Supabase PostgreSQL. Migrations in `supabase/migrations/` — `001_create_cosmic_tables.sql` (SQLite-compat DDL) and `002_create_postgresql_tables.sql` (PostgreSQL DDL). The storage bucket `"chaos-life"` is auto-created on startup if missing (requires `SUPABASE_SERVICE_KEY`).

## API structure

All routes mounted under the API endpoints defined in the root route (`/`):
- `/api/auth` — JWT-based auth with `crypto-js` secret key exchange
- `/api/cosmic` — CRUD for nodes/moments, batch operations, galaxies/constellations
- `/api/upload` — Single & batch file upload (images only, 5MB limit, `multer` with memoryStorage)
- `/api/universe` — State, time-travel, constellations, AI summaries
- `/api/agent` — RAG 问答智能体 (独立旁路模块，零侵入)：
  - `POST /api/agent/ask` — 自然语言问答
  - `POST /api/agent/search` — 向量检索
  - `GET /api/agent/memories` — 已索引记忆列表
  - `POST /api/agent/webhook` — Supabase DB Webhook 接收端
  - `POST /api/agent/sync` — Vercel Cron 触发的批量同步

Supabase client is injected into every request via middleware as `req.supabase`. An `upload` (multer) instance is also attached as `req.upload`.

## Cron jobs (node-cron)

- **Daily 00:00**: Universe maintenance + annual summary on Jan 1
- **Weekly Monday 00:00**: Weekly AI summary for the previous week
- **Monthly 1st 00:00**: Monthly AI summary for the previous month
- **Startup**: Checks for missed weekly/monthly summaries and backfills them

## Startup behavior

On startup, `config/supabase.js` validates env vars, runs a DB connection test and storage access test, then ensures the `"chaos-life"` storage bucket exists. If any test fails, the server still starts but reports `"degraded"` status on `/health`.

## AI service

`lib/ai-service.js` — `DeepSeekAIService` wraps the `openai` npm client pointed at DeepSeek's API. Provides `analyzeEmotion()`, `analyzeImportance()`, `generateTags()`, `generateSummary()`, and embedding generation. Individual AI call results are logged to the `ai_log` table in Supabase.

## Zilliz / RAG 智能体 (旁路模块)

**零侵入设计**：`server.js` 仅追加了一行 `app.use('/api/agent', agentRoutes)`，不修改任何现有路由。

**双通道同步**：
- **增量**：Supabase DB Webhook → `POST /api/agent/webhook` → 写入 `zilliz_sync_queue` 队列表
- **批量兜底**：Vercel Cron (`*/5 * * * *`) → `POST /api/agent/sync` → 消费队列 + 向量化 + 写入 Zilliz

**三层去重**：`lib/dedup-pipeline.js` — MD5 → SimHash → Embedding 余弦相似度

**向量化**：`lib/embedding-service.js` — 可切换 `deepseek` / `openai` / `siliconflow` 三种 Embedding Provider

**RAG 流程**：`lib/rag-agent.js` — 向量检索 → 按 content_hash 去重 → Token Budget (2048) 上下文组装 → LLM 生成回答

**存量迁移**：`scripts/migrate-to-zilliz.js` — 可中断/可续断，进度持久化在 `zilliz_migration_progress` 表

**支撑表**：`supabase/migrations/003_zilliz_tables.sql` — 5 张新表 (sync_queue, content_index, migration_progress, usage_log, sync_errors)

## Key gotchas

- The codebase is **plain JavaScript** at root — do not add TypeScript to `server.js`, `routes/`, `lib/`, or `config/`.
- The `test/static/` frontend projects are **gitignored** and use their own `package.json`, `tsconfig.json`, and build tooling.
- Supabase Service Key is needed for storage bucket auto-creation — the anon key alone is insufficient.
- `vercel.json` routes every request (`/(.*)`) to `server.js` — all routing is handled by Express.
