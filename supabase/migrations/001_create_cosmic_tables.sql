-- 创建主表：宇宙节点（生命时刻）
CREATE TABLE IF NOT EXISTS moments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  text TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  hash TEXT,
  -- AI 分析字段
  ai_summary TEXT,
  ai_tags TEXT,
  ai_emotion TEXT CHECK(ai_emotion IN ('happy','sad','angry','calm','shocked','love','anxious','excited','numb')),
  ai_importance INTEGER DEFAULT 0 CHECK(ai_importance BETWEEN 0 AND 5),
  -- 宇宙坐标系（动态计算）
  cosmic_position_x REAL,
  cosmic_position_y REAL,
  cosmic_position_z REAL,
  cosmic_brightness REAL,
  cosmic_mass REAL,
  cosmic_gravity REAL,
  cosmic_constellation TEXT,
  -- 虚拟字段（用于快速过滤）
  year INTEGER GENERATED ALWAYS AS (strftime('%Y', created_at)) VIRTUAL,
  month INTEGER GENERATED ALWAYS AS (strftime('%m', created_at)) VIRTUAL,
  day INTEGER GENERATED ALWAYS AS (strftime('%d', created_at)) VIRTUAL,
  weekday INTEGER GENERATED ALWAYS AS (strftime('%w', created_at)) VIRTUAL
);

-- 全文搜索表
CREATE VIRTUAL TABLE IF NOT EXISTS moments_fts USING fts5(
  text, 
  file_name, 
  content='moments', 
  content_rowid='id'
);

-- 全文搜索触发器
CREATE TRIGGER IF NOT EXISTS moments_fts_insert AFTER INSERT ON moments BEGIN
  INSERT INTO moments_fts(rowid, text, file_name) VALUES (new.id, new.text, new.file_name);
END;

CREATE TRIGGER IF NOT EXISTS moments_fts_update AFTER UPDATE ON moments BEGIN
  UPDATE moments_fts SET text = new.text, file_name = new.file_name WHERE rowid = new.id;
END;

CREATE TRIGGER IF NOT EXISTS moments_fts_delete AFTER DELETE ON moments BEGIN
  DELETE FROM moments_fts WHERE rowid = old.id;
END;

-- 全局人生总结表
CREATE TABLE IF NOT EXISTS life_summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  global_summary TEXT,
  updated_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- 插入默认记录
INSERT OR IGNORE INTO life_summary(id) VALUES(1);

-- 月度总结表
CREATE TABLE IF NOT EXISTS monthly_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  month INTEGER,
  summary TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  UNIQUE(year, month)
);

-- 周度总结表
CREATE TABLE IF NOT EXISTS weekly_summary (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER,
  week_num INTEGER,
  summary TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  UNIQUE(year, week_num)
);

-- 系统日志表
CREATE TABLE IF NOT EXISTS ai_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  success INTEGER,
  error TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- 星座系统表（标签群组）
CREATE TABLE IF NOT EXISTS constellations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE,
  description TEXT,
  color TEXT,
  created_at DATETIME DEFAULT (datetime('now','localtime'))
);

-- 节点间引力关系表
CREATE TABLE IF NOT EXISTS cosmic_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  from_moment_id INTEGER REFERENCES moments(id),
  to_moment_id INTEGER REFERENCES moments(id),
  connection_type TEXT,
  strength REAL DEFAULT 1.0,
  created_at DATETIME DEFAULT (datetime('now','localtime')),
  UNIQUE(from_moment_id, to_moment_id, connection_type)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_moments_created_at ON moments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moments_emotion ON moments(ai_emotion);
CREATE INDEX IF NOT EXISTS idx_moments_importance ON moments(ai_importance DESC);
CREATE INDEX IF NOT EXISTS idx_moments_year_month ON moments(year, month);
CREATE INDEX IF NOT EXISTS idx_moments_hash ON moments(hash);

-- 创建宇宙坐标索引
CREATE INDEX IF NOT EXISTS idx_moments_cosmic_position ON moments(cosmic_position_x, cosmic_position_y, cosmic_position_z);
CREATE INDEX IF NOT EXISTS idx_moments_cosmic_brightness ON moments(cosmic_brightness DESC);
CREATE INDEX IF NOT EXISTS idx_moments_cosmic_gravity ON moments(cosmic_gravity DESC);

-- 创建示例数据（可选）
-- INSERT INTO moments (text, ai_emotion, ai_importance, ai_tags, ai_summary) VALUES
-- ('今天是个好日子', 'happy', 3, '["生活","日常"]','今天心情不错'),
-- ('工作压力很大', 'anxious', 4, '["工作","压力"]','工作压力大'),
-- ('和朋友们聚餐', 'happy', 2, '["社交","朋友"]','朋友聚会很开心');

-- 权限设置（需要在 Supabase 控制台中设置）
-- 这些 SQL 需要在 Supabase SQL 编辑器中执行
-- ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Allow all operations" ON moments FOR ALL USING (true);