require('dotenv').config();

const { supabase } = require('../config/supabase');
const { ZillizClient } = require('../lib/zilliz-client');
const { EmbeddingService } = require('../lib/embedding-service');
const { DedupPipeline } = require('../lib/dedup-pipeline');
const { ImageProcessor } = require('../lib/image-processor');
const { RateLimiter } = require('../lib/rate-limiter');

const BATCH_SIZE = parseInt(process.env.MIGRATION_BATCH_SIZE || '20');
const RATE_LIMIT_MS = parseInt(process.env.MIGRATION_RATE_LIMIT_MS || '2000');

async function main() {
  console.log('=== Zilliz 存量数据迁移 ===');
  console.log('批次大小:', BATCH_SIZE, '| 节流间隔:', RATE_LIMIT_MS, 'ms\n');

  const zilliz = new ZillizClient();
  const embedding = new EmbeddingService();
  const dedup = new DedupPipeline(embedding);
  const imageProcessor = new ImageProcessor();
  const limiter = new RateLimiter(10);

  if (!zilliz.available) {
    console.error('Zilliz 未配置，退出');
    process.exit(1);
  }

  if (!embedding.available) {
    console.error('Embedding 未配置，退出');
    process.exit(1);
  }

  console.log('确保 Zilliz Collection 存在...');
  await zilliz.ensureCollection();

  const progress = await getProgress();
  if (progress.status === 'completed') {
    console.log('迁移已完成');
    const { data: recheck } = await supabase
      .from('zilliz_migration_progress')
      .select('*')
      .eq('id', 1)
      .single();
    if (recheck && recheck.status === 'completed') {
      process.exit(0);
    }
  }

  let { last_moment_id: startId, total_processed, total_skipped, total_errors } = progress;
  startId = startId || 0;

  await supabase.from('zilliz_migration_progress').upsert({
    id: 1, status: 'running', started_at: new Date().toISOString(),
  });

  const countRes = await supabase.from('moments').select('id', { count: 'exact', head: true });
  const totalCount = countRes.count || 0;
  console.log(`总记录数: ${totalCount}, 从 ID=${startId} 开始\n`);

  let currentId = startId;
  let batchNum = 0;
  const startTime = Date.now();
  const MAX_DURATION = 45000; // 45s，留 15s 缓冲（Vercel 60s 限制）

  while (true) {
    if (Date.now() - startTime > MAX_DURATION) {
      console.log(`\n达到时间限制 (${MAX_DURATION / 1000}s)，保存进度后退出`);
      await saveProgress({ last_moment_id: currentId, total_processed, total_skipped, total_errors });
      process.exit(0);
    }

    batchNum++;
    const { data: batch, error: fetchErr } = await supabase
      .from('moments')
      .select('*')
      .gt('id', currentId)
      .order('id')
      .limit(BATCH_SIZE);

    if (fetchErr) {
      console.error(`批次 ${batchNum}: 查询失败:`, fetchErr.message);
      break;
    }

    if (!batch || batch.length === 0) {
      console.log(`\n无更多记录，迁移完成`);
      await supabase.from('zilliz_migration_progress').upsert({
        id: 1, status: 'completed', completed_at: new Date().toISOString(),
        total_processed, total_skipped, total_errors,
      });
      break;
    }

    console.log(`\n批次 ${batchNum}: ${batch.length} 条 (ID: ${batch[0].id} ~ ${batch[batch.length - 1].id})`);

    const existingHashes = await fetchExistingHashes(batch);
    const results = await dedup.dedupBatch(batch, existingHashes);

    const zillizEntities = [];
    const indexRecords = [];

    for (const r of results) {
      const m = r.moment;

      const meta = {
        moment_id: m.id,
        created_at: m.created_at,
        emotion: m.ai_emotion,
        importance: m.ai_importance,
        tags: m.ai_tags,
        file_url: m.file_path ? supabase.storage.from('chaos-life').getPublicUrl(m.file_path).data.publicUrl : null,
        galaxy: m.cosmic_constellation,
        is_canonical: true,
        canonical_id: `moment_${m.id}`,
      };

      indexRecords.push({
        content_hash: r.content_hash,
        simhash: null,
        moment_id: m.id,
        content_type: m.file_path ? 'image' : 'text',
        is_duplicate: r.is_exact_duplicate || false,
        canonical_moment_id: r.is_exact_duplicate ? null : m.id,
        zilliz_entity_id: `moment_${m.id}`,
      });

      zillizEntities.push({
        id: `moment_${m.id}`,
        content_hash: r.content_hash,
        content_type: m.file_path ? 'image' : 'text',
        embedding: r.embedding,
        text_preview: (r.normalized_text || '').substring(0, 500),
        metadata: JSON.stringify(meta),
      });
      total_processed++;
    }

    if (zillizEntities.length > 0) {
      try {
        await limiter.throttle();
        await zilliz.upsert(zillizEntities);
        console.log(`  写入 Zilliz: ${zillizEntities.length} 条`);
      } catch (err) {
        console.error(`  写入 Zilliz 失败:`, err.message);
        total_errors += zillizEntities.length;
        for (const e of zillizEntities) {
          const idx = indexRecords.find(r => r.zilliz_entity_id === e.id);
          if (idx) idx.zilliz_entity_id = null;
        }
        total_processed -= zillizEntities.length;
      }
    }

    console.log(`  写入 Zilliz: ${zillizEntities.length} 条`);

    for (const record of indexRecords) {
      try {
        const { error: idxErr } = await supabase.from('zilliz_content_index').insert({
          content_hash: record.content_hash,
          simhash: null,
          moment_id: record.moment_id,
          content_type: record.content_type,
          is_duplicate: record.is_duplicate,
          canonical_moment_id: record.canonical_moment_id || null,
          zilliz_entity_id: record.zilliz_entity_id || null,
          indexed_at: new Date().toISOString(),
        });
        if (idxErr && idxErr.code === '23505') {
          await supabase.from('zilliz_content_index')
            .update({
              moment_id: record.moment_id,
              is_duplicate: record.is_duplicate,
              canonical_moment_id: record.canonical_moment_id || null,
              zilliz_entity_id: record.zilliz_entity_id || null,
              indexed_at: new Date().toISOString(),
            })
            .eq('content_hash', record.content_hash);
        }
      } catch (err) {
        console.error(`  内容索引写入失败 (moment_${record.moment_id}):`, err.message);
      }
    }

    currentId = batch[batch.length - 1].id;

    await limiter.throttle();
  }

  console.log(`\n=== 迁移完成 ===`);
  console.log(`已处理: ${total_processed} | 已跳过: ${total_skipped} | 错误: ${total_errors}`);
  process.exit(0);
}

