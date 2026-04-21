// 测试修复后的坐标存储功能
const axios = require('axios');

const API_BASE_URL = 'https://lifeapi.szhaovo.cn';
const AUTH_KEY = '2259421152shen';

async function testCoordinateStorage() {
  console.log('🧪 测试坐标存储修复效果');
  console.log('=====================================');
  
  try {
    // 1. 获取访问令牌
    console.log('\n1️⃣ 获取访问令牌...');
    const tokenResponse = await axios.post(`${API_BASE_URL}/auth/exchange-token`, {
      secret_key: AUTH_KEY
    });
    
    const token = tokenResponse.data.data.token;
    console.log('✅ 获取令牌成功:', token.substring(0, 20) + '...');
    
    // 2. 创建测试节点
    console.log('\n2️⃣ 创建测试节点...');
    const testNodes = [
      {
        text: '坐标测试节点1 - 修复验证',
        ai_emotion: 'happy',
        ai_importance: 3
      },
      {
        text: '坐标测试节点2 - 修复验证', 
        ai_emotion: 'sad',
        ai_importance: 4
      },
      {
        text: '坐标测试节点3 - 修复验证',
        ai_emotion: 'excited', 
        ai_importance: 5
      }
    ];
    
    const createdNodes = [];
    
    for (let i = 0; i < testNodes.length; i++) {
      const nodeData = testNodes[i];
      console.log(`\n创建节点 ${i + 1}: ${nodeData.text}`);
      
      const response = await axios.post(`${API_BASE_URL}/cosmic/nodes`, nodeData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const createdNode = response.data.data;
      createdNodes.push(createdNode);
      
      console.log(`坐标: X=${createdNode.cosmic.position_x.toFixed(4)}, Y=${createdNode.cosmic.position_y.toFixed(4)}, Z=${createdNode.cosmic.position_z.toFixed(4)}`);
      
      // 稍作延迟，确保时间戳不同
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    // 3. 重新获取节点验证坐标是否保持不变
    console.log('\n3️⃣ 重新获取节点验证坐标...');
    
    const fetchResponse = await axios.get(`${API_BASE_URL}/cosmic/nodes?limit=10`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const fetchedNodes = fetchResponse.data.data;
    
    // 找到我们刚创建的节点
    const testNodeIds = createdNodes.map(node => node.id);
    const ourNodes = fetchedNodes.filter(node => testNodeIds.includes(node.id));
    
    console.log('\n📊 坐标对比:');
    let allCoordinatesMatch = true;
    
    for (let i = 0; i < createdNodes.length; i++) {
      const created = createdNodes[i];
      const fetched = ourNodes.find(n => n.id === created.id);
      
      if (fetched) {
        const createdPos = created.cosmic;
        const fetchedPos = fetched.cosmic;
        
        const xMatch = Math.abs(createdPos.position_x - fetchedPos.position_x) < 0.001;
        const yMatch = Math.abs(createdPos.position_y - fetchedPos.position_y) < 0.001;
        const zMatch = Math.abs(createdPos.position_z - fetchedPos.position_z) < 0.001;
        
        const allMatch = xMatch && yMatch && zMatch;
        
        console.log(`\n节点 ${i + 1} (${created.text}):`);
        console.log(`  创建时: X=${createdPos.position_x.toFixed(4)}, Y=${createdPos.position_y.toFixed(4)}, Z=${createdPos.position_z.toFixed(4)}`);
        console.log(`  获取时: X=${fetchedPos.position_x.toFixed(4)}, Y=${fetchedPos.position_y.toFixed(4)}, Z=${fetchedPos.position_z.toFixed(4)}`);
        console.log(`  坐标匹配: ${allMatch ? '✅' : '❌'}`);
        
        if (!allMatch) {
          allCoordinatesMatch = false;
        }
      }
    }
    
    // 4. 检查节点间坐标是否唯一
    console.log('\n4️⃣ 检查坐标唯一性...');
    let hasDuplicates = false;
    
    for (let i = 0; i < ourNodes.length; i++) {
      for (let j = i + 1; j < ourNodes.length; j++) {
        const pos1 = ourNodes[i].cosmic;
        const pos2 = ourNodes[j].cosmic;
        
        const distance = Math.sqrt(
          Math.pow(pos1.position_x - pos2.position_x, 2) + 
          Math.pow(pos1.position_y - pos2.position_y, 2) + 
          Math.pow(pos1.position_z - pos2.position_z, 2)
        );
        
        if (distance < 0.1) {
          console.log(`⚠️  警告: 节点${i+1}和节点${j+1}坐标过于接近 (距离: ${distance.toFixed(6)})`);
          hasDuplicates = true;
        } else {
          console.log(`✅ 节点${i+1}和节点${j+1}距离: ${distance.toFixed(4)}`);
        }
      }
    }
    
    console.log('\n📋 测试结果总结:');
    console.log(`坐标存储一致性: ${allCoordinatesMatch ? '✅ 通过' : '❌ 失败'}`);
    console.log(`坐标唯一性: ${!hasDuplicates ? '✅ 通过' : '❌ 失败'}`);
    
    if (allCoordinatesMatch && !hasDuplicates) {
      console.log('\n🎉 修复成功！坐标现在正确保存到数据库并保持唯一性！');
    } else {
      console.log('\n⚠️  仍有问题需要进一步修复');
    }
    
    // 5. 清理测试节点
    console.log('\n5️⃣ 清理测试节点...');
    for (const node of createdNodes) {
      try {
        await axios.delete(`${API_BASE_URL}/cosmic/nodes/${node.id}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log(`✅ 已删除节点 ${node.id}`);
      } catch (error) {
        console.log(`❌ 删除节点 ${node.id} 失败:`, error.message);
      }
    }
    
  } catch (error) {
    console.error('❌ 测试失败:', error.response?.data || error.message);
  }
}

// 运行测试
testCoordinateStorage();