const { createClient } = require('@supabase/supabase-js');

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// 宇宙坐标计算工具
class CosmicCalculator {
  
  // 时间 → 3D空间坐标转换
  static timeToCosmicPosition(moment, observerTime = new Date()) {
    const momentTime = new Date(moment.created_at);
    const timeDiff = momentTime.getTime() - observerTime.getTime();
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    
    // 重要性归一化
    const importance = (moment.ai_importance || 0) / 5;
    
    // 情感强度映射
    const emotionIntensity = this.getEmotionIntensity(moment.ai_emotion);
    
    // 基于内容生成唯一种子（确保每个节点都有独特位置）
    const contentSeed = this.generateContentSeed(moment);
    
    // 时间螺旋坐标 - 增加秒级精度和随机扰动
    const spiralRadius = 50 + contentSeed.spiralOffset * 20; // 不同螺旋半径
    const spiralHeight = 10 + contentSeed.heightOffset * 5;
    
    // 使用完整时间精度（包含秒和毫秒）
    const secondsInDay = momentTime.getHours() * 3600 + momentTime.getMinutes() * 60 + 
                        momentTime.getSeconds() + momentTime.getMilliseconds() / 1000;
    const timeAngle = (secondsInDay / 86400) * Math.PI * 2; // 86400秒 = 24小时
    
    // 添加基于内容的微小扰动，确保即使同时创建的节点也有不同位置
    const microPerturbation = contentSeed.microOffset;
    
    return {
      x: daysDiff * 10 + Math.cos(timeAngle) * spiralRadius + microPerturbation.x,
      y: importance * 100 + emotionIntensity * 30 + Math.sin(daysDiff * 0.1) * 20 + microPerturbation.y,
      z: emotionIntensity * 80 + Math.sin(timeAngle) * spiralHeight + microPerturbation.z
    };
  }
  
  // 计算亮度
  static calculateBrightness(moment) {
    const baseBrightness = (moment.ai_importance || 0) / 5;
    const emotionMultiplier = this.getEmotionIntensity(moment.ai_emotion);
    const timeDecay = Math.exp(-this.getMomentAge(moment) / 365);
    const fileBonus = moment.file_path ? 0.3 : 0;
    
    return Math.min(1, (baseBrightness * 0.4 + emotionMultiplier * 0.4 + fileBonus * 0.2) * timeDecay);
  }
  
  // 计算质量
  static calculateMass(moment) {
    let mass = (moment.ai_importance || 0) * 10;
    mass += moment.text ? moment.text.length * 0.01 : 0;
    mass += moment.file_size ? moment.file_size * 0.000001 : 0; // 文件大小影响
    return Math.max(1, mass);
  }
  
  // 计算引力（简化版，移除了节点间连接计算）
  static calculateGravity(moment) {
    // 仅基于时间接近度的简化计算
    const timeDiff = Math.abs(new Date(moment.created_at).getTime() - new Date().getTime());
    const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
    const baseGravity = 1 + Math.max(0, (30 - daysDiff) / 30 * 0.5);
    
    return baseGravity;
  }
  
  // 情感强度映射
  static getEmotionIntensity(emotion) {
    const intensityMap = {
      'happy': 0.8,
      'sad': 0.9,
      'angry': 1.0,
      'calm': 0.3,
      'shocked': 1.0,
      'love': 0.9,
      'anxious': 0.8,
      'excited': 1.0,
      'numb': 0.2
    };
    return intensityMap[emotion] || 0.5;
  }
  
  // 获取时刻年龄（天数）
  static getMomentAge(moment) {
    const created = new Date(moment.created_at);
    const now = new Date();
    return Math.floor((now - created) / (1000 * 60 * 60 * 24));
  }
  