async function getProgress() {
  const { data } = await supabase
    .from('zilliz_migration_progress')
    .select('*')
    .eq('id', 1)
    .single();
  return data || { last_moment_id: 0, total_processed: 0, total_skipped: 0, total_errors: 0, status: 'pending' };
}

async function saveProgress(p) {
  await supabase.from('zilliz_migration_progress').upsert({
    id: 1,
    last_moment_id: p.last_moment_id,
    total_processed: p.total_processed,
    total_skipped: p.total_skipped,
    total_errors: p.total_errors,
    updated_at: new Date().toISOString(),
    status: 'running',
  }, { onConflict: 'id' });
}

async function fetchExistingHashes(batch) {
  const hashes = batch
    .map(m => {
      const text = (m.ai_summary || m.text || '').replace(/\s+/g, ' ').trim().toLowerCase();
      return require('crypto').createHash('md5').update(text, 'utf8').digest('hex');
    })
    .filter(Boolean);

  if (hashes.length === 0) return [];

  const chunkSize = 50;
  const results = [];
  for (let i = 0; i < hashes.length; i += chunkSize) {
    const { data } = await supabase
      .from('zilliz_content_index')
      .select('*')
      .in('content_hash', hashes.slice(i, i + chunkSize));
    if (data) results.push(...data);
  }
  return results;
}

main().catch(err => {
  console.error('迁移脚本异常:', err);
  process.exit(1);
});
