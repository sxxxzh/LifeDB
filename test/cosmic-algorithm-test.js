const { CosmicCalculator } = require('../lib/cosmic');

console.log('🧪 宇宙坐标算法深度测试');
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
  const cosmic = CosmicCalculator.calculateCosmicAttributes(moment, testMoments);
  return {
    id: moment.id,
    position: cosmic.position,
    ...cosmic
  };
});

// 显示坐标结果
cosmicResults.forEach(result => {
  console.log(`\n节点${result.id}坐标:`);
  console.log(`  X: ${result.position_x.toFixed(4)}`);
  console.log(`  Y: ${result.position_y.toFixed(4)}`);
  console.log(`  Z: ${result.position_z.toFixed(4)}`);
});

// 检查坐标重复
console.log('\n🔍 坐标重复检查:');
const positions = cosmicResults.map(r => ({
  id: r.id,
  x: r.position_x,
  y: r.position_y,
  z: r.position_z
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
    
    if (distance < 0.1) { // 如果距离小于0.1认为重复
      console.log(`⚠️  警告: 节点${pos1.id}和节点${pos2.id}坐标过于接近 (距离: ${distance.toFixed(6)})`);
      hasDuplicates = true;
    } else {
      console.log(`✅ 节点${pos1.id}和节点${pos2.id}距离: ${distance.toFixed(4)}`);
    }
  }
}

if (!hasDuplicates) {
  console.log('🎉 所有节点坐标都是唯一的！');
}

// 测试内容种子生成
console.log('\n🌱 内容种子测试:');
testMoments.forEach(moment => {
  const seed = CosmicCalculator.generateContentSeed(moment);
  console.log(`\n节点${moment.id}种子:`);
  console.log(`  螺旋偏移: ${seed.spiralOffset.toFixed(6)}`);
  console.log(`  高度偏移: ${seed.heightOffset.toFixed(6)}`);
  console.log(`  微扰X: ${seed.microOffset.x.toFixed(6)}`);
  console.log(`  微扰Y: ${seed.microOffset.y.toFixed(6)}`);
  console.log(`  微扰Z: ${seed.microOffset.z.toFixed(6)}`);
});

console.log('\n✅ 测试完成！');