  // 情感 → 颜色映射
  static getEmotionColor(emotion) {
    const colorMap = {
      'happy': '#FFD700',     // 金色
      'sad': '#4169E1',       // 蓝色
      'angry': '#FF4500',     // 橙红色
      'calm': '#20B2AA',       // 青色
      'shocked': '#FF1493',    // 深粉色
      'love': '#FF69B4',       // 热粉色
      'anxious': '#9370DB',    // 紫色
      'excited': '#FF6347',    // 番茄色
      'numb': '#696969'        // 灰色
    };
    return colorMap[emotion] || '#FFFFFF';
  }
  
  static getGalaxyAnchor(name) {
    const s = String(name || 'unknown');
    const hash = (input, salt) => {
      let h = 0;
      for (let i = 0; i < input.length; i++) {
        h = ((h << 5) - h) + input.charCodeAt(i) + salt;
        h = h & h;
      }
      return Math.abs(h) / 2147483647;
    };
    const nx = hash(s + 'x', 131);
    const ny = hash(s + 'y', 179);
    const nz = hash(s + 'z', 227);
    const sx = 1500;
    const sy = 900;
    const sz = 1500;
    return { x: (nx * 2 - 1) * sx, y: (ny * 2 - 1) * sy, z: (nz * 2 - 1) * sz };
  }

  // 生成满足距离要求的星系锚点
  static async generateValidGalaxyAnchor(name, existingAnchors, minDistance = 1000) {
    let anchor = this.getGalaxyAnchor(name);
    let attempts = 0;
    const maxAttempts = 10;
    
    // 如果没有其他星系，直接返回
    if (!existingAnchors || existingAnchors.length === 0) {
      return anchor;
    }
    
    // 检查距离并调整
    while (attempts < maxAttempts) {
      let isValid = true;
      
      // 检查与所有现有星系的距离
      for (const existingAnchor of existingAnchors) {
        const dx = anchor.x - existingAnchor.x;
        const dy = anchor.y - existingAnchor.y;
        const dz = anchor.z - existingAnchor.z;
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz);
        
        if (distance < minDistance) {
          isValid = false;
          break;
        }
      }
      
      if (isValid) {
        return anchor;
      }
      
      // 如果距离不够，生成新的锚点（添加随机扰动）
      attempts++;
      const perturbedName = `${name}_${attempts}`;
      anchor = this.getGalaxyAnchor(perturbedName);
    }
    
    // 如果多次尝试后仍不满足，强制调整到足够远的位置
    const farthestAnchor = existingAnchors.reduce((farthest, current) => {
      const currentDist = Math.sqrt(
        current.x * current.x + current.y * current.y + current.z * current.z
      );
      const farthestDist = Math.sqrt(
        farthest.x * farthest.x + farthest.y * farthest.y + farthest.z * farthest.z
      );
      return currentDist > farthestDist ? current : farthest;
    });
    
    // 计算方向向量并延伸到足够远的位置
    const dist = Math.sqrt(
      farthestAnchor.x * farthestAnchor.x + 
      farthestAnchor.y * farthestAnchor.y + 
      farthestAnchor.z * farthestAnchor.z
    );
    
