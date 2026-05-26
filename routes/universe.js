const express = require('express');
const { CosmicCalculator, CosmicDatabase } = require('../lib/cosmic');
const { authenticateToken } = require('../lib/auth');
const { DeepSeekAIService } = require('../lib/ai-service');

const router = express.Router();

// 获取宇宙状态
router.get('/state', async (req, res) => {
  try {
    const db = new CosmicDatabase(req.supabase);
    const stats = await db.getCosmicStats();
    
    // 获取最近的节点用于当前状态
    const recentNodes = await db.getCosmicNodes({
      limit: 10,
      offset: 0
    });
    
    // 计算宇宙常数
    const cosmicConstants = {
      gravitational_constant: 6.67430e-11, // 引力常数
      speed_of_light: 299792458, // 光速
      planck_constant: 6.62607015e-34, // 普朗克常数
      cosmic_background_temperature: 2.725 // 宇宙背景温度
    };
    
    res.json({
      success: true,
      data: {
        stats,
        recent_nodes: recentNodes,
        cosmic_constants: cosmicConstants,
        observer_position: {
          x: 0,
          y: 0,
          z: 0
        },
        current_time: new Date().toISOString(),
        universe_age: stats.total_moments > 0 ? Math.floor(stats.total_moments / 365) : 0
      }
    });
  } catch (error) {
    console.error('获取宇宙状态失败:', error);
    res.status(500).json({
      success: false,
      error: '获取宇宙状态失败',
      message: error.message
    });
  }
});

// 时间旅行 - 跳转到指定时间
router.post('/time-travel', async (req, res) => {
  try {
    const { target_time, dimension = 'day', fields = 'basic' } = req.body;
    
    if (!target_time) {
      return res.status(400).json({
        success: false,
        error: '目标时间不能为空'
      });
    }
    
    const targetDate = new Date(target_time);
    const now = new Date();
    
    let startDate, endDate;
    
    // 根据维度计算时间范围
    switch (dimension) {
      case 'day':
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate() + 1);
        break;
      case 'week':
        const weekStart = new Date(targetDate);
        weekStart.setDate(targetDate.getDate() - targetDate.getDay());
        startDate = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
        endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000);
        break;
      case 'month':
        startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
        endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 1);
        break;
      case 'year':
        startDate = new Date(targetDate.getFullYear(), 0, 1);
        endDate = new Date(targetDate.getFullYear() + 1, 0, 1);
        break;
      default:
        startDate = new Date(targetDate.getTime() - 24 * 60 * 60 * 1000);
        endDate = new Date(targetDate.getTime() + 24 * 60 * 60 * 1000);
    }
    
    const db = new CosmicDatabase(req.supabase);
    const nodes = await db.getCosmicNodes({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 1000
    });
    
    // 根据 fields 参数过滤节点数据
    const filteredNodes = nodes.map(node => {
      if (fields === 'basic') {
        // 基本数据：返回前端渲染宇宙场景所需的所有字段
        return {
          id: node.id,
          ai_tags: node.ai_tags,
          ai_emotion: node.ai_emotion,
          ai_importance: node.ai_importance,
          cosmic: {
            position_x: node.cosmic.position_x,
            position_y: node.cosmic.position_y,
            position_z: node.cosmic.position_z,
            size: node.cosmic.size,
            color: node.cosmic.color,
            opacity: node.cosmic.opacity,
            halo: node.cosmic.halo,
            brightness: node.cosmic.brightness,
            mass: node.cosmic.mass,
            gravity: node.cosmic.gravity,
            constellation: node.cosmic.constellation
          }
        };
      }
      // 完整数据：返回所有字段，用于节点详情显示
      return {
        id: node.id,
        created_at: node.created_at,
        text: node.text,
        file_path: node.file_path,
        ai_summary: node.ai_summary,
        ai_tags: node.ai_tags,
        ai_emotion: node.ai_emotion,
        ai_importance: node.ai_importance,
        cosmic: node.cosmic
      };
    });
    
    // 计算时间旅行效果
    const timeDistance = Math.abs(now - targetDate) / (1000 * 60 * 60 * 24);
    const timeWarpEffect = {
      distortion_factor: Math.min(1, timeDistance / 365), // 时间扭曲因子
      temporal_shift: timeDistance > 365 ? 'major' : timeDistance > 30 ? 'minor' : 'minimal',
      causality_impact: timeDistance > 1825 ? 'significant' : 'low' // 5年以上可能有因果关系影响
    };
    
    res.json({
      success: true,
      data: {
        nodes: filteredNodes,
        time_range: {
          start: startDate.toISOString(),
          end: endDate.toISOString(),
          target: targetDate.toISOString()
        },
        time_warp_effect: timeWarpEffect,
        dimension,
        node_count: filteredNodes.length,
        fields
      }
    });
  } catch (error) {
    console.error('时间旅行失败:', error);
    res.status(500).json({
      success: false,
      error: '时间旅行失败',
      message: error.message
    });
  }
});

