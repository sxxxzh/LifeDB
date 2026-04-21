/**
 * 坐标唯一性测试脚本
 * 用于验证后端坐标生成算法是否正确工作
 */

const API_BASE_URL = 'https://lifeapi.szhaovo.cn';

// 模拟不同的节点数据
const testNodes = [
    {
        text: "今天心情不错",
        ai_emotion: "happy",
        ai_importance: 3,
        ai_tags: ["生活", "日常"]
    },
    {
        text: "工作压力很大", 
        ai_emotion: "anxious",
        ai_importance: 4,
        ai_tags: ["工作", "压力"]
    },
    {
        text: "和朋友们聚餐",
        ai_emotion: "happy", 
        ai_importance: 2,
        ai_tags: ["社交", "朋友"]
    },
    {
        text: "今天天气很好",
        ai_emotion: "calm",
        ai_importance: 3,
        ai_tags: ["天气", "自然"]
    },
    {
        text: "学习新技能",
        ai_emotion: "excited",
        ai_importance: 5,
        ai_tags: ["学习", "成长"]
    }
];

// 测试坐标生成
async function testCoordinateGeneration() {
    console.log('🧪 开始坐标生成测试...\n');
    
    const coordinates = [];
    const timestamp = new Date().toISOString();
    
    for (let i = 0; i < testNodes.length; i++) {
        const node = testNodes[i];
        
        // 添加时间戳确保每个节点的时间略有不同
        const testNode = {
            ...node,
            created_at: new Date(Date.now() + i * 1000).toISOString() // 每个节点间隔1秒
        };
        
        try {
            console.log(`正在测试节点 ${i + 1}: "${node.text}"`);
            
            // 直接调用后端API创建节点
            const response = await fetch(`${API_BASE_URL}/api/cosmic/nodes`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': 'Bearer YOUR_TOKEN_HERE' // 需要替换为实际token
                },
                body: JSON.stringify(testNode)
            });
            
            if (!response.ok) {
                console.error(`❌ 节点 ${i + 1} 创建失败:`, response.status);
                continue;
            }
            
            const result = await response.json();
            const nodeData = result.data || result;
            
            // 提取坐标信息
            const coordinate = {
                id: nodeData.id,
                text: nodeData.text,
                emotion: nodeData.ai_emotion,
                importance: nodeData.ai_importance,
                position: {
                    x: nodeData.cosmic_position_x ?? nodeData.cosmic?.position_x ?? 0,
                    y: nodeData.cosmic_position_y ?? nodeData.cosmic?.position_y ?? 0,
                    z: nodeData.cosmic_position_z ?? nodeData.cosmic?.position_z ?? 0
                },
                brightness: nodeData.cosmic_brightness ?? nodeData.cosmic?.brightness ?? 0,
                mass: nodeData.cosmic_mass ?? nodeData.cosmic?.mass ?? 0,
                gravity: nodeData.cosmic_gravity ?? nodeData.cosmic?.gravity ?? 0
            };
            
            coordinates.push(coordinate);
            console.log(`✅ 坐标生成成功:`, coordinate.position);
            
        } catch (error) {
            console.error(`❌ 节点 ${i + 1} 测试失败:`, error.message);
        }
    }
    
    // 分析坐标重复情况
    analyzeCoordinates(coordinates);
}

// 分析坐标唯一性
function analyzeCoordinates(coordinates) {
    console.log('\n📊 坐标分析结果:');
    console.log(`总共生成坐标数量: ${coordinates.length}`);
    
    if (coordinates.length === 0) {
        console.log('⚠️  没有成功生成任何坐标');
        return;
    }
    
    // 检查完全重复的坐标
    const positionMap = new Map();
    const duplicates = [];
    
    coordinates.forEach(coord => {
        const positionKey = `${coord.position.x.toFixed(3)},${coord.position.y.toFixed(3)},${coord.position.z.toFixed(3)}`;
        
        if (positionMap.has(positionKey)) {
            duplicates.push({
                original: positionMap.get(positionKey),
                duplicate: coord
            });
        } else {
            positionMap.set(positionKey, coord);
        }
    });
    
    console.log(`\n🔍 重复坐标检测结果:`);
    console.log(`唯一坐标数量: ${positionMap.size}`);
    console.log(`重复坐标组数: ${duplicates.length}`);
    
    if (duplicates.length > 0) {
        console.log(`\n❌ 发现坐标重复:`);
        duplicates.forEach((dup, index) => {
            console.log(`重复组 ${index + 1}:`);
            console.log(`  原始节点: "${dup.original.text}" (ID: ${dup.original.id})`);
            console.log(`  重复节点: "${dup.duplicate.text}" (ID: ${dup.duplicate.id})`);
            console.log(`  重复坐标: (${dup.original.position.x.toFixed(1)}, ${dup.original.position.y.toFixed(1)}, ${dup.original.position.z.toFixed(1)})`);
        });
    } else {
        console.log(`✅ 所有坐标都是唯一的！`);
    }
    
    // 显示坐标分布统计
    showCoordinateStats(coordinates);
}

