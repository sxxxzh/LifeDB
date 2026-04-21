const express = require('express');
const { CosmicCalculator, CosmicDatabase } = require('../lib/cosmic');
const { reassignNodeDistance } = require('../lib/node_placement');
const { authenticateToken } = require('../lib/auth');
const { SiliconFlowAIService } = require('../lib/ai-service');

const router = express.Router();

// 获取宇宙节点列表（无需认证）
router.get('/nodes', async (req, res) => {
  try {
    const {
      limit = 100,
      offset = 0,
      start_date,
      end_date,
      emotion,
      importance,
      dimension = 'all',
      search,
      fields = 'basic' // basic 或 full
    } = req.query;
    
    const db = new CosmicDatabase(req.supabase);
    
    let nodes;
    let total = 0;
    
    if (search) {
      nodes = await db.searchCosmicNodes(search);
      // 对于搜索结果，我们需要单独查询总数
      const { count: searchCount } = await req.supabase
        .from('moments_fts')
        .select('id', { count: 'exact' })
        .textSearch('text', search);
      total = searchCount || nodes.length;
    } else {
      nodes = await db.getCosmicNodes({
        limit: parseInt(limit),
        offset: parseInt(offset),
        startDate: start_date,
        endDate: end_date,
        emotion,
        importance: importance ? parseInt(importance) : undefined,
        dimension
      });
      
      // 获取实际的总节点数量
      const { count: totalCount } = await req.supabase
        .from('moments')
        .select('id', { count: 'exact' });
      total = totalCount || nodes.length;
    }
    
    // 根据 fields 参数过滤节点数据
    const filteredNodes = nodes.map(node => {
      const publicUrl = (() => {
        try {
          if (node.file_path) {
            const { data: { publicUrl } } = req.supabase.storage
              .from('chaos-life')
              .getPublicUrl(node.file_path);
            return publicUrl || null;
          }
        } catch (_) {}
        return null;
      })();
      if (fields === 'basic') {
        // 基本数据：返回前端渲染宇宙场景所需的所有字段
        return {
          id: node.id,
          ai_tags: node.ai_tags,
          ai_emotion: node.ai_emotion,
          ai_importance: node.ai_importance,
          file_path: publicUrl,
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
        file_path: publicUrl,
        ai_summary: node.ai_summary,
        ai_tags: node.ai_tags,
        ai_emotion: node.ai_emotion,
        ai_importance: node.ai_importance,
        cosmic: node.cosmic
      };
    });
    
    res.json({
      success: true,
      data: filteredNodes,
      meta: {
        total,
        limit: parseInt(limit),
        offset: parseInt(offset),
        dimension,
        fields
      }
    });
  } catch (error) {
    console.error('获取宇宙节点失败:', error);
    res.status(500).json({
      success: false,
      error: '获取宇宙节点失败',
      message: error.message
    });
  }
});

// 获取单个宇宙节点详情（无需认证）
router.get('/nodes/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const { data: moment, error } = await req.supabase
      .from('moments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error) {
      if (error.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: '宇宙节点不存在'
        });
      }
      throw error;
    }
    
    const { CosmicCalculator } = require('../lib/cosmic');
    const nodeWithCosmic = {
      ...moment,
      cosmic: CosmicCalculator.calculateCosmicAttributes(moment),
      file_path: (() => {
        try {
          if (moment.file_path) {
            const { data: { publicUrl } } = req.supabase.storage
              .from('chaos-life')
              .getPublicUrl(moment.file_path);
            return publicUrl || null;
          }
        } catch (_) {}
        return null;
      })()
    };
    
    res.json({
      success: true,
      data: nodeWithCosmic
    });
  } catch (error) {
    console.error('获取宇宙节点详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取宇宙节点详情失败',
      message: error.message
    });
  }
});