// 获取星座（标签群组）
router.get('/constellations', async (req, res) => {
  try {
    const { data: constRows, error: constError } = await req.supabase
      .from('constellations')
      .select('name, color, description, created_at, position_x, position_y, position_z')
      .limit(1000);
    if (constError) throw constError;

    const { data: moments, error: momentsError } = await req.supabase
      .from('moments')
      .select('ai_emotion, created_at, cosmic_constellation')
      .not('cosmic_constellation', 'is', null)
      .limit(10000);
    if (momentsError) throw momentsError;

    const constellationList = (constRows || []).map(row => {
      const name = String(row.name);
      const nodes = (moments || []).filter(m => {
        try {
          const c = JSON.parse(m.cosmic_constellation || '[]');
          return Array.isArray(c) && c[0] && String(c[0]) === name;
        } catch (_) {
          return false;
        }
      });

      const emotionCounts = nodes.reduce((acc, n) => {
        const key = n.ai_emotion || 'unknown';
        acc[key] = (acc[key] || 0) + 1;
        return acc;
      }, {});
      const dominantEmotion = Object.keys(emotionCounts).reduce((a, b) =>
        (emotionCounts[a] || 0) >= (emotionCounts[b] || 0) ? a : b,
        'unknown'
      );
      const brightness = nodes.length === 0
        ? 0
        : Math.min(1, nodes.length * 0.1 + ((emotionCounts[dominantEmotion] || 0) / nodes.length) * 0.5);
      const timeSpan = nodes.reduce((span, n) => {
        const t = new Date(n.created_at);
        if (!span.start || t < new Date(span.start)) span.start = n.created_at;
        if (!span.end || t > new Date(span.end)) span.end = n.created_at;
        return span;
      }, { start: null, end: null });

      const anchor = CosmicCalculator.getGalaxyAnchor(name);
      const center = {
        x: (row.position_x != null) ? row.position_x : anchor.x,
        y: (row.position_y != null) ? row.position_y : anchor.y,
        z: (row.position_z != null) ? row.position_z : anchor.z
      };
      return {
        name,
        node_count: nodes.length,
        dominant_emotion: dominantEmotion,
        time_span: timeSpan,
        brightness,
        color: row.color || CosmicCalculator.getEmotionColor(dominantEmotion),
        center
      };
    }).sort((a, b) => b.node_count - a.node_count);

    res.json({
      success: true,
      data: constellationList,
      meta: {
        total: constellationList.length,
        total_nodes: (moments || []).length
      }
    });
  } catch (error) {
    console.error('获取星座失败:', error);
    res.status(500).json({
      success: false,
      error: '获取星座失败',
      message: error.message
    });
  }
});



