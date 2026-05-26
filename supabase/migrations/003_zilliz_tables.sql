-- Zilliz 向量库集成支撑表
-- 非侵入式：不影响现有 moments 等核心表

-- 同步队列（Supabase Webhook 写入，Vercel Cron 消费）
CREATE TABLE IF NOT EXISTS zilliz_sync_queue (
  id SERIAL PRIMARY KEY,
  moment_id INTEGER NOT NULL REFERENCES moments(id) ON DELETE CASCADE,
  operation TEXT NOT NULL CHECK(operation IN ('insert', 'update', 'delete')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'processing', 'completed', 'failed', 'permanently_failed')),
  retry_count INTEGER DEFAULT 0,
  last_error TEXT,
  payload JSONB,           -- 变更时的快照数据
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zilliz_sync_queue_status ON zilliz_sync_queue (status, created_at);
CREATE INDEX IF NOT EXISTS idx_zilliz_sync_queue_moment ON zilliz_sync_queue (moment_id);

-- 内容去重索引（三级去重管道的持久化）
CREATE TABLE IF NOT EXISTS zilliz_content_index (
  id SERIAL PRIMARY KEY,
  content_hash TEXT UNIQUE NOT NULL,          -- L1: MD5(text) 唯一索引
  simhash BIGINT,                             -- L2: 64-bit SimHash 指纹
  moment_id INTEGER REFERENCES moments(id) ON DELETE SET NULL,
  content_type TEXT DEFAULT 'text' CHECK(content_type IN ('text', 'image', 'file')),
  is_duplicate BOOLEAN DEFAULT false,
  canonical_moment_id INTEGER,                -- 若为重复，指向去重后保留的那条
  zilliz_entity_id TEXT,                      -- Zilliz 中对应的 entity id
  indexed_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zilliz_content_hash ON zilliz_content_index (content_hash);
CREATE INDEX IF NOT EXISTS idx_zilliz_simhash ON zilliz_content_index (simhash);
CREATE INDEX IF NOT EXISTS idx_zilliz_content_moment ON zilliz_content_index (moment_id);

-- 迁移进度（可中断/可恢复）
CREATE TABLE IF NOT EXISTS zilliz_migration_progress (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  last_moment_id INTEGER DEFAULT 0,
  total_processed INTEGER DEFAULT 0,
  total_skipped INTEGER DEFAULT 0,
  total_errors INTEGER DEFAULT 0,
  last_error TEXT,
  status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'running', 'completed', 'failed')),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
-- 初始化进度记录
INSERT INTO zilliz_migration_progress (id, total_processed, total_skipped, total_errors)
VALUES (1, 0, 0, 0)
ON CONFLICT (id) DO NOTHING;

-- Zilliz 用量日志（配额监控）
CREATE TABLE IF NOT EXISTS zilliz_usage_log (
  id SERIAL PRIMARY KEY,
  operation TEXT NOT NULL,
  vector_count INTEGER DEFAULT 0,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_zilliz_usage_created ON zilliz_usage_log (created_at DESC);

-- 同步错误日志（人工介入）
CREATE TABLE IF NOT EXISTS zilliz_sync_errors (
  id SERIAL PRIMARY KEY,
  moment_id INTEGER REFERENCES moments(id) ON DELETE SET NULL,
  error_type TEXT,
  error_message TEXT,
  context JSONB,
  resolved BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