// 显示坐标统计信息
function showCoordinateStats(coordinates) {
    console.log('\n📈 坐标分布统计:');
    
    const xs = coordinates.map(c => c.position.x);
    const ys = coordinates.map(c => c.position.y);
    const zs = coordinates.map(c => c.position.z);
    
    const stats = {
        x: { min: Math.min(...xs), max: Math.max(...xs), avg: xs.reduce((a, b) => a + b, 0) / xs.length },
        y: { min: Math.min(...ys), max: Math.max(...ys), avg: ys.reduce((a, b) => a + b, 0) / ys.length },
        z: { min: Math.min(...zs), max: Math.max(...zs), avg: zs.reduce((a, b) => a + b, 0) / zs.length }
    };
    
    console.log(`X轴范围: ${stats.x.min.toFixed(1)} ~ ${stats.x.max.toFixed(1)} (平均: ${stats.x.avg.toFixed(1)})`);
    console.log(`Y轴范围: ${stats.y.min.toFixed(1)} ~ ${stats.y.max.toFixed(1)} (平均: ${stats.y.avg.toFixed(1)})`);
    console.log(`Z轴范围: ${stats.z.min.toFixed(1)} ~ ${stats.z.max.toFixed(1)} (平均: ${stats.z.avg.toFixed(1)})`);
    
    // 显示其他宇宙属性
    console.log('\n🌟 宇宙属性统计:');
    const brightness = coordinates.map(c => c.brightness);
    const mass = coordinates.map(c => c.mass);
    const gravity = coordinates.map(c => c.gravity);
    
    console.log(`平均亮度: ${(brightness.reduce((a, b) => a + b, 0) / brightness.length * 100).toFixed(1)}%`);
    console.log(`平均质量: ${(mass.reduce((a, b) => a + b, 0) / mass.length).toFixed(1)}`);
    console.log(`平均引力: ${(gravity.reduce((a, b) => a + b, 0) / gravity.length).toFixed(1)}`);
}

// 测试后端算法直接计算
function testBackendAlgorithm() {
    console.log('\n🔧 测试后端坐标算法直接计算:');
    
    // 模拟后端算法
    const testMoments = [
        { text: "测试1", ai_emotion: "happy", ai_importance: 3, created_at: "2025-01-01T10:00:00.001Z" },
        { text: "测试2", ai_emotion: "happy", ai_importance: 3, created_at: "2025-01-01T10:00:00.002Z" },
        { text: "测试3", ai_emotion: "happy", ai_importance: 3, created_at: "2025-01-01T10:00:00.003Z" }
    ];
    
    testMoments.forEach((moment, index) => {
        console.log(`\n测试时刻 ${index + 1}: ${moment.text}`);
        console.log(`时间戳: ${moment.created_at}`);
        
        // 这里应该调用后端的CosmicCalculator算法
        // 由于无法直接访问后端代码，我们模拟关键计算步骤
        const momentTime = new Date(moment.created_at);
        const timeDiff = momentTime.getTime() - new Date().getTime();
        const daysDiff = timeDiff / (1000 * 60 * 60 * 24);
        
        // 使用毫秒级精度
        const secondsInDay = momentTime.getHours() * 3600 + momentTime.getMinutes() * 60 + 
                           momentTime.getSeconds() + momentTime.getMilliseconds() / 1000;
        const timeAngle = (secondsInDay / 86400) * Math.PI * 2;
        
        console.log(`时间角度 (秒级精度): ${timeAngle.toFixed(6)} 弧度`);
        console.log(`天数差: ${daysDiff.toFixed(3)}`);
        
        // 如果角度相同，说明算法有问题
        if (index > 0) {
            const prevMoment = testMoments[index - 1];
            const prevTime = new Date(prevMoment.created_at);
            const prevSeconds = prevTime.getHours() * 3600 + prevTime.getMinutes() * 60 + 
                               prevTime.getSeconds() + prevTime.getMilliseconds() / 1000;
            const prevAngle = (prevSeconds / 86400) * Math.PI * 2;
            
            if (Math.abs(timeAngle - prevAngle) < 0.0001) {
                console.log(`⚠️  警告: 角度几乎相同！这可能是坐标重复的原因`);
            } else {
                console.log(`✅ 角度差异: ${(timeAngle - prevAngle).toFixed(6)} 弧度`);
            }
        }
    });
}

// 运行测试
console.log('🚀 混沌人生宇宙坐标测试工具');
console.log('=====================================');
console.log(`API地址: ${API_BASE_URL}`);
console.log('注意: 需要先在admin.html中获取有效的访问令牌');
console.log('然后替换代码中的 YOUR_TOKEN_HERE');
console.log('=====================================\n');

// 测试后端算法
testBackendAlgorithm();

console.log('\n💡 建议:');
console.log('1. 检查admin.html中创建节点的实际响应');
console.log('2. 对比多个节点的坐标是否相同');
console.log('3. 如果相同，说明后端算法需要进一步优化');
console.log('4. 如果不同，可能是前端显示问题');

// 导出函数供其他测试使用
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        testCoordinateGeneration,
        analyzeCoordinates,
        testBackendAlgorithm
    };
}