// 维度切换
router.post('/dimension-switch', async (req, res) => {
  try {
    const { dimension, center_time = new Date().toISOString() } = req.body;
    
    const validDimensions = ['day', 'week', 'month', 'year', 'all'];
    if (!validDimensions.includes(dimension)) {
      return res.status(400).json({
        success: false,
        error: '无效的维度',
        message: `支持的维度: ${validDimensions.join(', ')}`
      });
    }
    
    const centerDate = new Date(center_time);
    let timeRange = {};
    
    // 根据维度计算时间范围
    switch (dimension) {
      case 'day':
        timeRange = {
          start: new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate()),
          end: new Date(centerDate.getFullYear(), centerDate.getMonth(), centerDate.getDate() + 1)
        };
        break;
      case 'week':
        const weekStart = new Date(centerDate);
        weekStart.setDate(centerDate.getDate() - centerDate.getDay());
        timeRange = {
          start: new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate()),
          end: new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
        };
        break;
      case 'month':
        timeRange = {
          start: new Date(centerDate.getFullYear(), centerDate.getMonth(), 1),
          end: new Date(centerDate.getFullYear(), centerDate.getMonth() + 1, 1)
        };
        break;
      case 'year':
        timeRange = {
          start: new Date(centerDate.getFullYear(), 0, 1),
          end: new Date(centerDate.getFullYear() + 1, 0, 1)
        };
        break;
      case 'all':
        timeRange = {
          start: new Date(2020, 0, 1), // 从2020年开始
          end: new Date()
        };
        break;
    }
    
    const db = new CosmicDatabase(req.supabase);
    const nodes = await db.getCosmicNodes({
      startDate: timeRange.start.toISOString(),
      endDate: timeRange.end.toISOString(),
      limit: 1000
    });
    
    // 维度特定的宇宙属性调整
    const dimensionConfig = {
      day: {
        time_scale: 1,
        space_scale: 0.5,
        node_density: nodes.length / 24, // 每小时密度
        spiral_tightness: 2.0
      },
      week: {
        time_scale: 7,
        space_scale: 1.0,
        node_density: nodes.length / 7, // 每天密度
        spiral_tightness: 1.5
      },
      month: {
        time_scale: 30,
        space_scale: 2.0,
        node_density: nodes.length / 30, // 每天密度
        spiral_tightness: 1.0
      },
      year: {
        time_scale: 365,
        space_scale: 4.0,
        node_density: nodes.length / 365, // 每天密度
        spiral_tightness: 0.5
      },
      all: {
        time_scale: Math.max(365, nodes.length / 10),
        space_scale: 8.0,
        node_density: nodes.length / Math.max(365, nodes.length / 10),
        spiral_tightness: 0.2
      }
    };
    
    res.json({
      success: true,
      data: {
        nodes,
        dimension,
        time_range: {
          start: timeRange.start.toISOString(),
          end: timeRange.end.toISOString(),
          center: centerDate.toISOString()
        },
        dimension_config: dimensionConfig[dimension],
        node_count: nodes.length
      }
    });
  } catch (error) {
    console.error('维度切换失败:', error);
    res.status(500).json({
      success: false,
      error: '维度切换失败',
      message: error.message
    });
  }
});