    const scale = (dist + minDistance + 50) / dist;
    return {
      x: farthestAnchor.x * scale,
      y: farthestAnchor.y * scale,
      z: farthestAnchor.z * scale
    };
  }
  
  // 基于内容生成唯一种子（确保相同内容有稳定但独特的偏移）
  static generateContentSeed(moment) {
    // 使用文本内容、时间戳、情感等多因素生成种子
    const momentTime = new Date(moment.created_at);
    const timeString = `${momentTime.getTime()}_${momentTime.getMilliseconds()}`;
    const contentString = `${moment.text || ''}_${timeString}_${moment.ai_emotion || 'neutral'}_${moment.ai_importance || 0}`;
    
    // 简单的哈希函数将字符串转换为数值
    let hash = 0;
    for (let i = 0; i < contentString.length; i++) {
      const char = contentString.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // 转换为32位整数
    }
    
    // 确保哈希为正数并归一化到0-1范围
    const normalizedHash = Math.abs(hash) / 2147483647; // 2147483647 是最大32位正整数
    
    // 添加基于毫秒的额外随机性，确保即使内容相同也有不同坐标
    const timeRandom = (momentTime.getMilliseconds() / 1000) * 0.1;
    const finalHash = (normalizedHash + timeRandom) % 1;
    
    return {
      spiralOffset: (finalHash * 2 - 1) * 0.8, // -0.8 到 0.8 的偏移
      heightOffset: (finalHash * 4 % 1 - 0.5) * 0.6, // -0.3 到 0.3 的高度偏移
      microOffset: {
        x: (finalHash * 1000 % 1 - 0.5) * 800, // ±3 的X轴微扰，增加随机性
        y: (finalHash * 2000 % 1 - 0.5) * 800, // ±2 的Y轴微扰，增加随机性  
        z: (finalHash * 3000 % 1 - 0.5) * 800  // ±2.5 的Z轴微扰，增加随机性
      }
    };
  }

  // 计算宇宙属性
  static calculateCosmicAttributes(moment, observerTime = new Date()) {
    // 快速获取标签数组，减少try-catch开销
    let tagsArray = [];
    if (Array.isArray(moment.ai_tags)) {
      tagsArray = moment.ai_tags;
    } else if (typeof moment.ai_tags === 'string') {
      try {
        tagsArray = JSON.parse(moment.ai_tags || '[]');
      } catch (_) {
        tagsArray = [];
      }
    }
    const galaxy = tagsArray.length > 0 ? String(tagsArray[0]) : null;
    let center;
    
    // 简化位置计算
    if (galaxy) {
      // 直接使用星系锚点作为中心，不再查找相关节点
      const anchor = this.getGalaxyAnchor(galaxy);
      center = { x: anchor.x, y: anchor.y, z: anchor.z };
    } else {
      // 简化时间到宇宙位置的转换
      const momentTime = new Date(moment.created_at);
      const timeDiff = momentTime.getTime() - observerTime.getTime();
      const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
      
      // 重要性归一化
      const importance = (moment.ai_importance || 0) / 5;
      
      // 情感强度映射
      const emotionIntensity = this.getEmotionIntensity(moment.ai_emotion);
      
      // 简化位置计算，减少不必要的螺旋坐标计算
      center = {
        x: daysDiff * 10,
        y: importance * 100 + emotionIntensity * 30,
        z: emotionIntensity * 80
      };
    }
    
    // 生成内容种子
    const seed = this.generateContentSeed(moment);
    const micro = seed.microOffset;
    let spread = { x: 0, y: 0, z: 0 };
    
    if (galaxy) {
      // 简化分布计算，减少不必要的三角分布采样
      const scale = 0.5;
      spread = { x: micro.x * scale, y: micro.y * scale, z: micro.z * scale };
      const r = Math.sqrt(spread.x * spread.x + spread.y * spread.y + spread.z * spread.z);
      const minR = 100, maxR = 800;
      
      // 简化半径计算，使用简单的随机分布
      const desiredR = minR + Math.random() * (maxR - minR);
      
      if (r > 0) {
        const k = desiredR / r;
        spread = { x: spread.x * k, y: spread.y * k, z: spread.z * k };
      } else {
        spread = { x: desiredR, y: 0, z: 0 };
      }
    }
    
    // 直接使用中心+分布作为位置，不再检查节点重叠
    const position = { x: center.x + spread.x, y: center.y + spread.y, z: center.z + spread.z };
    
    // 计算基本属性
    const brightness = this.calculateBrightness(moment);
    const mass = this.calculateMass(moment);
    const gravity = this.calculateGravity(moment);
    const color = this.getEmotionColor(moment.ai_emotion);
    const size = Math.max(1, (moment.ai_importance || 0) * 2 + mass * 0.5);
    const opacity = Math.max(0.3, brightness);
    const halo = (moment.ai_importance >= 4) || (moment.ai_emotion === 'love' || moment.ai_emotion === 'shocked');
    
    return {
      position_x: position.x,
      position_y: position.y,
      position_z: position.z,
      brightness,
      mass,
      gravity,
      color,
      size,
      opacity,
      halo,
      constellation: galaxy ? [galaxy] : []
    };
  }
}