// 创建宇宙节点（需要认证）
router.post('/nodes', authenticateToken, async (req, res) => {
  try {
    const { text, ai_emotion, ai_importance, ai_tags, use_ai = true, ai_decide_galaxy = true, year, month, day, ai_prompt, ai_prompt_emotion, ai_prompt_importance, ai_prompt_tags, ai_prompt_summary, ai_prompt_galaxy } = req.body;
    
    // 基础验证
    if (!text || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: '文本内容不能为空'
      });
    }
    
    const aiService = new SiliconFlowAIService();
    let aiData = {};
    let galaxyDecision = null; // 存储星系决策结果
    
    if (use_ai && (ai_decide_galaxy || (!ai_emotion || !ai_importance || !ai_tags || ai_tags.length === 0))) {
      const aiResult = await aiService.analyzeText(text.trim(), {
        emotion: ai_prompt_emotion || ai_prompt,
        importance: ai_prompt_importance || ai_prompt,
        tags: ai_prompt_tags || ai_prompt,
        summary: ai_prompt_summary || ai_prompt
      });
      
      const { data: constellationRows } = await req.supabase
        .from('constellations')
        .select('name')
        .limit(1000);
      const existingSet = new Set((constellationRows || []).map(r => String(r.name)).filter(Boolean));
      const candidates = Array.from(existingSet);
      
      const fullTags = Array.isArray(aiResult.ai_tags) ? aiResult.ai_tags.map(t => String(t)).filter(Boolean) : [];
      if (Array.isArray(ai_tags)) {
        ai_tags.forEach(t => { const s = String(t); if (s && !fullTags.includes(s)) fullTags.push(s); });
      }
      
      // 只有当ai_decide_galaxy为true时才调用decideGalaxy函数来决定星系
      if (ai_decide_galaxy) {
        galaxyDecision = await aiService.decideGalaxy(text.trim(), candidates, ai_prompt_galaxy || ai_prompt);
      } else {
        // 当ai_decide_galaxy为false时，直接使用用户传入的第一个标签作为星系
        if (Array.isArray(ai_tags) && ai_tags.length > 0) {
          galaxyDecision = { name: String(ai_tags[0]), is_new: false };
        } else if (fullTags.length > 0) {
          galaxyDecision = { name: fullTags[0], is_new: false };
        } else {
          // 如果没有提供标签，则使用默认星系
          galaxyDecision = { name: '生活', is_new: false };
        }
      }
      
      const aiTagsNormalized = (() => {
        const list = fullTags.slice();
        const name = String(galaxyDecision.name);
        const idx = list.indexOf(name);
        if (idx > 0) { list.splice(idx, 1); }
        if (!list.length || list[0] !== name) { list.unshift(name); }
        return list;
      })();
      
      aiData = {
        ai_emotion: ai_emotion || aiResult.ai_emotion,
        ai_importance: ai_importance !== undefined ? Math.max(0, Math.min(5, parseInt(ai_importance) || 0)) : aiResult.ai_importance,
        ai_tags: aiTagsNormalized,
        ai_summary: aiResult.ai_summary
      };
      
      // 若为新星系，登记星系坐标（使用锚点坐标）- 仅当ai_decide_galaxy为true时
      try {
        if (ai_decide_galaxy) {
          const { CosmicCalculator } = require('../lib/cosmic');
          
          // 获取所有现有星系的锚点
          const { data: existingConstellations } = await req.supabase
            .from('constellations')
            .select('position_x, position_y, position_z')
            .neq('name', galaxyDecision.name);
          
          // 转换为锚点数组
          const existingAnchors = (existingConstellations || []).filter(c => 
            c.position_x != null && c.position_y != null && c.position_z != null
          ).map(c => ({
            x: c.position_x,
            y: c.position_y,
            z: c.position_z
          }));
          
          // 生成满足距离要求的锚点
          const anchor = await CosmicCalculator.generateValidGalaxyAnchor(
            galaxyDecision.name,
            existingAnchors,
            1000
          );
          
          const { data: existing } = await req.supabase
            .from('constellations')
            .select('id')
            .eq('name', galaxyDecision.name)
            .limit(1);
          if (!existing || existing.length === 0) {
            await req.supabase
              .from('constellations')
              .upsert([{ name: galaxyDecision.name, position_x: anchor.x, position_y: anchor.y, position_z: anchor.z }], { onConflict: 'name' });
          }
        }
      } catch (_) {}
    } else {
      const providedTags = Array.isArray(ai_tags) ? ai_tags.map(t => String(t)).filter(Boolean) : [];
      
      // 当ai_decide_galaxy为false时，直接使用用户传入的第一个标签作为星系
      if (providedTags.length > 0) {
        galaxyDecision = { name: providedTags[0], is_new: false };
      } else {
        // 如果没有提供标签，则使用默认星系
        galaxyDecision = { name: '生活', is_new: false };
      }
      
      const normalized = (() => {
        const list = providedTags.slice();
        const name = String(galaxyDecision.name);
        const idx = list.indexOf(name);
        if (idx > 0) { list.splice(idx, 1); }
        if (!list.length || list[0] !== name) { list.unshift(name); }
        return list;
      })();
      
      aiData = {
        ai_emotion: ai_emotion || 'calm',
        ai_importance: ai_importance !== undefined ? Math.max(0, Math.min(5, parseInt(ai_importance) || 0)) : 2,
        ai_tags: normalized.length > 0 ? normalized : null,
        ai_summary: text.substring(0, 50) + (text.length > 50 ? '...' : '')
      };
    }

    // 统一将选定的星系标签写入 constellations（仅当ai_decide_galaxy为true时）
    if (galaxyDecision && galaxyDecision.name && ai_decide_galaxy) {
      const { CosmicCalculator } = require('../lib/cosmic');
      
      // 获取所有现有星系的锚点
      const { data: existingConstellations } = await req.supabase
        .from('constellations')
        .select('position_x, position_y, position_z')
        .neq('name', galaxyDecision.name);
      
      // 转换为锚点数组
      const existingAnchors = (existingConstellations || []).filter(c => 
        c.position_x != null && c.position_y != null && c.position_z != null
      ).map(c => ({
        x: c.position_x,
        y: c.position_y,
        z: c.position_z
      }));
      
      // 生成满足距离要求的锚点
      const anchor = await CosmicCalculator.generateValidGalaxyAnchor(
        galaxyDecision.name,
        existingAnchors,
        1000
      );
      
      const { data: existing } = await req.supabase
        .from('constellations')
        .select('id')
        .eq('name', galaxyDecision.name)
        .limit(1);
      if (!existing || existing.length === 0) {
        await req.supabase
          .from('constellations')
          .upsert([{ name: String(galaxyDecision.name), position_x: anchor.x, position_y: anchor.y, position_z: anchor.z }], { onConflict: 'name' });
      }
    }
    
    const now = new Date();
    const y = parseInt(year) || now.getFullYear();
    const m = parseInt(month) || (now.getMonth() + 1);
    const d = parseInt(day) || now.getDate();
    const createdAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
    const momentData = {
      text: text.trim(),
      ...aiData,
      created_at: createdAt
    };
    
    const { CosmicCalculator } = require('../lib/cosmic');
    const galaxyName = galaxyDecision ? String(galaxyDecision.name) : null;
    let galaxyExistedBefore = false;
    if (galaxyName) {
      try {
        const { data: existedRow } = await req.supabase
          .from('constellations')
          .select('id')
          .eq('name', galaxyName)
          .limit(1);
        galaxyExistedBefore = Array.isArray(existedRow) && existedRow.length > 0;
      } catch (_) {}
    }
    let relatedMoments = [];
    if (galaxyName) {
      const { data: relatedRows } = await req.supabase
        .from('moments')
        .select('*')
        .limit(1000);
      relatedMoments = (relatedRows || []).filter(r => {
        try {
          const c = r.cosmic_constellation ? JSON.parse(r.cosmic_constellation || '[]') : [];
          const matchConstellation = Array.isArray(c) && c[0] && String(c[0]) === galaxyName;
          if (matchConstellation) return true;
          const t = Array.isArray(r.ai_tags) ? r.ai_tags : JSON.parse(r.ai_tags || '[]');
          return t[0] && String(t[0]) === galaxyName;
        } catch (_) { return false; }
      });
    }
    let cosmicAttributes = CosmicCalculator.calculateCosmicAttributes({
      ...momentData,
      created_at: momentData.created_at
    });

    if (galaxyName) {
      try {
        const { data: row } = await req.supabase
          .from('constellations')
          .select('position_x, position_y, position_z')
          .eq('name', galaxyName)
          .single();
        if (row && row.position_x != null && row.position_y != null && row.position_z != null) {
          const anchor = CosmicCalculator.getGalaxyAnchor(galaxyName);
          const dx = row.position_x - anchor.x;
          const dy = row.position_y - anchor.y;
          const dz = row.position_z - anchor.z;
          cosmicAttributes.position_x += dx;
          cosmicAttributes.position_y += dy;
          cosmicAttributes.position_z += dz;
        }
      } catch (_) {}
    }

    // 最小节点间距离：使用内容哈希方向，从数据库锚点为中心外推直到满足阈值
    if (galaxyName && relatedMoments.length > 0) {
      try {
        const { data: centerRow } = await req.supabase
          .from('constellations')
          .select('position_x, position_y, position_z')
          .eq('name', galaxyName)
          .single();
        if (centerRow && centerRow.position_x != null && centerRow.position_y != null && centerRow.position_z != null) {
          const seed = CosmicCalculator.generateContentSeed(momentData);
          let dir = { x: seed.microOffset.x, y: seed.microOffset.y, z: seed.microOffset.z };
          const norm = Math.sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z) || 1;
          dir.x /= norm; dir.y /= norm; dir.z /= norm;
          const minDist = 120;
          const maxRadius = 800;
          const baseImp = (momentData.ai_importance != null ? parseInt(momentData.ai_importance) : 2);
          let radius = Math.max(300, Math.min(500, 300 + (baseImp - 2) * 50));
          let candidate = {
            x: centerRow.position_x + dir.x * radius,
            y: centerRow.position_y + dir.y * radius,
            z: centerRow.position_z + dir.z * radius,
          };
          const existingPositions = relatedMoments.map(r => ({
            x: r.cosmic_position_x,
            y: r.cosmic_position_y,
            z: r.cosmic_position_z,
          })).filter(p => p.x != null && p.y != null && p.z != null);
          let attempts = 0;
          const tooClose = () => existingPositions.some(p => {
            const dx = candidate.x - p.x;
            const dy = candidate.y - p.y;
            const dz = candidate.z - p.z;
            return Math.sqrt(dx*dx + dy*dy + dz*dz) < minDist;
          });
          while (tooClose() && attempts < 20) {
            radius = Math.min(maxRadius, radius + 30);
            candidate.x = centerRow.position_x + dir.x * radius;
            candidate.y = centerRow.position_y + dir.y * radius;
            candidate.z = centerRow.position_z + dir.z * radius;
            attempts++;
          }
          cosmicAttributes.position_x = candidate.x;
          cosmicAttributes.position_y = candidate.y;
          cosmicAttributes.position_z = candidate.z;
        }
      } catch (_) {}
    }

    // 若为新星系（没有关联节点），尝试使用 constellations 表的坐标作为中心
    if (galaxyName && relatedMoments.length === 0) {
      try {
        const { data: row } = await req.supabase
          .from('constellations')
          .select('position_x, position_y, position_z')
          .eq('name', galaxyName)
          .single();
        if (row && row.position_x != null && row.position_y != null && row.position_z != null) {
          cosmicAttributes.position_x = row.position_x;
          cosmicAttributes.position_y = row.position_y;
          cosmicAttributes.position_z = row.position_z;
        }
      } catch (_) {}
      
      // 星系锚点已经在注册时通过generateValidGalaxyAnchor确保了距离要求
      // 这里不再需要重复检查和调整
      
      if (galaxyExistedBefore) {
        const seed = CosmicCalculator.generateContentSeed({ ...momentData, created_at: momentData.created_at });
        let sx = seed.microOffset.x * 0.5;
        let sy = seed.microOffset.y * 0.5;
        let sz = seed.microOffset.z * 0.5;
        const maxR = 400;
        const r = Math.sqrt(sx*sx + sy*sy + sz*sz);
        if (r > maxR && r > 0) { const kk = maxR / r; sx *= kk; sy *= kk; sz *= kk; }
        cosmicAttributes.position_x += sx;
        cosmicAttributes.position_y += sy;
        cosmicAttributes.position_z += sz;
      }
    }
    
    const momentDataWithCosmic = {
      ...momentData,
      cosmic_position_x: cosmicAttributes.position_x,
      cosmic_position_y: cosmicAttributes.position_y,
      cosmic_position_z: cosmicAttributes.position_z,
      cosmic_brightness: cosmicAttributes.brightness,
      cosmic_mass: cosmicAttributes.mass,
      cosmic_gravity: cosmicAttributes.gravity,
      cosmic_constellation: cosmicAttributes.constellation ? JSON.stringify(cosmicAttributes.constellation) : null
    };
    
    const db = new CosmicDatabase(req.supabase);
    const newNode = await db.createCosmicNode(momentDataWithCosmic);
    
    // 返回给前端的数据格式
    const nodeWithCosmic = {
      ...newNode,
      cosmic: cosmicAttributes
    };
    
    res.status(201).json({
      success: true,
      data: nodeWithCosmic,
      message: '宇宙节点创建成功'
    });
  } catch (error) {
    console.error('创建宇宙节点失败:', error);
    res.status(500).json({
      success: false,
      error: '创建宇宙节点失败',
      message: error.message
    });
  }
});

