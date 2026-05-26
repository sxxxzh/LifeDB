-- 每日 API 调用限额表
CREATE TABLE IF NOT EXISTS daily_usage (
  id SERIAL PRIMARY KEY,
  endpoint TEXT NOT NULL,
  usage_date TEXT NOT NULL,
  call_count INTEGER DEFAULT 0,
  max_limit INTEGER DEFAULT 100,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(endpoint, usage_date)
);
