// 独立的宇宙坐标算法测试，不依赖外部库

// 宇宙坐标计算工具（独立版本）
class CosmicCalculatorStandalone {
  
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
        x: (finalHash * 1000 % 1 - 0.5) * 6, // ±3 的X轴微扰，增加随机性
        y: (finalHash * 2000 % 1 - 0.5) * 4, // ±2 的Y轴微扰，增加随机性  
        z: (finalHash * 3000 % 1 - 0.5) * 5  // ±2.5 的Z轴微扰，增加随机性
      }
    };
  }

  // 计算宇宙属性
  static calculateCosmicAttributes(moment, allMoments = [], observerTime = new Date()) {
    const position = this.timeToCosmicPosition(moment, observerTime);
    
    return {
      position_x: position.x,
      position_y: position.y,
      position_z: position.z
    };
  }
}

console.log('🧪 宇宙坐标算法深度测试（独立版）');
console.log('=====================================');

// 模拟多个节点数据，创建时间相差毫秒
const testMoments = [
  {
    id: 1,
    text: '测试节点1',
    created_at: '2025-01-01T10:00:00.001Z',
    ai_emotion: 'happy',
    ai_importance: 3
  },
  {
    id: 2,
    text: '测试节点2',
    created_at: '2025-01-01T10:00:00.002Z',
    ai_emotion: 'sad',
    ai_importance: 4
  },
  {
    id: 3,
    text: '测试节点3',
    created_at: '2025-01-01T10:00:00.003Z',
    ai_emotion: 'excited',
    ai_importance: 5
  },
  {
    id: 4,
    text: '测试节点4',
    created_at: '2025-01-01T10:00:00.004Z',
    ai_emotion: 'calm',
    ai_importance: 2
  }
];

console.log('\n📊 测试节点信息:');
testMoments.forEach(moment => {
  console.log(`节点${moment.id}: ${moment.text} | ${moment.created_at} | ${moment.ai_emotion}`);
});

console.log('\n🔍 计算宇宙坐标:');

// 计算每个节点的宇宙属性
const cosmicResults = testMoments.map(moment => {
  const cosmic = CosmicCalculatorStandalone.calculateCosmicAttributes(moment, testMoments);
  return {
    id: moment.id,
    position: cosmic
  };
});

// 显示坐标结果
cosmicResults.forEach(result => {
  console.log(`\n节点${result.id}坐标:`);
  console.log(`  X: ${result.position.position_x.toFixed(6)}`);
  console.log(`  Y: ${result.position.position_y.toFixed(6)}`);
  console.log(`  Z: ${result.position.position_z.toFixed(6)}`);
});

// 检查坐标重复
console.log('\n🔍 坐标重复检查:');
const positions = cosmicResults.map(r => ({
  id: r.id,
  x: r.position.position_x,
  y: r.position.position_y,
  z: r.position.position_z
}));

let hasDuplicates = false;
for (let i = 0; i < positions.length; i++) {
  for (let j = i + 1; j < positions.length; j++) {
    const pos1 = positions[i];
    const pos2 = positions[j];
    
    const distance = Math.sqrt(
      Math.pow(pos1.x - pos2.x, 2) + 
      Math.pow(pos1.y - pos2.y, 2) + 
      Math.pow(pos1.z - pos2.z, 2)
    );
    
    if (distance < 0.01) { // 如果距离小于0.01认为重复
      console.log(`⚠️  警告: 节点${pos1.id}和节点${pos2.id}坐标过于接近 (距离: ${distance.toFixed(8)})`);
      hasDuplicates = true;
    } else {
      console.log(`✅ 节点${pos1.id}和节点${pos2.id}距离: ${distance.toFixed(6)}`);
    }
  }
}

if (!hasDuplicates) {
  console.log('🎉 所有节点坐标都是唯一的！');
}

// 测试内容种子生成
console.log('\n🌱 内容种子测试:');
testMoments.forEach(moment => {
  const seed = CosmicCalculatorStandalone.generateContentSeed(moment);
  console.log(`\n节点${moment.id}种子:`);
  console.log(`  螺旋偏移: ${seed.spiralOffset.toFixed(6)}`);
  console.log(`  高度偏移: ${seed.heightOffset.toFixed(6)}`);
  console.log(`  微扰X: ${seed.microOffset.x.toFixed(6)}`);
  console.log(`  微扰Y: ${seed.microOffset.y.toFixed(6)}`);
  console.log(`  微扰Z: ${seed.microOffset.z.toFixed(6)}`);
});

console.log('\n✅ 测试完成！');