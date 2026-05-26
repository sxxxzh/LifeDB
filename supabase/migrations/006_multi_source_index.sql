-- Zilliz 内容索引表扩展：支持多数据源
-- 为导入非 moments 数据（博客文章、项目总结等）做准备

-- 1. 添加 source_table 和 source_id 字段
ALTER TABLE zilliz_content_index ADD COLUMN IF NOT EXISTS source_table TEXT DEFAULT 'moments';
ALTER TABLE zilliz_content_index ADD COLUMN IF NOT EXISTS source_id TEXT;

-- 2. 用 moments 的 moment_id 回填已有数据
UPDATE zilliz_content_index SET source_table = 'moments', source_id = moment_id::TEXT WHERE source_table = 'moments' AND source_id IS NULL;

-- 3. 删除原有的 FK 约束（允许非 moments 数据写入）
--    ON DELETE SET NULL 已经确保了安全性，去掉 FK 后 moment_id 可以留 NULL
ALTER TABLE zilliz_content_index DROP CONSTRAINT IF EXISTS zilliz_content_index_moment_id_fkey;

-- 4. 创建新的复合索引
CREATE INDEX IF NOT EXISTS idx_zilliz_content_source ON zilliz_content_index (source_table, source_id);