// 数据库操作类
class CosmicDatabase {
  
  constructor(supabase) {
    this.supabase = supabase;
  }
  
  // 创建宇宙节点
  async createCosmicNode(momentData) {
    const { data, error } = await this.supabase
      .from('moments')
      .insert([momentData])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }
  
  // 获取宇宙节点（带宇宙属性）
  async getCosmicNodes(options = {}) {
    const {
      limit = 100,
      offset = 0,
      startDate,
      endDate,
      emotion,
      importance,
      dimension = 'all'
    } = options;
    
    // 只选择必要的字段，减少数据传输量
    const selectFields = [
      'id',
      'created_at',
      'text',
      'file_path',
      'ai_summary',
      'ai_tags',
      'ai_emotion',
      'ai_importance',
      'cosmic_position_x',
      'cosmic_position_y',
      'cosmic_position_z',
      'cosmic_brightness',
      'cosmic_mass',
      'cosmic_gravity',
      'cosmic_constellation'
    ];
    
    let query = this.supabase
      .from('moments')
      .select(selectFields.join(','))
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    // 时间过滤
    if (startDate) {
      query = query.gte('created_at', startDate);
    }
    if (endDate) {
      query = query.lte('created_at', endDate);
    }
    
    // 情感过滤
    if (emotion) {
      query = query.eq('ai_emotion', emotion);
    }
    
    // 重要性过滤
    if (importance !== undefined) {
      query = query.eq('ai_importance', importance);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    
    // 检查是否已有宇宙坐标数据，如果有则直接使用，没有则重新计算
    const nodesWithCosmic = data.map(moment => {
      if (moment.cosmic_position_x !== null && moment.cosmic_position_y !== null && moment.cosmic_position_z !== null) {
        // 数据库中已有坐标，直接使用
        return {
          id: moment.id,
          created_at: moment.created_at,
          text: moment.text,
          file_path: moment.file_path,
          ai_summary: moment.ai_summary,
          ai_tags: moment.ai_tags,
          ai_emotion: moment.ai_emotion,
          ai_importance: moment.ai_importance,
          cosmic: {
            position_x: moment.cosmic_position_x,
            position_y: moment.cosmic_position_y,
            position_z: moment.cosmic_position_z,
            brightness: moment.cosmic_brightness,
            mass: moment.cosmic_mass,
            gravity: moment.cosmic_gravity,
            color: CosmicCalculator.getEmotionColor(moment.ai_emotion),
            size: Math.max(1, (moment.ai_importance || 0) * 2 + (moment.cosmic_mass || 0) * 0.5),
            opacity: Math.max(0.3, moment.cosmic_brightness || 0),
            halo: (moment.ai_importance >= 4) || (moment.ai_emotion === 'love' || moment.ai_emotion === 'shocked'),
            constellation: moment.cosmic_constellation ? JSON.parse(moment.cosmic_constellation) : []
          }
        };
      } else {
        // 数据库中没有坐标，重新计算
        return {
          id: moment.id,
          created_at: moment.created_at,
          text: moment.text,
          file_path: moment.file_path,
          ai_summary: moment.ai_summary,
          ai_tags: moment.ai_tags,
          ai_emotion: moment.ai_emotion,
          ai_importance: moment.ai_importance,
          cosmic: CosmicCalculator.calculateCosmicAttributes(moment)
        };
      }
    });
    
    return nodesWithCosmic;
  }
  
  // 搜索宇宙节点
  async searchCosmicNodes(query) {
    const { data, error } = await this.supabase
      .from('moments_fts')
      .select('id')
      .textSearch('text', query)
      .limit(50);
    
    if (error) throw error;
    
    if (data.length === 0) return [];
    
    // 只选择必要的字段，减少数据传输量
    const selectFields = [
      'id',
      'created_at',
      'text',
      'file_path',
      'ai_summary',
      'ai_tags',
      'ai_emotion',
      'ai_importance',
      'cosmic_position_x',
      'cosmic_position_y',
      'cosmic_position_z',
      'cosmic_brightness',
      'cosmic_mass',
      'cosmic_gravity',
      'cosmic_constellation'
    ];
    
    // 获取完整数据
    const ids = data.map(item => item.id);
    const { data: moments, error: momentsError } = await this.supabase
      .from('moments')
      .select(selectFields.join(','))
      .in('id', ids);
    
    if (momentsError) throw momentsError;
    
    return moments.map(moment => ({
      id: moment.id,
      created_at: moment.created_at,
      text: moment.text,
      file_path: moment.file_path,
      ai_summary: moment.ai_summary,
      ai_tags: moment.ai_tags,
      ai_emotion: moment.ai_emotion,
      ai_importance: moment.ai_importance,
      cosmic: moment.cosmic_position_x !== null && moment.cosmic_position_y !== null && moment.cosmic_position_z !== null ? {
        position_x: moment.cosmic_position_x,
        position_y: moment.cosmic_position_y,
        position_z: moment.cosmic_position_z,
        brightness: moment.cosmic_brightness,
        mass: moment.cosmic_mass,
        gravity: moment.cosmic_gravity,
        color: CosmicCalculator.getEmotionColor(moment.ai_emotion),
        size: Math.max(1, (moment.ai_importance || 0) * 2 + (moment.cosmic_mass || 0) * 0.5),
        opacity: Math.max(0.3, moment.cosmic_brightness || 0),
        halo: (moment.ai_importance >= 4) || (moment.ai_emotion === 'love' || moment.ai_emotion === 'shocked'),
        constellation: moment.cosmic_constellation ? JSON.parse(moment.cosmic_constellation) : []
      } : CosmicCalculator.calculateCosmicAttributes(moment)
    }));
  }
  
  // 获取宇宙统计
  async getCosmicStats() {
    const { data: totalData, error: totalError, count: totalCount } = await this.supabase
      .from('moments')
      .select('id', { count: 'exact' })
      .limit(1);
    
    if (totalError) throw totalError;
    
    const { data: emotionRows, error: emotionError } = await this.supabase
      .from('moments')
      .select('ai_emotion')
      .not('ai_emotion', 'is', null);
    
    if (emotionError) throw emotionError;
    
    const { data: recentData, error: recentError } = await this.supabase
      .from('moments')
      .select('*')
      .gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false });
    
