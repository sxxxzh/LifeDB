const express = require('express');
const crypto = require('crypto');
const { authenticateToken } = require('../lib/auth');
const { SiliconFlowAIService } = require('../lib/ai-service');

const router = express.Router();

// 上传带文件的宇宙节点（需要认证）
router.post('/moment', authenticateToken, async (req, res) => {
  try {
    // 使用 multer 中间件处理文件上传
    req.upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: '文件上传失败',
          message: err.message
        });
      }
      try {
      
      const { text, ai_emotion, ai_importance, ai_tags, use_ai = true, year, month, day, ai_prompt, ai_prompt_emotion, ai_prompt_importance, ai_prompt_tags, ai_prompt_summary, ai_prompt_galaxy } = req.body;
      const file = req.file;
      
      let filePath = null;
      let fileUrl = null;
      let fileHash = null;
      let isDuplicateHash = false;
      
      // 如果有文件，上传到 Supabase 存储
      if (file) {
        if (!/^image\//i.test(file.mimetype)) {
          return res.status(400).json({ success: false, error: '仅支持图片上传', message: `当前类型: ${file.mimetype}` });
        }
        try {
          fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');
          const { data: existingByHash } = await req.supabase
            .from('moments')
            .select('file_path')
            .eq('hash', fileHash)
            .single();
          if (existingByHash && existingByHash.file_path) {
            filePath = existingByHash.file_path;
            isDuplicateHash = true;
          } else {
            const timestamp = Date.now();
            const fileExtension = file.originalname.split('.').pop();
            filePath = `moments/${timestamp}-${fileHash}.${fileExtension}`;
            const { error } = await req.supabase.storage
              .from('chaos-life')
              .upload(filePath, file.buffer, {
                contentType: file.mimetype,
                cacheControl: '3600',
                upsert: false
              });
            if (error) throw error;
          }
          const { data: { publicUrl } } = req.supabase.storage
            .from('chaos-life')
            .getPublicUrl(filePath);
          fileUrl = publicUrl;
        } catch (storageError) {
          console.error('Supabase 存储上传失败:', storageError);
          return res.status(500).json({
            success: false,
            error: '文件存储失败',
            message: storageError.message
          });
        }
      }
      
        const aiService = new SiliconFlowAIService();
        let aiData = {};
        let galaxyDecision = null;
        const textContent = text ? text.trim() : '';
        const parseBool = (v) => {
          if (typeof v === 'boolean') return v;
          if (typeof v === 'string') return v.toLowerCase() === 'true';
          return !!v;
        };
        const ai_decide_galaxy = parseBool(req.body?.ai_decide_galaxy);
        const useAIFlag = parseBool(req.body?.use_ai);
      

      
        if (useAIFlag && textContent && (ai_decide_galaxy || (!ai_emotion || !ai_importance || !ai_tags || ai_tags.length === 0))) {
        const aiResult = await aiService.analyzeText(textContent, {
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
          const aiTagsRaw = Array.isArray(ai_tags)
            ? ai_tags
            : (req.body['ai_tags[]']
                ? (Array.isArray(req.body['ai_tags[]']) ? req.body['ai_tags[]'] : [req.body['ai_tags[]']])
                : []);
          aiTagsRaw.forEach(t => { const s = String(t); if (s && !fullTags.includes(s)) fullTags.push(s); });
        
        // 只有当ai_decide_galaxy为true时才调用decideGalaxy函数来决定星系
        if (ai_decide_galaxy) {
          galaxyDecision = await aiService.decideGalaxy(textContent, candidates, ai_prompt_galaxy || ai_prompt);
        } else {
          // 当ai_decide_galaxy为false时，直接使用用户传入的第一个标签作为星系
          if (Array.isArray(ai_tags) && ai_tags.length > 0) {
            galaxyDecision = { name: String(ai_tags[0]), is_new: false };
          } else if (fullTags.length > 0) {
            galaxyDecision = { name: fullTags[0], is_new: false };
          } else {
            // 如果没有提供标签，则使用默认星系
            galaxyDecision = { name: '文件', is_new: false };
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
      } else {
        const providedTagsRaw = Array.isArray(ai_tags)
          ? ai_tags
          : (req.body['ai_tags[]']
              ? (Array.isArray(req.body['ai_tags[]']) ? req.body['ai_tags[]'] : [req.body['ai_tags[]']])
              : []);
        const providedTags = providedTagsRaw.map(t => String(t)).filter(Boolean);
        
        // 当ai_decide_galaxy为false时，直接使用用户传入的第一个标签作为星系
        if (providedTags.length > 0) {
          galaxyDecision = { name: providedTags[0], is_new: false };
        } else {
          // 如果没有提供标签，则使用默认星系
          galaxyDecision = { name: '文件', is_new: false };
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
          ai_tags: normalized.length > 0 ? normalized : ['文件'],
          ai_summary: textContent ? (textContent.length > 50 ? textContent.substring(0, 50) + '...' : textContent) : ''
        };
      }

      // 统一将选定的星系标签写入 constellations（仅当ai_decide_galaxy为true时）
      if (galaxyDecision && galaxyDecision.name && ai_decide_galaxy) {
        const { CosmicCalculator } = require('../lib/cosmic');
        const anchor = CosmicCalculator.getGalaxyAnchor(galaxyDecision.name);
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
      
      // 创建宇宙节点数据
      const now = new Date();
      const y = parseInt(year) || now.getFullYear();
      const m = parseInt(month) || (now.getMonth() + 1);
      const d = parseInt(day) || now.getDate();
      const createdAt = new Date(y, m - 1, d, now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds()).toISOString();
      const momentData = {
        text: textContent,
        file_path: filePath,
        file_name: file ? file.originalname : null,
        file_type: file ? file.mimetype : null,
        file_size: file ? file.size : null,
        hash: isDuplicateHash ? null : fileHash,
        ...aiData,
        created_at: createdAt
      };
      
      // 插入数据库
      const { data: newMoment, error: dbError } = await req.supabase
        .from('moments')
        .insert([momentData])
        .select()
        .single();
      
      if (dbError) {
        if (dbError.code === '23505' && fileHash) {
          const { data: existingMoment, error: getExistingErr } = await req.supabase
            .from('moments')
            .select('*')
            .eq('hash', fileHash)
            .single();
          if (!getExistingErr && existingMoment) {
            const { CosmicCalculator } = require('../lib/cosmic');
            let nodeWithCosmicExisting = {
              ...existingMoment,
              cosmic: CosmicCalculator.calculateCosmicAttributes(existingMoment)
            };
            if (fileUrl) {
              nodeWithCosmicExisting.file_path = fileUrl;
            }
            return res.status(200).json({ success: true, data: nodeWithCosmicExisting, message: '已存在相同文件，返回现有节点' });
          }
        }
        console.error('数据库插入失败:', dbError);
        return res.status(500).json({ success: false, error: '数据库写入失败', message: dbError.message || String(dbError) });
      }
      
      // 计算宇宙属性
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
      let nodeWithCosmic = {
        ...newMoment,
        cosmic: CosmicCalculator.calculateCosmicAttributes(newMoment, relatedMoments)
      };
      if (filePath) {
        nodeWithCosmic.file_path = filePath;
      }
      // 使用数据库真实锚点进行定位，并保证与同星系节点的最小距离
      try {
        if (galaxyName) {
          const { data: centerRow } = await req.supabase
            .from('constellations')
            .select('position_x, position_y, position_z')
            .eq('name', galaxyName)
            .single();
          if (centerRow && centerRow.position_x != null && centerRow.position_y != null && centerRow.position_z != null) {
            const seed = CosmicCalculator.generateContentSeed(newMoment);
            let dir = { x: seed.microOffset.x, y: seed.microOffset.y, z: seed.microOffset.z };
            const norm = Math.sqrt(dir.x*dir.x + dir.y*dir.y + dir.z*dir.z) || 1;
            dir.x /= norm; dir.y /= norm; dir.z /= norm;
            const minDist = 120;
            const maxRadius = 800;
            const baseImp = (newMoment.ai_importance != null ? parseInt(newMoment.ai_importance) : 2);
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
            nodeWithCosmic.cosmic.position_x = candidate.x;
            nodeWithCosmic.cosmic.position_y = candidate.y;
            nodeWithCosmic.cosmic.position_z = candidate.z;
          }
        }
      } catch (_) {}
      // 若为新星系（没有关联节点），尝试使用 constellations 表的坐标作为中心
      try {
        if (galaxyName && relatedMoments.length === 0) {
          const { data: row } = await req.supabase
            .from('constellations')
            .select('position_x, position_y, position_z')
            .eq('name', galaxyName)
            .single();
          if (row && row.position_x != null && row.position_y != null && row.position_z != null) {
            nodeWithCosmic.cosmic.position_x = row.position_x;
            nodeWithCosmic.cosmic.position_y = row.position_y;
            nodeWithCosmic.cosmic.position_z = row.position_z;
          }
          
        }
      } catch (_) {}
      // 如果星系在表中已存在（用户选择已有星系），即便无关联节点也施加微扰避免与中心完全重合
      if (galaxyExistedBefore && galaxyName && relatedMoments.length === 0) {
        const seed = CosmicCalculator.generateContentSeed(newMoment);
        let sx = seed.microOffset.x * 0.5;
        let sy = seed.microOffset.y * 0.5;
        let sz = seed.microOffset.z * 0.5;
        const maxR = 400;
        const r = Math.sqrt(sx*sx + sy*sy + sz*sz);
        if (r > maxR && r > 0) { const kk = maxR / r; sx *= kk; sy *= kk; sz *= kk; }
        nodeWithCosmic.cosmic.position_x += sx;
        nodeWithCosmic.cosmic.position_y += sy;
        nodeWithCosmic.cosmic.position_z += sz;
      }
      // 更新数据库中的宇宙属性与所属星系（cosmic_constellation）
      try {
        const c = nodeWithCosmic.cosmic;
        await req.supabase
          .from('moments')
          .update({
            cosmic_position_x: c.position_x,
            cosmic_position_y: c.position_y,
            cosmic_position_z: c.position_z,
            cosmic_brightness: c.brightness,
            cosmic_mass: c.mass,
            cosmic_gravity: c.gravity,
            cosmic_constellation: JSON.stringify(c.constellation || [])
          })
          .eq('id', newMoment.id);
      } catch (e) {
        console.error('更新宇宙属性失败:', e);
      }
      
      res.status(201).json({
        success: true,
        data: nodeWithCosmic,
        message: '宇宙节点创建成功'
      });
      } catch (e) {
        console.error('上传处理失败:', e);
        return res.status(500).json({ success: false, error: '上传处理失败', message: e.message || String(e) });
      }
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

// 批量文件上传（需要认证）
router.post('/batch', authenticateToken, async (req, res) => {
  try {
    req.upload.array('files', 10)(req, res, async (err) => {
      if (err) {
        return res.status(400).json({
          success: false,
          error: '批量上传失败',
          message: err.message
        });
      }
      
      const files = req.files || [];
      const results = [];
      
      for (const file of files) {
        if (!/^image\//i.test(file.mimetype)) {
          results.push({ success: false, filename: file.originalname, error: '仅支持图片上传' });
          continue;
        }
        try {
          const fileHash = crypto.createHash('md5').update(file.buffer).digest('hex');
          const timestamp = Date.now();
          const fileExtension = file.originalname.split('.').pop();
          const filePath = `moments/batch/${timestamp}-${fileHash}.${fileExtension}`;
          
          // 上传到 Supabase
          const { data, error } = await req.supabase.storage
            .from('chaos-life')
            .upload(filePath, file.buffer, {
              contentType: file.mimetype,
              cacheControl: '3600',
              upsert: false
            });
          
          if (error) {
            results.push({
              success: false,
              filename: file.originalname,
              error: error.message
            });
            continue;
          }
          
          // 获取公共URL
          const { data: { publicUrl } } = req.supabase.storage
            .from('chaos-life')
            .getPublicUrl(filePath);
          
          results.push({
            success: true,
            filename: file.originalname,
            file_path: filePath,
            file_url: publicUrl,
            file_size: file.size,
            file_type: file.mimetype
          });
        } catch (fileError) {
          results.push({
            success: false,
            filename: file.originalname,
            error: fileError.message
          });
        }
      }
      
      res.json({
        success: true,
        data: results,
        summary: {
          total: files.length,
          successful: results.filter(r => r.success).length,
          failed: results.filter(r => !r.success).length
        }
      });
    });
  } catch (error) {
    console.error('批量上传失败:', error);
    res.status(500).json({
      success: false,
      error: '批量上传失败',
      message: error.message
    });
  }
});

// 删除文件（需要认证）
router.delete('/file/:filePath(*)', authenticateToken, async (req, res) => {
  try {
    const { filePath } = req.params;
    
    // 从 Supabase 存储删除文件
    const { data, error } = await req.supabase.storage
      .from('chaos-life')
      .remove([filePath]);
    
    if (error) throw error;
    
    // 更新数据库中相关记录的 file_path
    const { error: updateError } = await req.supabase
      .from('moments')
      .update({ 
        file_path: null,
        file_name: null,
        file_type: null,
        file_size: null
      })
      .eq('file_path', filePath);
    
    if (updateError) {
      console.error('更新数据库记录失败:', updateError);
    }
    
    res.json({
      success: true,
      message: '文件删除成功'
    });
  } catch (error) {
    console.error('删除文件失败:', error);
    res.status(500).json({
      success: false,
      error: '删除文件失败',
      message: error.message
    });
  }
});

// 获取文件信息（无需认证）
router.get('/file/:filePath(*)', async (req, res) => {
  try {
    const { filePath } = req.params;
    
    // 获取文件信息
    const { data: files, error } = await req.supabase.storage
      .from('chaos-life')
      .list(filePath.substring(0, filePath.lastIndexOf('/')), {
        search: filePath.split('/').pop()
      });
    
    if (error) throw error;
    
    if (!files || files.length === 0) {
      return res.status(404).json({
        success: false,
        error: '文件不存在'
      });
    }
    
    const file = files[0];
    const { data: { publicUrl } } = req.supabase.storage
      .from('chaos-life')
      .getPublicUrl(filePath);
    
    res.json({
      success: true,
      data: {
        name: file.name,
        size: file.metadata?.size || 0,
        content_type: file.metadata?.mimetype || 'application/octet-stream',
        created_at: file.created_at,
        public_url: publicUrl
      }
    });
  } catch (error) {
    console.error('获取文件信息失败:', error);
    res.status(500).json({
      success: false,
      error: '获取文件信息失败',
      message: error.message
    });
  }
});

module.exports = router;
