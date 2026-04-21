# 🤖 AI功能使用说明

## 功能概述

后端现已集成硅基流动免费AI模型，支持自动分析文本的情感、重要性、标签和摘要。用户只需输入文本内容，AI会自动生成相关属性。

## 🚀 快速开始

### 1. 获取API密钥
1. 访问 [硅基流动官网](https://cloud.siliconflow.cn/)
2. 注册账号并登录
3. 进入控制台，获取API密钥
4. 在`.env`文件中设置：
```
SILICON_FLOW_API_KEY=your_api_key_here
```

### 2. 使用AI分析功能

#### 创建文本节点（自动AI分析）
```bash
curl -X POST https://lifeapi.szhaovo.cn/api/cosmic/nodes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天和朋友们一起聚餐，大家都很开心，聊了很多有趣的话题。",
    "use_ai": true
  }'
```

#### 创建文本节点（手动设置参数）
```bash
curl -X POST https://lifeapi.szhaovo.cn/api/cosmic/nodes \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "text": "今天和朋友们一起聚餐，大家都很开心。",
    "ai_emotion": "happy",
    "ai_importance": 4,
    "ai_tags": ["社交", "朋友", "聚餐"],
    "use_ai": false
  }'
```

#### 上传文件并AI分析
```bash
curl -X POST https://lifeapi.szhaovo.cn/api/upload/moment \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "file=@/path/to/your/file.jpg" \
  -F "text=今天拍了一张很美的日落照片" \
  -F "use_ai=true"
```

## 📋 AI分析能力

### 情感分析
- 支持9种情感：happy, sad, angry, calm, shocked, love, anxious, excited, numb
- 基于文本内容进行智能判断

### 重要性评估
- 0-5分评分系统
- 基于事件的意义和影响力进行评估

### 标签生成
- 自动生成3-5个相关标签
- 标签简洁、准确、有意义

### 智能摘要
- 生成20-50字的准确摘要
- 概括文本主要内容

## ⚙️ 配置选项

### 环境变量
```bash
# 必需
SILICON_FLOW_API_KEY=your_api_key_here

# 可选（已有默认值）
SILICON_FLOW_BASE_URL=https://api.siliconflow.cn/v1
SILICON_FLOW_CHAT_MODEL=Qwen/Qwen2.5-7B-Instruct
SILICON_FLOW_EMBEDDING_MODEL=BAAI/bge-large-zh-v1.5
```

### 使用OpenAI API（备用方案）
如果使用OpenAI而不是硅基流动：
```bash
OPENAI_API_KEY=your_openai_api_key_here
```

## 🔧 高级用法

### 混合模式
用户可以部分使用AI分析，部分手动设置：
```json
{
  "text": "今天工作很忙，但完成了重要项目",
  "ai_emotion": "calm",  // 手动设置情感
  "ai_importance": 4,   // 手动设置重要性
  "use_ai": true        // 让AI生成标签和摘要
}
```

### 完全手动模式
```json
{
  "text": "今天工作很忙",
  "ai_emotion": "numb",
  "ai_importance": 2,
  "ai_tags": ["工作", "日常"],
  "use_ai": false
}
```

## 📊 响应数据

创建节点后，响应会包含AI分析结果：
```json
{
  "success": true,
  "data": {
    "id": 123,
    "text": "今天和朋友们一起聚餐...",
    "ai_emotion": "happy",
    "ai_importance": 4,
    "ai_tags": ["社交", "朋友", "聚餐", "快乐"],
    "ai_summary": "与朋友聚餐，气氛愉快，交流有趣话题",
    "ai_analyzed": true,
    "ai_model": "Qwen/Qwen2.5-7B-Instruct",
    "cosmic": {
      "position_x": 123.45,
      "position_y": 67.89,
      "position_z": 90.12,
      "brightness": 0.85,
      "color": "#FFD700",
      "halo": true
    }
  }
}
```

## ⚠️ 注意事项

1. **API限制**：硅基流动免费版有请求频率限制
2. **网络延迟**：AI分析会增加1-3秒的响应时间
3. **失败处理**：AI服务失败时会自动回退到默认值
4. **成本控制**：建议缓存常用分析结果

## 🧪 测试AI功能

运行测试脚本验证AI功能：
```bash
node test/ai-service-test.js
```

## 🔍 调试信息

服务器日志会显示AI分析过程：
```
🤖 AI分析开始: 今天和朋友们一起聚餐...
✅ AI分析完成: { ai_emotion: 'happy', ai_importance: 4, ... }
```

## 📞 技术支持

- 硅基流动文档：https://docs.siliconflow.cn/
- API状态：https://status.siliconflow.cn/