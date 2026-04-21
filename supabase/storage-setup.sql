# 创建存储桶和设置权限
-- 这个脚本需要在 Supabase SQL 编辑器中执行

-- 创建存储桶
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
('chaos-life', 'chaos-life', true, 5242880, ARRAY[
  'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml',
  'audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/x-m4a', 'audio/ogg',
  'video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm',
  'text/plain', 'text/markdown', 'text/csv',
  'application/pdf', 'application/json'
]);

-- 设置存储桶访问权限（允许匿名访问）
CREATE POLICY "Public Access" ON storage.objects
FOR ALL 
USING (bucket_id = 'chaos-life') 
WITH CHECK (bucket_id = 'chaos-life');

-- 设置存储桶的 CORS 配置（通过 Supabase 控制台设置）
-- 在 Supabase 控制台 -> Storage -> Settings -> CORS
-- 添加你的前端域名，例如：
-- https://your-frontend-domain.vercel.app
-- http://localhost:3000

-- 验证存储桶创建
SELECT * FROM storage.buckets WHERE id = 'chaos-life';