    if (recentError) throw recentError;
    
    const emotionCounts = (emotionRows || []).reduce((acc, item) => {
      const key = item.ai_emotion || 'unknown';
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});
    
    const topEmotion = Object.entries(emotionCounts)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'calm';
    const totalMoments = (typeof totalCount === 'number' ? totalCount : (Array.isArray(totalData) ? totalData.length : 0)) || 0;
    const { data: massRows } = await this.supabase
      .from('moments')
      .select('cosmic_mass')
      .not('cosmic_mass', 'is', null);
    const sumStoredMass = (massRows || []).reduce((acc, r) => acc + (typeof r.cosmic_mass === 'number' ? r.cosmic_mass : 0), 0);
    const { data: missingMassRows } = await this.supabase
      .from('moments')
      .select('ai_importance, text, file_size')
      .is('cosmic_mass', null);
    const sumComputedMass = (missingMassRows || []).reduce((acc, m) => acc + CosmicCalculator.calculateMass(m), 0);
    const totalMass = sumStoredMass + sumComputedMass;
    
    return {
      total_moments: totalMoments,
      today_moments: recentData.length,
      emotion_distribution: emotionCounts,
      top_emotion: topEmotion,
      cosmic_density: totalMoments / 365,
      total_mass: totalMass
    };
  }
}

module.exports = { CosmicCalculator, CosmicDatabase };
