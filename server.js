const express = require('express');
const cors = require('cors');
const multer = require('multer');
const cron = require('node-cron');
const crypto = require('crypto-js');
require('dotenv').config();

const { supabase, runTests, ensureBucket } = require('./config/supabase');
const cosmicRoutes = require('./routes/cosmic');
const uploadRoutes = require('./routes/upload');
const universeRoutes = require('./routes/universe');
const authRoutes = require('./routes/auth');

const app = express();
const PORT = process.env.PORT || 3333;

// 启动前测试（后台执行，不阻塞启动）
let testsPassed = true;
  runTests()
    .then(success => {
      testsPassed = !!success;
      if (!success) {
        console.log('\n⚠️  配置测试未通过，但服务已启动');
      }
      // 确保存储桶存在（需要 Service Key）
      ensureBucket('chaos-life');
      checkAndRunImmediateSummaries();
    })
    .catch(error => {
      testsPassed = false;
      console.error('⚠️  配置测试执行失败（已忽略）:', error.message);
    });
  
  // 中间件
  app.use(cors());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Multer 配置（内存存储）
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: 5 * 1024 * 1024 // 5MB 限制
    },
    fileFilter: (req, file, cb) => {
      const allowedTypes = [
        'image/jpeg', 'image/png', 'image/gif', 'image/webp'
      ];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new Error('仅支持图片上传'), false);
      }
    }
  });

  // 将 supabase 和 upload 附加到请求
  app.use((req, res, next) => {
    req.supabase = supabase;
    req.upload = upload;
    next();
  });

  // 路由
  app.use('/api/auth', authRoutes);
  app.use('/api/cosmic', cosmicRoutes);
  app.use('/api/upload', uploadRoutes);
  app.use('/api/universe', universeRoutes);

  // 健康检查
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      timestamp: new Date().toISOString(),
      service: 'chaos-life-backend',
      version: '1.0.0',
      supabase: {
        url: process.env.SUPABASE_URL ? 'configured' : 'missing',
        connected: testsPassed
      }
    });
  });

  // 根路径
  app.get('/', (req, res) => {
    res.json({
      message: '混沌人生数据库 - 宇宙节点后端服务',
      version: '1.0.0',
      endpoints: {
        auth: '/api/auth',
        cosmic: '/api/cosmic',
        upload: '/api/upload',
        universe: '/api/universe',
        health: '/health'
      },
      status: testsPassed ? 'operational' : 'degraded'
    });
  });

  // 错误处理
  app.use((error, req, res, next) => {
    console.error('错误:', error);
    res.status(500).json({
      error: '服务器内部错误',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  });

  // 404 处理
  app.use('*', (req, res) => {
    res.status(404).json({
      error: '接口不存在',
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    });
  });

  // 定时任务（宇宙维护）
  cron.schedule('0 0 * * *', async () => {
    console.log('🔄 宇宙维护任务开始...');
    try {
      const { SiliconFlowAIService } = require('./lib/ai-service');
      const now = new Date();
      if (now.getMonth() === 0 && now.getDate() === 1) {
        const year = now.getFullYear() - 1;
        const start = new Date(year, 0, 1).toISOString();
        const end = new Date(year + 1, 0, 1).toISOString();
        const { data: moments } = await supabase
          .from('moments')
          .select('text, ai_summary')
          .gte('created_at', start)
          .lte('created_at', end)
          .order('created_at', { ascending: true });
        const joined = (moments || []).map(m => m.ai_summary || m.text || '').filter(Boolean).join('\n');
        const ai = new SiliconFlowAIService();
        const summary = joined ? await ai.generateSummary(joined) : '';
      await supabase
        .from('life_summary')
        .upsert([{ id: 1, global_summary: summary, node_count: (moments || []).length, updated_at: new Date().toISOString() }], { onConflict: 'id' });
      }
      console.log('✅ 宇宙维护任务完成');
    } catch (error) {
      console.error('❌ 宇宙维护任务失败:', error);
    }
  });

  // 每周摘要（每周一 00:00 触发，生成上一周摘要）
  cron.schedule('0 0 * * 1', async () => {
    console.log('🗓️  周摘要生成任务开始...');
    try {
      const { SiliconFlowAIService } = require('./lib/ai-service');
      const ai = new SiliconFlowAIService();
      const now = new Date();
      const t = new Date(now);
      t.setDate(t.getDate() - 7); // 上一周
      const d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const y = d.getUTCFullYear();
      const w = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      const weekStartLocal = new Date(t);
      weekStartLocal.setDate(t.getDate() - (t.getDay() || 7) + 1); // 周一
      const start = new Date(weekStartLocal.getFullYear(), weekStartLocal.getMonth(), weekStartLocal.getDate());
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data: moments } = await supabase
        .from('moments')
        .select('text, ai_summary')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });
      const joined = (moments || []).map(m => m.ai_summary || m.text || '').filter(Boolean).join('\n');
      const summary = joined ? await ai.generateSummary(joined) : '';
      await supabase
        .from('weekly_summary')
        .upsert([{ year: y, week_num: w, summary, node_count: (moments || []).length }], { onConflict: 'year,week_num' });
      console.log(`✅ 周摘要生成完成: ${y}-W${w}, 节点数=${(moments || []).length}`);
    } catch (error) {
      console.error('❌ 周摘要生成失败:', error);
    }
  });

  // 每月摘要（每月1号 00:00 触发，生成上月摘要）
  cron.schedule('0 0 1 * *', async () => {
    console.log('🗓️  月摘要生成任务开始...');
    try {
      const { SiliconFlowAIService } = require('./lib/ai-service');
      const ai = new SiliconFlowAIService();
      const now = new Date();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevMonth.getFullYear();
      const m = prevMonth.getMonth() + 1;
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const { data: moments } = await supabase
        .from('moments')
        .select('text, ai_summary')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
        .order('created_at', { ascending: true });
      const joined = (moments || []).map(m => m.ai_summary || m.text || '').filter(Boolean).join('\n');
      const summary = joined ? await ai.generateSummary(joined) : '';
      await supabase
        .from('monthly_summary')
        .upsert([{ year: y, month: m, summary, node_count: (moments || []).length }], { onConflict: 'year,month' });
      console.log(`✅ 月摘要生成完成: ${y}-${m}, 节点数=${(moments || []).length}`);
    } catch (error) {
      console.error('❌ 月摘要生成失败:', error);
    }
  });

  // 启动服务器
  app.listen(PORT, () => {
    console.log(`🌌 混沌人生宇宙服务启动`);
    console.log(`🚀 服务器运行在端口: ${PORT}`);
    console.log(`⭐ 宇宙节点系统就绪`);
    console.log(`📊 健康检查: http://localhost:${PORT}/health`);
    console.log(`🔗 API 文档: http://localhost:${PORT}/`);
  });

