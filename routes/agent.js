const express = require('express');
const { RagAgent } = require('../lib/rag-agent');

const router = express.Router();

const ASK_DAILY_LIMIT = 100;

router.post('/ask', async (req, res) => {
  try {
    const { question, timeRange, emotion, tag, maxResults, sourceType } = req.body || {};

    if (!question || question.trim().length === 0) {
      return res.status(400).json({ error: '请输入问题' });
    }

    const today = new Date().toISOString().slice(0, 10);
    let remaining = ASK_DAILY_LIMIT;

    if (req.supabase) {
      try {
        const { data: existing, error: selectErr } = await req.supabase
          .from('daily_usage')
          .select('call_count')
          .eq('endpoint', 'agent_ask')
          .eq('usage_date', today)
          .maybeSingle();

        if (selectErr) {
          console.error('[RateLimit] select error:', selectErr.code, selectErr.message);
        } else if (existing) {
          const newCount = existing.call_count + 1;
          const { error: updateErr } = await req.supabase
            .from('daily_usage')
            .update({ call_count: newCount, updated_at: new Date().toISOString() })
            .eq('endpoint', 'agent_ask')
            .eq('usage_date', today);

          if (updateErr) {
            console.error('[RateLimit] update error:', updateErr.code, updateErr.message);
          } else {
            remaining = ASK_DAILY_LIMIT - newCount;
          }
        } else {
          const { error: insertErr } = await req.supabase
            .from('daily_usage')
            .insert({
              endpoint: 'agent_ask',
              usage_date: today,
              call_count: 1,
              max_limit: ASK_DAILY_LIMIT,
            });

          if (insertErr) {
            console.error('[RateLimit] insert error:', insertErr.code, insertErr.message);
          } else {
            remaining = ASK_DAILY_LIMIT - 1;
          }
        }
      } catch (err) {
        console.error('[RateLimit] exception:', err.message);
      }
    }

    if (remaining < 0) {
      return res.status(429).json({
        success: false,
        error: '今日问答次数已用完，请明天再试',
        remaining: 0,
        limit: ASK_DAILY_LIMIT,
      });
    }

    const agent = new RagAgent();
    const result = await agent.ask(question.trim(), { timeRange, emotion, tag, maxResults, sourceType });

    res.json({
      success: true,
      ...result,
      zilliz_available: agent.zilliz.available,
      remaining,
      limit: ASK_DAILY_LIMIT,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RAG Agent] 问答失败:', error.message);
    res.status(500).json({
      success: false,
      error: '回答问题失败',
      message: error.message,
    });
  }
});

router.post('/search', async (req, res) => {
  try {
    const { query, timeRange, emotion, tag, topK, sourceType } = req.body || {};

    if (!query || query.trim().length === 0) {
      return res.status(400).json({ error: '请输入搜索关键词' });
    }

    const agent = new RagAgent();
    const memories = await agent.retrieve(query.trim(), {
      timeRange, emotion, tag, topK: topK || 20, sourceType,
    });

    res.json({
      success: true,
      count: memories.length,
      results: memories,
      zilliz_available: agent.zilliz.available,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RAG Agent] 搜索失败:', error.message);
    res.status(500).json({
      success: false,
      error: '搜索失败',
      message: error.message,
    });
  }
});

router.get('/memories', async (req, res) => {
  try {
    const { limit = 50, offset = 0 } = req.query;

    const agent = new RagAgent();
    const memories = await agent.getMemories(
      parseInt(limit) || 50,
      parseInt(offset) || 0
    );

    res.json({
      success: true,
      count: memories.length,
      results: memories,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[RAG Agent] 获取记忆失败:', error.message);
    res.status(500).json({
      success: false,
      error: '获取记忆列表失败',
      message: error.message,
    });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    const { type, table, record, old_record } = req.body || {};

    if (table !== 'moments') {
      return res.json({ received: true, skipped: 'not moments table' });
    }

    if (!req.supabase) {
      return res.status(500).json({ error: 'Supabase 未注入' });
    }

    const supabase = req.supabase;

    if (type === 'INSERT' || type === 'UPDATE') {
      const moment = record || {};
      const momentId = moment.id;

      if (!momentId) {
        return res.json({ received: true, skipped: 'no moment id' });
      }

      const { data: existing } = await supabase
        .from('zilliz_sync_queue')
        .select('id')
        .eq('moment_id', momentId)
        .in('status', ['pending', 'failed'])
        .limit(1);

      if (existing && existing.length > 0) {
        return res.json({ received: true, skipped: 'already queued' });
      }

      await supabase.from('zilliz_sync_queue').insert([{
        moment_id: momentId,
        operation: type === 'INSERT' ? 'insert' : 'update',
        status: 'pending',
        payload: {
          text: moment.text,
          ai_summary: moment.ai_summary,
          ai_tags: moment.ai_tags,
          ai_emotion: moment.ai_emotion,
          ai_importance: moment.ai_importance,
          file_path: moment.file_path,
          created_at: moment.created_at,
          cosmic_constellation: moment.cosmic_constellation,
        },
      }]);

      return res.json({ received: true, queued: momentId, operation: type });
    }

    if (type === 'DELETE') {
      const oldMoment = old_record || {};
      if (oldMoment.id) {
        await supabase.from('zilliz_sync_queue').insert([{
          moment_id: oldMoment.id,
          operation: 'delete',
          status: 'pending',
          payload: { deleted_moment_id: oldMoment.id },
        }]);
      }
      return res.json({ received: true, queued: oldMoment.id, operation: 'delete' });
    }

    res.json({ received: true });
  } catch (error) {
    console.error('[Webhook] 处理失败:', error.message);
    res.status(500).json({
      error: 'Webhook 处理失败',
      message: error.message,
    });
  }
});

router.post('/sync', async (req, res) => {
  const startTime = Date.now();
  const MAX_DURATION = 45000;
  const BATCH_SIZE = 10;
  let processed = 0;
  let errors = 0;

  try {
    const supabase = req.supabase;
    if (!supabase) {
      return res.status(500).json({ error: 'Supabase 未注入' });
    }

    const { ZillizClient } = require('../lib/zilliz-client');
    const { EmbeddingService } = require('../lib/embedding-service');
    const { DedupPipeline } = require('../lib/dedup-pipeline');

    const zilliz = new ZillizClient();
    const embedding = new EmbeddingService();
    const dedup = new DedupPipeline(embedding);

    if (!zilliz.available) {
      return res.json({ status: 'skipped', reason: 'Zilliz 未配置' });
    }

    await zilliz.ensureCollection();

    while (Date.now() - startTime < MAX_DURATION) {
      const { data: queueItems, error: qErr } = await supabase
        .from('zilliz_sync_queue')
        .select('*')
        .in('status', ['pending', 'failed'])
        .lt('retry_count', 3)
        .order('created_at')
        .limit(BATCH_SIZE);

      if (qErr || !queueItems || queueItems.length === 0) break;

      for (const item of queueItems) {
        if (Date.now() - startTime > MAX_DURATION) break;

        try {
          await supabase.from('zilliz_sync_queue')
            .update({ status: 'processing', updated_at: new Date().toISOString() })
            .eq('id', item.id);

          if (item.operation === 'delete') {
            await zilliz.deleteByIds([`moment_${item.moment_id}`]);
            await supabase.from('zilliz_content_index')
              .delete()
              .eq('moment_id', item.moment_id);
          } else {
            const payload = item.payload || {};
            const text = payload.ai_summary || payload.text || '';
            if (!text.trim()) {
              await supabase.from('zilliz_sync_queue')
                .update({ status: 'completed', updated_at: new Date().toISOString() })
                .eq('id', item.id);
              processed++;
              continue;
            }

            const normalized = text.replace(/\s+/g, ' ').trim().toLowerCase();
            const contentHash = require('crypto').createHash('md5').update(normalized, 'utf8').digest('hex');

            const emb = await embedding.embed(normalized);

            const meta = {
              moment_id: item.moment_id,
              created_at: payload.created_at,
              emotion: payload.ai_emotion,
              importance: payload.ai_importance,
              tags: payload.ai_tags,
              file_url: payload.file_path ? supabase.storage.from('chaos-life').getPublicUrl(payload.file_path).data.publicUrl : null,
              galaxy: payload.cosmic_constellation,
              is_canonical: true,
              canonical_id: `moment_${item.moment_id}`,
            };

            await zilliz.upsert([{
              id: `moment_${item.moment_id}`,
              content_hash: contentHash,
              content_type: payload.file_path ? 'image' : 'text',
              embedding: emb,
              text_preview: (normalized || '').substring(0, 500),
              metadata: JSON.stringify(meta),
            }]);

            const { error: idxErr } = await supabase.from('zilliz_content_index').insert({
              content_hash: contentHash,
              moment_id: item.moment_id,
              content_type: payload.file_path ? 'image' : 'text',
              is_duplicate: false,
              canonical_moment_id: item.moment_id,
              zilliz_entity_id: `moment_${item.moment_id}`,
            });
            if (idxErr && idxErr.code === '23505') {
              await supabase.from('zilliz_content_index')
                .update({ moment_id: item.moment_id, canonical_moment_id: item.moment_id, zilliz_entity_id: `moment_${item.moment_id}`, is_duplicate: false })
                .eq('content_hash', contentHash);
            }
          }

          await supabase.from('zilliz_sync_queue')
            .update({ status: 'completed', updated_at: new Date().toISOString() })
            .eq('id', item.id);
          processed++;
        } catch (err) {
          console.error(`[Sync] moment_${item.moment_id} 失败:`, err.message);
          const newRetry = (item.retry_count || 0) + 1;
          const newStatus = newRetry >= 3 ? 'permanently_failed' : 'failed';

          await supabase.from('zilliz_sync_queue')
            .update({
              status: newStatus,
              retry_count: newRetry,
              last_error: err.message,
              updated_at: new Date().toISOString(),
            }).eq('id', item.id);

          await supabase.from('zilliz_sync_errors').insert([{
            moment_id: item.moment_id,
            error_type: 'sync',
            error_message: err.message,
            context: { queue_id: item.id, operation: item.operation, retry: newRetry },
          }]);

          errors++;
        }
      }
    }

    res.json({
      status: 'ok',
      processed,
      errors,
      checkPoint: errors > 0,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[Sync] 批量同步失败:', error.message);
    res.status(500).json({
      status: 'error',
      processed,
      errors,
      message: error.message,
    });
  }
});

module.exports = router;
