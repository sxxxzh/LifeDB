-- PostgreSQL 兼容的宇宙节点表结构

-- 创建主表：宇宙节点（生命时刻）
CREATE TABLE IF NOT EXISTS moments (
  id SERIAL PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  text TEXT,
  file_path TEXT,
  file_name TEXT,
  file_type TEXT,
  file_size INTEGER,
  hash TEXT UNIQUE,
  -- AI 分析字段
  ai_summary TEXT,
  ai_tags TEXT[],
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
  -- 时间字段（用于快速过滤）
  year INTEGER,
  month INTEGER,
  day INTEGER,
  weekday INTEGER
);

-- 全局人生总结表
CREATE TABLE IF NOT EXISTS life_summary (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  global_summary TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 插入默认记录
INSERT INTO life_summary(id, global_summary) VALUES(1, '人生宇宙初始状态') ON CONFLICT (id) DO NOTHING;

-- 月度总结表
CREATE TABLE IF NOT EXISTS monthly_summary (
  id SERIAL PRIMARY KEY,
  year INTEGER,
  month INTEGER,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, month)
);

-- 周度总结表
CREATE TABLE IF NOT EXISTS weekly_summary (
  id SERIAL PRIMARY KEY,
  year INTEGER,
  week_num INTEGER,
  summary TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(year, week_num)
);

-- 兼容新增统计字段（若不存在则添加）
ALTER TABLE life_summary ADD COLUMN IF NOT EXISTS node_count INTEGER DEFAULT 0;
ALTER TABLE monthly_summary ADD COLUMN IF NOT EXISTS node_count INTEGER DEFAULT 0;
ALTER TABLE weekly_summary ADD COLUMN IF NOT EXISTS node_count INTEGER DEFAULT 0;

-- 系统日志表
CREATE TABLE IF NOT EXISTS ai_log (
  id SERIAL PRIMARY KEY,
  type TEXT,
  success BOOLEAN,
  error TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 星座系统表（标签群组）
CREATE TABLE IF NOT EXISTS constellations (
  id SERIAL PRIMARY KEY,
  name TEXT UNIQUE,
  description TEXT,
  color TEXT,
  position_x REAL,
  position_y REAL,
  position_z REAL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 节点间引力关系表
CREATE TABLE IF NOT EXISTS cosmic_connections (
  id SERIAL PRIMARY KEY,
  from_moment_id INTEGER REFERENCES moments(id) ON DELETE CASCADE,
  to_moment_id INTEGER REFERENCES moments(id) ON DELETE CASCADE,
  connection_type TEXT,
  strength REAL DEFAULT 1.0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
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

-- 创建全文搜索索引（PostgreSQL）
CREATE INDEX IF NOT EXISTS idx_moments_text_fts ON moments USING gin(to_tsvector('english', COALESCE(text, '') || ' ' || COALESCE(file_name, '')));

-- 权限设置 - 启用行级安全
ALTER TABLE moments ENABLE ROW LEVEL SECURITY;
ALTER TABLE life_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE monthly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_summary ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE constellations ENABLE ROW LEVEL SECURITY;
ALTER TABLE cosmic_connections ENABLE ROW LEVEL SECURITY;

-- 为匿名用户创建策略（只读）
CREATE POLICY "Allow public read" ON moments FOR SELECT USING (true);
CREATE POLICY "Allow public read life_summary" ON life_summary FOR SELECT USING (true);
CREATE POLICY "Allow public read monthly_summary" ON monthly_summary FOR SELECT USING (true);
CREATE POLICY "Allow public read weekly_summary" ON weekly_summary FOR SELECT USING (true);
CREATE POLICY "Allow public read constellations" ON constellations FOR SELECT USING (true);
CREATE POLICY "Allow public read cosmic_connections" ON cosmic_connections FOR SELECT USING (true);

-- 为认证用户创建策略（读写）
CREATE POLICY "Allow authenticated full access" ON moments FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access life_summary" ON life_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access monthly_summary" ON monthly_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access weekly_summary" ON weekly_summary FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access constellations" ON constellations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access cosmic_connections" ON cosmic_connections FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow authenticated full access ai_log" ON ai_log FOR ALL USING (auth.role() = 'authenticated');

-- 授予权限给角色
GRANT SELECT ON moments TO anon;
GRANT SELECT ON life_summary TO anon;
GRANT SELECT ON monthly_summary TO anon;
GRANT SELECT ON weekly_summary TO anon;
GRANT SELECT ON constellations TO anon;
GRANT SELECT ON cosmic_connections TO anon;

GRANT ALL ON moments TO authenticated;
GRANT ALL ON life_summary TO authenticated;
GRANT ALL ON monthly_summary TO authenticated;
GRANT ALL ON weekly_summary TO authenticated;
GRANT ALL ON ai_log TO authenticated;
GRANT ALL ON constellations TO authenticated;
GRANT ALL ON cosmic_connections TO authenticated;

-- 序列权限
GRANT USAGE ON SEQUENCE moments_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE monthly_summary_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE weekly_summary_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE ai_log_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE constellations_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE cosmic_connections_id_seq TO authenticated;

-- 创建触发器函数来自动更新时间字段
CREATE OR REPLACE FUNCTION update_time_fields()
RETURNS TRIGGER AS $$
BEGIN
  NEW.year := EXTRACT(YEAR FROM NEW.created_at);
  NEW.month := EXTRACT(MONTH FROM NEW.created_at);
  NEW.day := EXTRACT(DAY FROM NEW.created_at);
  NEW.weekday := EXTRACT(DOW FROM NEW.created_at);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 创建触发器
CREATE TRIGGER trigger_update_time_fields
  BEFORE INSERT OR UPDATE ON moments
  FOR EACH ROW
  EXECUTE FUNCTION update_time_fields();

-- 创建示例数据（可选）
-- INSERT INTO moments (text, ai_emotion, ai_importance, ai_tags, ai_summary) VALUES
-- ('今天是个好日子', 'happy', 3, ARRAY['生活','日常'],'今天心情不错'),
-- ('工作压力很大', 'anxious', 4, ARRAY['工作','压力'],'工作压力大'),
-- ('和朋友们聚餐', 'happy', 2, ARRAY['社交','朋友'],'朋友聚会很开心');