router.post('/summaries/weekly', authenticateToken, async (req, res) => {
  try {
    const { year, week_num, target_time } = req.body;
    let start, end, y, w;
    if (year && week_num) {
      const base = new Date(Date.UTC(year, 0, 4));
      const day = base.getUTCDay() || 7;
      const week1Monday = new Date(base);
      week1Monday.setUTCDate(base.getUTCDate() - day + 1);
      start = new Date(week1Monday);
      start.setUTCDate(week1Monday.getUTCDate() + (week_num - 1) * 7);
      end = new Date(start);
      end.setUTCDate(start.getUTCDate() + 7);
      y = year;
      w = week_num;
    } else {
      const base = target_time ? new Date(target_time) : new Date();
      base.setDate(base.getDate() - 7);
      const weekStart = new Date(base);
      weekStart.setDate(base.getDate() - base.getDay());
      start = new Date(weekStart.getFullYear(), weekStart.getMonth(), weekStart.getDate());
      end = new Date(start.getTime() + 7 * 24 * 60 * 60 * 1000);
      const d = new Date(Date.UTC(base.getFullYear(), base.getMonth(), base.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      y = d.getUTCFullYear();
      w = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    }
    const { data: moments, error } = await req.supabase
      .from('moments')
      .select('text, ai_summary')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;
    const joined = (moments || []).map(m => m.ai_summary || m.text || '').filter(Boolean).join('\n');
    const ai = new DeepSeekAIService();
    const summary = joined ? await ai.generateSummaryForPeriod(joined) : '';
    const upsert = await req.supabase
      .from('weekly_summary')
      .upsert([{ year: y, week_num: w, summary, node_count: (moments || []).length }], { onConflict: 'year,week_num' })
      .select()
      .single();
    res.json({ success: true, data: { year: y, week_num: w, summary, count: (moments || []).length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成周摘要失败', message: error.message });
  }
});

router.post('/summaries/monthly', authenticateToken, async (req, res) => {
  try {
    const { year, month, target_time } = req.body;
    let y, m, start, end;
    if (year && month !== undefined) {
      y = parseInt(year);
      m = parseInt(month);
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 1);
    } else {
      const t = target_time ? new Date(target_time) : new Date();
      y = t.getFullYear();
      m = t.getMonth() + 1;
      start = new Date(y, m - 1, 1);
      end = new Date(y, m, 1);
    }
    const { data: moments, error } = await req.supabase
      .from('moments')
      .select('text, ai_summary')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;
    const joined = (moments || []).map(mo => mo.ai_summary || mo.text || '').filter(Boolean).join('\n');
    const ai = new DeepSeekAIService();
    const summary = joined ? await ai.generateSummaryForPeriod(joined) : '';
    const upsert = await req.supabase
      .from('monthly_summary')
      .upsert([{ year: y, month: m, summary, node_count: (moments || []).length }], { onConflict: 'year,month' })
      .select()
      .single();
    res.json({ success: true, data: { year: y, month: m, summary, count: (moments || []).length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成月摘要失败', message: error.message });
  }
});

router.post('/summaries/life-annual', authenticateToken, async (req, res) => {
  try {
    const { year } = req.body;
    const y = year ? parseInt(year) : new Date().getFullYear();
    const start = new Date(y, 0, 1);
    const end = new Date(y + 1, 0, 1);
    const { data: moments, error } = await req.supabase
      .from('moments')
      .select('text, ai_summary')
      .gte('created_at', start.toISOString())
      .lte('created_at', end.toISOString())
      .order('created_at', { ascending: true });
    if (error) throw error;
    const joined = (moments || []).map(m => m.ai_summary || m.text || '').filter(Boolean).join('\n');
    const ai = new DeepSeekAIService();
    const summary = joined ? await ai.generateSummaryForPeriod(joined) : '';
    await req.supabase
      .from('life_summary')
      .upsert([{ id: 1, global_summary: summary, node_count: (moments || []).length, updated_at: new Date().toISOString() }], { onConflict: 'id' });
    res.json({ success: true, data: { year: y, summary, count: (moments || []).length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成年度总览失败', message: error.message });
  }
});

router.get('/summaries/weekly', async (req, res) => {
  try {
    const { year, week_num } = req.query;
    if (year && week_num) {
      const { data, error } = await req.supabase
        .from('weekly_summary')
        .select('*')
        .eq('year', parseInt(year))
        .eq('week_num', parseInt(week_num))
        .single();
      if (error) throw error;
      return res.json({ success: true, data: { year: data.year, week_num: data.week_num, summary: data.summary, count: data.node_count || 0 } });
    } else {
      const { data, error } = await req.supabase
        .from('weekly_summary')
        .select('*')
        .order('year', { ascending: false })
        .order('week_num', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || !data.length) return res.status(404).json({ success: false, error: '未找到周摘要' });
      const row = data[0];
      return res.json({ success: true, data: { year: row.year, week_num: row.week_num, summary: row.summary, count: row.node_count || 0 } });
    }
  } catch (error) {
    res.status(404).json({ success: false, error: '未找到周摘要', message: error.message });
  }
});

router.get('/summaries/monthly', async (req, res) => {
  try {
    const { year, month } = req.query;
    if (year && month) {
      const { data, error } = await req.supabase
        .from('monthly_summary')
        .select('*')
        .eq('year', parseInt(year))
        .eq('month', parseInt(month))
        .single();
      if (error) throw error;
      return res.json({ success: true, data: { year: data.year, month: data.month, summary: data.summary, count: data.node_count || 0 } });
    } else {
      const { data, error } = await req.supabase
        .from('monthly_summary')
        .select('*')
        .order('year', { ascending: false })
        .order('month', { ascending: false })
        .limit(1);
      if (error) throw error;
      if (!data || !data.length) return res.status(404).json({ success: false, error: '未找到月摘要' });
      const row = data[0];
      return res.json({ success: true, data: { year: row.year, month: row.month, summary: row.summary, count: row.node_count || 0 } });
    }
  } catch (error) {
    res.status(404).json({ success: false, error: '未找到月摘要', message: error.message });
  }
});

router.get('/summaries/life', async (req, res) => {
  try {
    const { data, error } = await req.supabase
      .from('life_summary')
      .select('*')
      .eq('id', 1)
      .single();
    if (error) throw error;
    const updatedAt = data.updated_at ? new Date(data.updated_at) : new Date();
    const year = (updatedAt.getMonth() === 0 && updatedAt.getDate() === 1)
      ? updatedAt.getFullYear() - 1
      : updatedAt.getFullYear();
    const start = new Date(year, 0, 1).toISOString();
    const end = new Date(year + 1, 0, 1).toISOString();
    const { data: nodes } = await req.supabase
      .from('moments')
      .select('id')
      .gte('created_at', start)
      .lte('created_at', end);
    const count = (nodes || []).length;
    const storedCount = typeof data.node_count === 'number' ? data.node_count : null;
    res.json({ success: true, data: { year, summary: data.global_summary || '', count: storedCount ?? count, updated_at: data.updated_at } });
  } catch (error) {
    res.status(404).json({ success: false, error: '未找到总览摘要', message: error.message });
  }
});

// 摘要状态检测
router.get('/summaries/status', async (req, res) => {
  try {
    const now = new Date();
    // 计算上一周
    const t = new Date(now);
    t.setDate(t.getDate() - 7);
    const d = new Date(Date.UTC(t.getFullYear(), t.getMonth(), t.getDate()));
    const dayNum = d.getUTCDay() || 7;
    d.setUTCDate(d.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
    const weeklyYear = d.getUTCFullYear();
    const weeklyNum = Math.ceil((((d - yearStart) / 86400000) + 1) / 7);
    const weekStartLocal = new Date(t);
    weekStartLocal.setDate(t.getDate() - (t.getDay() || 7) + 1);
    const weeklyRange = {
      start: new Date(weekStartLocal.getFullYear(), weekStartLocal.getMonth(), weekStartLocal.getDate()).toISOString(),
      end: new Date(weekStartLocal.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString()
    };

    // 计算上一月
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const monthlyYear = prevMonth.getFullYear();
    const monthlyMonth = prevMonth.getMonth() + 1;
    const monthlyRange = {
      start: new Date(monthlyYear, monthlyMonth - 1, 1).toISOString(),
      end: new Date(monthlyYear, monthlyMonth, 1).toISOString()
    };

    const { data: weekly } = await req.supabase
      .from('weekly_summary')
      .select('*')
      .eq('year', weeklyYear)
      .eq('week_num', weeklyNum)
      .limit(1);
    const { data: monthly } = await req.supabase
      .from('monthly_summary')
      .select('*')
      .eq('year', monthlyYear)
      .eq('month', monthlyMonth)
      .limit(1);
    const { data: life } = await req.supabase
      .from('life_summary')
      .select('updated_at, node_count')
      .eq('id', 1)
      .limit(1);

    res.json({
      success: true,
      data: {
        weekly: {
          exists: Array.isArray(weekly) && weekly.length > 0,
          year: weeklyYear,
          week_num: weeklyNum,
          range: weeklyRange
        },
        monthly: {
          exists: Array.isArray(monthly) && monthly.length > 0,
          year: monthlyYear,
          month: monthlyMonth,
          range: monthlyRange
        },
        life: {
          updated_at: life && life.length ? life[0].updated_at : null,
          node_count: life && life.length ? life[0].node_count : null
        }
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: '摘要状态检测失败', message: error.message });
  }
});

module.exports = router;