// 删除宇宙节点（需要认证）
router.delete('/nodes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    
    // 首先获取节点信息（为了删除关联文件）
    const { data: moment, error: getError } = await req.supabase
      .from('moments')
      .select('file_path')
      .eq('id', id)
      .single();
    
    if (getError) {
      if (getError.code === 'PGRST116') {
        return res.status(404).json({
          success: false,
          error: '宇宙节点不存在'
        });
      }
      throw getError;
    }
    
    // 删除节点
    const { error: deleteError } = await req.supabase
      .from('moments')
      .delete()
      .eq('id', id);
    
    if (deleteError) throw deleteError;
    
    // 如果有文件，从 Supabase 存储中删除
    if (moment.file_path) {
      try {
        await req.supabase.storage
          .from('chaos-life')
          .remove([moment.file_path]);
      } catch (storageError) {
        console.error('删除存储文件失败:', storageError);
        // 不抛出错误，因为数据库记录已删除
      }
    }
    
    res.json({
      success: true,
      message: '宇宙节点已删除'
    });
  } catch (error) {
    console.error('删除宇宙节点失败:', error);
    res.status(500).json({
      success: false,
      error: '删除宇宙节点失败',
      message: error.message
    });
  }
});

router.put('/nodes/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, ai_emotion, ai_importance, ai_tags, ai_summary, year, month, day, position_x, position_y, position_z } = req.body;
    const { data: existing, error: getError } = await req.supabase
      .from('moments')
      .select('*')
      .eq('id', id)
      .single();
    if (getError) {
      return res.status(404).json({ success: false, error: '宇宙节点不存在' });
    }
    const now = new Date();
    const y = parseInt(year) || new Date(existing.created_at).getFullYear();
    const m = parseInt(month) || (new Date(existing.created_at).getMonth() + 1);
    const d = parseInt(day) || new Date(existing.created_at).getDate();
    const createdAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
    const updated = {
      text: typeof text === 'string' ? text.trim() : existing.text,
      ai_emotion: ai_emotion !== undefined ? ai_emotion : existing.ai_emotion,
      ai_importance: ai_importance !== undefined ? Math.max(0, Math.min(5, parseInt(ai_importance) || 0)) : existing.ai_importance,
      ai_tags: Array.isArray(ai_tags) ? ai_tags.map(t => String(t)).filter(Boolean) : existing.ai_tags,
      ai_summary: ai_summary !== undefined ? ai_summary : existing.ai_summary,
      created_at: createdAt
    };
    const galaxyName = Array.isArray(updated.ai_tags) && updated.ai_tags.length > 0 ? String(updated.ai_tags[0]) : (() => {
      try { const c = existing.cosmic_constellation ? JSON.parse(existing.cosmic_constellation || '[]') : []; return c[0] ? String(c[0]) : null; } catch (_) { return null; }
    })();
    const { CosmicCalculator } = require('../lib/cosmic');
    let relatedMoments = [];
    if (galaxyName) {
      const { data: relatedRows } = await req.supabase
        .from('moments')
        .select('*')
        .limit(1000);
      relatedMoments = (relatedRows || []).filter(r => {
        try {
          const c = r.cosmic_constellation ? JSON.parse(r.cosmic_constellation || '[]') : [];
          const matchConstellation = Array.isArray(c) && c[0] && String(c[0]) === galaxyName;
          if (matchConstellation) return true;
          const t = Array.isArray(r.ai_tags) ? r.ai_tags : JSON.parse(r.ai_tags || '[]');
          return t[0] && String(t[0]) === galaxyName;
        } catch (_) { return false; }
      });
    }
    let cosmic = CosmicCalculator.calculateCosmicAttributes({ ...existing, ...updated });
    if (
      position_x !== undefined && position_y !== undefined && position_z !== undefined &&
      position_x !== null && position_y !== null && position_z !== null
    ) {
      try {
        const px = parseFloat(position_x);
        const py = parseFloat(position_y);
        const pz = parseFloat(position_z);
        if (!Number.isNaN(px) && !Number.isNaN(py) && !Number.isNaN(pz)) {
          cosmic.position_x = px;
          cosmic.position_y = py;
          cosmic.position_z = pz;
        }
      } catch (_) {}
    }
    try {
      await req.supabase
        .from('moments')
        .update({
          text: updated.text,
          ai_emotion: updated.ai_emotion,
          ai_importance: updated.ai_importance,
          ai_tags: updated.ai_tags,
          ai_summary: updated.ai_summary,
          created_at: updated.created_at,
          cosmic_position_x: cosmic.position_x,
          cosmic_position_y: cosmic.position_y,
          cosmic_position_z: cosmic.position_z,
          cosmic_brightness: cosmic.brightness,
          cosmic_mass: cosmic.mass,
          cosmic_gravity: cosmic.gravity,
          cosmic_constellation: JSON.stringify(cosmic.constellation || (galaxyName ? [galaxyName] : []))
        })
        .eq('id', id);
    } catch (e) {
      return res.status(500).json({ success: false, error: '更新宇宙节点失败', message: e.message });
    }
    const nodeWithCosmic = { ...existing, ...updated, cosmic };
    res.json({ success: true, data: nodeWithCosmic, message: '宇宙节点更新成功' });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新宇宙节点失败', message: error.message });
  }
});

