-- Supabase Database Webhook 配置
-- 在 moments 表发生 INSERT/UPDATE/DELETE 时自动通知 /api/agent/webhook
-- 在 Supabase SQL Editor 中执行此文件

-- 1. 启用 pg_net 扩展 (HTTP 请求)
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. 创建 Webhook 发送函数
CREATE OR REPLACE FUNCTION notify_zilliz_webhook()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  webhook_url text := 'https://lifeapi.szhaovo.cn/api/agent/webhook';
  payload jsonb;
  request_id bigint;
BEGIN
  IF (TG_OP = 'INSERT') THEN
    payload := jsonb_build_object(
      'type', 'INSERT',
      'table', 'moments',
      'record', row_to_json(NEW)
    );
  ELSIF (TG_OP = 'UPDATE') THEN
    payload := jsonb_build_object(
      'type', 'UPDATE',
      'table', 'moments',
      'record', row_to_json(NEW),
      'old_record', row_to_json(OLD)
    );
  ELSIF (TG_OP = 'DELETE') THEN
    payload := jsonb_build_object(
      'type', 'DELETE',
      'table', 'moments',
      'old_record', row_to_json(OLD)
    );
  END IF;

  -- 异步 HTTP POST，不阻塞主事务
  SELECT net.http_post(
    url := webhook_url,
    body := payload::text,
    headers := '{"Content-Type": "application/json"}'::jsonb,
    timeout_milliseconds := 5000
  ) INTO request_id;

  RETURN NULL;
EXCEPTION
  WHEN OTHERS THEN
    -- Webhook 失败不影响主业务
    RETURN NULL;
END;
$$;

-- 3. 创建触发器
DROP TRIGGER IF EXISTS trg_moments_webhook_insert ON moments;
CREATE TRIGGER trg_moments_webhook_insert
  AFTER INSERT ON moments
  FOR EACH ROW
  EXECUTE FUNCTION notify_zilliz_webhook();

DROP TRIGGER IF EXISTS trg_moments_webhook_update ON moments;
CREATE TRIGGER trg_moments_webhook_update
  AFTER UPDATE ON moments
  FOR EACH ROW
  EXECUTE FUNCTION notify_zilliz_webhook();

DROP TRIGGER IF EXISTS trg_moments_webhook_delete ON moments;
CREATE TRIGGER trg_moments_webhook_delete
  AFTER DELETE ON moments
  FOR EACH ROW
  EXECUTE FUNCTION notify_zilliz_webhook();