async function checkAndRunImmediateSummaries() {
  try {
    const now = new Date();
    const day = now.getDay();
    if (day === 1) {
      const { SiliconFlowAIService } = require('./lib/ai-service');
      const ai = new SiliconFlowAIService();
      const t = new Date(now);
      t.setDate(t.getDate() - 7);
      const d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const y = d.getUTCFullYear();
      const w = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
      const weekStartLocal = new Date(t);
      weekStartLocal.setDate(t.getDate() - (t.getDay() || 7) + 1);
      const start = new Date(weekStartLocal.getFullYear(), weekStartLocal.getMonth(), weekStartLocal.getDate());
      const end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const { data: existing } = await supabase
        .from('weekly_summary')
        .select('year, week_num')
        .eq('year', y)
        .eq('week_num', w)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { data: moments } = await supabase
          .from('moments')
          .select('text, ai_summary')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });
        const joined = (moments || []).map(m => m.ai_summary || m.text || '').filter(Boolean).join('\n');
        const summary = joined ? await ai.generateSummary(joined) : '';
        await supabase
          .from('weekly_summary')
          .upsert([{ year: y, week_num: w, summary, node_count: (moments || []).length }], { onConflict: 'year,week_num' });
        console.log(`✅ 启动补跑周摘要完成: ${y}-W${w}, 节点数=${(moments || []).length}`);
      } else {
        console.log(`ℹ️ 周摘要已存在: ${y}-W${w}`);
      }
    }
    if (now.getDate() === 1) {
      const { SiliconFlowAIService } = require('./lib/ai-service');
      const ai = new SiliconFlowAIService();
      const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const y = prevMonth.getFullYear();
      const m = prevMonth.getMonth() + 1;
      const start = new Date(y, m - 1, 1);
      const end = new Date(y, m, 1);
      const { data: existing } = await supabase
        .from('monthly_summary')
        .select('year, month')
        .eq('year', y)
        .eq('month', m)
        .limit(1);
      if (!existing || existing.length === 0) {
        const { data: moments } = await supabase
          .from('moments')
          .select('text, ai_summary')
          .gte('created_at', start.toISOString())
          .lte('created_at', end.toISOString())
          .order('created_at', { ascending: true });
        const joined = (moments || []).map(mo => mo.ai_summary || mo.text || '').filter(Boolean).join('\n');
        const summary = joined ? await ai.generateSummary(joined) : '';
        await supabase
          .from('monthly_summary')
          .upsert([{ year: y, month: m, summary, node_count: (moments || []).length }], { onConflict: 'year,month' });
        console.log(`✅ 启动补跑月摘要完成: ${y}-${m}, 节点数=${(moments || []).length}`);
      } else {
        console.log(`ℹ️ 月摘要已存在: ${y}-${m}`);
      }
    }
  } catch (e) {
    console.error('即时摘要检查失败', e);
  }
}

// 注意：在无服务器环境（如 Vercel）不应使用 app.listen；此项目为常驻服务部署。

module.exports = app;