router.post('/nodes/:id/reassign-distance', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const params = req.body || {};
    const candidate = await reassignNodeDistance(req.supabase, parseInt(id), {
      rangeMin: params.rangeMin,
      rangeMax: params.rangeMax,
      minDist: params.minDist,
      preferredMin: params.preferredMin,
      preferredMax: params.preferredMax,
      maxRadius: params.maxRadius,
      step: params.step
    });
    if (!candidate) {
      return res.status(404).json({ success: false, error: '节点或星系不存在' });
    }
    res.json({ success: true, data: { id: parseInt(id), position_x: candidate.x, position_y: candidate.y, position_z: candidate.z } });
  } catch (error) {
    res.status(500).json({ success: false, error: '坐标重分配失败', message: error.message });
  }
});

// 获取宇宙统计信息（无需认证）
router.get('/stats', async (req, res) => {
  try {
    const db = new CosmicDatabase(req.supabase);
    const stats = await db.getCosmicStats();
    
    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('获取宇宙统计失败:', error);
    res.status(500).json({
      success: false,
      error: '获取宇宙统计失败',
      message: error.message
    });
  }
});

// 批量获取宇宙节点（无需认证）
router.post('/nodes/batch', async (req, res) => {
  try {
    const { ids, dimension = 'all' } = req.body;
    
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: '节点ID数组不能为空'
      });
    }
    
    const { data: moments, error } = await req.supabase
      .from('moments')
      .select('*')
      .in('id', ids);
    
    if (error) throw error;
    
    const { CosmicCalculator } = require('../lib/cosmic');
    const nodesWithCosmic = moments.map(moment => ({
      ...moment,
      cosmic: CosmicCalculator.calculateCosmicAttributes(moment),
      file_path: (() => {
        try {
          if (moment.file_path) {
            const { data: { publicUrl } } = req.supabase.storage
              .from('chaos-life')
              .getPublicUrl(moment.file_path);
            return publicUrl || null;
          }
        } catch (_) {}
        return null;
      })()
    }));
    
    res.json({
      success: true,
      data: nodesWithCosmic,
      meta: {
        total: nodesWithCosmic.length,
        dimension
      }
    });
  } catch (error) {
    console.error('批量获取宇宙节点失败:', error);
    res.status(500).json({
      success: false,
      error: '批量获取宇宙节点失败',
      message: error.message
    });
  }
});

