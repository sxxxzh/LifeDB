const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

// Supabase 配置验证
const requiredEnvVars = ['SUPABASE_URL', 'SUPABASE_ANON_KEY'];
const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ 缺少必要的环境变量:');
  missingVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n请复制 .env.example 为 .env 并填写配置');
  process.exit(1);
}

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_ANON_KEY
);

// 测试数据库连接
async function testConnection() {
  try {
    console.log('🔄 测试 Supabase 连接...');
    
    const { data, error } = await supabase
      .from('moments')
      .select('id')
      .limit(1);
    
    if (error) {
      console.error('❌ 数据库连接失败:', error.message);
      return false;
    }
    
    console.log('✅ 数据库连接成功');
    return true;
  } catch (error) {
    console.error('❌ 连接测试失败:', error.message);
    return false;
  }
}

// 测试存储桶访问
async function testStorage() {
  try {
    console.log('🔄 测试 Supabase 存储...');
    
    const { data, error } = await supabase.storage
      .from('chaos-life')
      .list('', { limit: 1 });
    
    if (error) {
      console.error('❌ 存储访问失败:', error.message);
      console.log('💡 请确保已在 Supabase 控制台创建 chaos-life 存储桶');
      return false;
    }
    
    console.log('✅ 存储访问成功');
    return true;
  } catch (error) {
    console.error('❌ 存储测试失败:', error.message);
    return false;
  }
}

async function ensureBucket(bucketName) {
  try {
    const { data: buckets, error: listErr } = await supabase.storage.listBuckets();
    if (listErr) throw listErr;
    const exists = Array.isArray(buckets) && buckets.find(b => b.name === bucketName);
    if (!exists) {
      console.log(`🔧 创建存储桶: ${bucketName}`);
      const { error: createErr } = await supabase.storage.createBucket(bucketName, { public: true });
      if (createErr) throw createErr;
      console.log(`✅ 存储桶已创建: ${bucketName}`);
    } else {
      console.log(`✅ 存储桶已存在: ${bucketName}`);
    }
    return true;
  } catch (error) {
    console.error('❌ 存储桶检查/创建失败:', error.message);
    return false;
  }
}

// 运行所有测试
async function runTests() {
  console.log('🚀 开始 Supabase 配置测试...\n');
  
  const dbTest = await testConnection();
  const storageTest = await testStorage();
  if (!storageTest) {
    console.log('\n🔁 尝试自动创建存储桶 chaos-life...');
    await ensureBucket('chaos-life');
  }
  
  console.log('\n📊 测试结果:');
  console.log(`   数据库连接: ${dbTest ? '✅ 通过' : '❌ 失败'}`);
  console.log(`   存储访问: ${storageTest ? '✅ 通过' : '❌ 失败'}`);
  
  if (dbTest && storageTest) {
    console.log('\n🎉 所有测试通过！后端服务可以正常启动。');
    return true;
  } else {
    console.log('\n⚠️  部分测试失败，请检查配置。');
    return false;
  }
}

module.exports = { supabase, runTests, ensureBucket };