// 修改星系锚点（需要认证）
router.put('/galaxies/:name/anchor', authenticateToken, async (req, res) => {
  try {
    const { name } = req.params;
    const { position_x, position_y, position_z } = req.body;
    
    // 验证请求参数
    if (position_x == null || position_y == null || position_z == null) {
      return res.status(400).json({
        success: false,
        error: '位置坐标不能为空'
      });
    }
    
    // 获取旧的星系锚点
    const { data: oldGalaxy, error: getError } = await req.supabase
      .from('constellations')
      .select('position_x, position_y, position_z')
      .eq('name', name)
      .single();
    
    if (getError) {
      return res.status(404).json({
        success: false,
        error: '星系不存在'
      });
    }
    
    // 计算偏移量
    const offset = {
      x: position_x - oldGalaxy.position_x,
      y: position_y - oldGalaxy.position_y,
      z: position_z - oldGalaxy.position_z
    };
    
    // 更新星系锚点
    const { error: updateGalaxyError } = await req.supabase
      .from('constellations')
      .update({
        position_x,
        position_y,
        position_z
      })
      .eq('name', name);
    
    if (updateGalaxyError) throw updateGalaxyError;
    
    // 获取该星系下的所有节点
    // 首先获取所有节点，然后在JavaScript中过滤，因为cosmic_constellation是JSON格式
    const { data: allMoments } = await req.supabase
      .from('moments')
      .select('id, cosmic_position_x, cosmic_position_y, cosmic_position_z, cosmic_constellation, ai_tags');
    
    // 过滤出属于该星系的节点
    const nodesToUpdate = (allMoments || []).filter(moment => {
      // 检查cosmic_constellation字段
      try {
        if (moment.cosmic_constellation) {
          const constellation = JSON.parse(moment.cosmic_constellation);
          if (Array.isArray(constellation) && constellation[0] === name) {
            return true;
          }
        }
      } catch (e) {
        // 解析失败，继续检查ai_tags
      }
      
      // 检查ai_tags字段
      try {
        if (moment.ai_tags) {
          const tags = Array.isArray(moment.ai_tags) ? moment.ai_tags : JSON.parse(moment.ai_tags);
          if (Array.isArray(tags) && tags[0] === name) {
            return true;
          }
        }
      } catch (e) {
        // 解析失败，不匹配
      }
      
      return false;
    });
    
    // 更新所有节点的坐标
    if (nodesToUpdate && nodesToUpdate.length > 0) {
      for (const node of nodesToUpdate) {
        if (node.cosmic_position_x != null && node.cosmic_position_y != null && node.cosmic_position_z != null) {
          await req.supabase
            .from('moments')
            .update({
              cosmic_position_x: node.cosmic_position_x + offset.x,
              cosmic_position_y: node.cosmic_position_y + offset.y,
              cosmic_position_z: node.cosmic_position_z + offset.z
            })
            .eq('id', node.id);
        }
      }
    }
    
    // 返回修改后的星系信息和偏移量
    res.json({
      success: true,
      data: {
        galaxy: {
          name,
          position_x,
          position_y,
          position_z
        },
        offset,
        updated_nodes: nodesToUpdate ? nodesToUpdate.length : 0
      },
      message: '星系锚点修改成功，节点坐标已跟随更新'
    });
  } catch (error) {
    console.error('修改星系锚点失败:', error);
    res.status(500).json({
      success: false,
      error: '修改星系锚点失败',
      message: error.message
    });
  }
});

module.exports = router;
