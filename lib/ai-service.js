const OpenAI = require('openai');

/**
 * 硅基流动AI分析服务
 * 使用OpenAI兼容API接入硅基流动的免费模型
 */
class SiliconFlowAIService {
  constructor() {
    // 硅基流动API配置
    this.client = new OpenAI({
      apiKey: process.env.SILICON_FLOW_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.SILICON_FLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
      maxRetries: 3,
      timeout: 30000 // 30秒超时
    });
    
    // 使用的免费模型
    this.models = {
      chat: process.env.SILICON_FLOW_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct',
      embedding: process.env.SILICON_FLOW_EMBEDDING_MODEL || 'BAAI/bge-large-zh-v1.5'
    };
  }

  /**
   * 分析文本的情感
   * @param {string} text - 要分析的文本
   * @returns {Promise<string>} - 情感类型
   */
  async analyzeEmotion(text, hint) {
    try {
      const prompt = `你是一个情感分析专家。请分析以下文本的情感，并从以下选项中选择一个最符合的情感：
可选情感：happy, sad, angry, calm, shocked, love, anxious, excited, numb

文本："${text}"

补充提示："${hint || ''}"

 注意：提示词仅用于指导，请不要在输出中包含提示词里的任何词或内容，不要提及提示词。只返回情感类型。

请只返回情感类型，不要其他解释。`;

      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // 低温度确保一致性
        max_tokens: 20
      });

      const emotion = response.choices[0]?.message?.content?.trim().toLowerCase();
      
      // 验证返回的情感是否在允许范围内
      const validEmotions = ['happy', 'sad', 'angry', 'calm', 'shocked', 'love', 'anxious', 'excited', 'numb'];
      return validEmotions.includes(emotion) ? emotion : 'calm';
    } catch (error) {
      console.error('情感分析失败:', error);
      return 'calm'; // 默认情感
    }
  }

  /**
   * 评估文本的重要性
   * @param {string} text - 要评估的文本
   * @returns {Promise<number>} - 重要性评分 (0-5)
   */
  async analyzeImportance(text, hint) {
    try {
      const prompt = `你是一个重要性评估专家。请评估以下文本的重要性，从0-5分进行评分：

评分标准：
0分：完全不重要，无意义的内容
1分：轻微重要，日常琐事
2分：一般重要，普通事件
3分：比较重要，有意义的事件
4分：很重要，重要的人生经历
5分：极其重要，人生重大事件

文本："${text}"

补充提示："${hint || ''}"

 注意：提示词仅用于指导，请不要在输出中包含提示词里的任何词或内容，不要提及提示词。只返回数字评分。

请只返回数字评分(0-5)，不要其他解释。`;

      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1,
        max_tokens: 5
      });

      const score = parseInt(response.choices[0]?.message?.content?.trim());
      return isNaN(score) ? 2 : Math.max(0, Math.min(5, score)); // 确保在0-5范围内
    } catch (error) {
      console.error('重要性评估失败:', error);
      return 2; // 默认重要性
    }
  }

  /**
   * 生成文本标签
   * @param {string} text - 要生成标签的文本
   * @returns {Promise<string[]>} - 标签数组
   */
  async generateTags(text, hint) {
    try {
      // 基础标签列表，范围更大，减少细分
      const baseTags = [
        // 生活基本类（范围扩大）
        '工作', '学习', '生活', '家庭', '社交', '健康', '休闲', '旅行',
        // 情感与心理（合并相似概念）
        '情感', '思考', '成长', '挑战', '回忆', '梦想',
        // 工作相关（合并细分项）
        '项目', '会议', '任务', '合作', '创新',
        // 学习相关（合并细分项）
        '阅读', '研究', '技能', '知识', '实践',
        // 休闲与娱乐（合并细分项）
        '娱乐', '游戏', '社交', '聚会', '爱好', '艺术',
        // 生活场景（合并细分项）
        '日常', '周末', '假日', '季节', '户外',
        // 人际关系（合并细分项）
        '亲情', '友情', '爱情', '同事', '网络',
        // 身心状态（合并细分项）
        '健康', '疲惫', '压力', '平静', '兴奋',
        // 重要事件（合并细分项）
        '节日', '纪念', '成就', '改变',
        // 添加更广泛的分类
        '人生主线', '人生转折', '日常琐事', '重要时刻', '长期规划'
      ];
      
      const prompt = `你是一个标签生成专家。请为以下文本生成3-5个合适的标签，标签应该简洁、准确、有意义。

要求：
1. 每个标签1-4个字
2. 标签要准确反映文本内容的核心主题
3. 从提供的常见标签中选择最匹配的，或者创建新的但确保有实际意义
4. 避免使用过于抽象或无意义的标签
5. 返回JSON格式数组

常见标签示例：${baseTags.join('、')}

文本："${text}"

补充提示："${hint || ''}"

 注意：不得直接使用提示词中的词作为标签；标签不得包含提示词中的词语或短语；不要在输出中提及提示词。

请返回格式：["标签1", "标签2", "标签3"]`;

      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2, // 降低温度，减少随机性
        max_tokens: 100
      });

      const content = response.choices[0]?.message?.content?.trim();
      
      try {
        let tags = JSON.parse(content);
        if (Array.isArray(tags) && tags.length > 0) {
          tags = tags.slice(0, 5).map(tag => String(tag).trim());
          if (hint) {
            const hintLower = String(hint).toLowerCase();
            tags = tags.filter(t => !hintLower.includes(String(t).toLowerCase()));
          }
          if (tags.length === 0) return ['生活'];
          return tags;
        }
      } catch (e) {
        // 如果JSON解析失败，尝试提取标签
        const matches = content.match(/\["([^"]+)"(?:,\s*"([^"]+)")*\]/);
        if (matches) {
          let tags = matches.slice(1).filter(Boolean).map(x => String(x).trim());
          if (hint) {
            const hintLower = String(hint).toLowerCase();
            tags = tags.filter(t => !hintLower.includes(String(t).toLowerCase()));
          }
          if (tags.length === 0) return ['生活'];
          return tags;
        }
      }
      
      return ['生活']; // 默认标签
    } catch (error) {
      console.error('标签生成失败:', error);
      return ['生活']; // 默认标签
    }
  }

  /**
   * 生成智能摘要
   * @param {string} text - 要生成摘要的文本
   * @returns {Promise<string>} - 摘要文本
   */
  async generateSummary(text, hint) {
    try {
      const prompt = `你是专业的生活记录摘要专家。输入可能是散乱、重复的片段，请进行聚类与去重后总结要点。

规则：
1) 优先提炼主题与趋势，合并相似信息，去除重复与噪声
2) 如为碎片化多条记录，提炼为2句以内的精炼总结（60字以内）
3) 不要罗列细节，不要逐条复述，不要添加原文没有的信息
4) 语言平实、准确，避免夸张

文本："${text}"

补充提示："${hint || ''}"

请只返回总结内容，不要其他解释。`;

      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 160
      });

      let summary = response.choices[0]?.message?.content?.trim();
      if (summary && hint) {
        const h = String(hint);
        if (h.length > 0) {
          summary = summary.split(h).join('').trim();
        }
      }
      return summary || text.substring(0, 50) + (text.length > 50 ? '...' : '');
    } catch (error) {
      console.error('摘要生成失败:', error);
      // 回退到原始方法
      return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    }
  }

  /**
   * 生成周期性总结（周、月、年）
   * @param {string} text - 要生成总结的文本
   * @returns {Promise<string>} - 总结文本
   */
  async generateSummaryForPeriod(text) {
    try {
      const prompt = `你是生活记录总结专家。输入为一个周期内的零散记录（可能重复或杂乱）。

任务：
1) 先聚类并合并相似信息，去重与压缩噪声；忽略无关琐碎
2) 提炼周期主题与情绪走向，给出一个精炼总结（60-90字）
3) 语气平实，第一人称，不罗列，不逐条复述

生活记录："${text}"

只返回总结文本。`;

      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
        max_tokens: 180
      });

      const summary = response.choices[0]?.message?.content?.trim();
      return summary || text.substring(0, 60) + (text.length > 60 ? '...' : '');
    } catch (error) {
      console.error('周期总结生成失败:', error);
      // 回退到原始方法
      return text.substring(0, 60) + (text.length > 60 ? '...' : '');
    }
  }

  /**
   * 完整的AI分析 - 一次调用分析所有属性
   * @param {string} text - 要分析的文本
   * @returns {Promise<Object>} - 包含所有AI分析结果的对象
   */
  async analyzeText(text, hint) {
    try {
      console.log('🤖 AI分析开始:', text.substring(0, 50) + '...');
      
      const h = (typeof hint === 'string' || hint == null)
        ? { emotion: hint || '', importance: hint || '', tags: hint || '', summary: hint || '' }
        : { emotion: hint.emotion || '', importance: hint.importance || '', tags: hint.tags || '', summary: hint.summary || '' };

      // 并行执行所有分析任务
      const [emotion, importance, tags, summary] = await Promise.all([
        this.analyzeEmotion(text, h.emotion),
        this.analyzeImportance(text, h.importance),
        this.generateTags(text, h.tags),
        this.generateSummary(text, h.summary)
      ]);

      const result = {
        ai_emotion: emotion,
        ai_importance: importance,
        ai_tags: tags,
        ai_summary: summary,
        ai_analyzed: true,
        ai_model: this.models.chat
      };

      console.log('✅ AI分析完成:', result);
      return result;
    } catch (error) {
      console.error('AI分析失败:', error);
      // 回退到默认结果
      return {
        ai_emotion: 'calm',
        ai_importance: 2,
        ai_tags: ['生活'],
        ai_summary: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
        ai_analyzed: false,
        ai_error: error.message
      };
    }
  }

  /**
   * 测试AI服务是否可用
   * @returns {Promise<boolean>}
   */
  async testConnection() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10
      });
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('AI服务连接测试失败:', error);
      return false;
    }
  }

  async decideGalaxy(text, existingGalaxies = [], hint) {
    try {
      // 基础星系列表，范围更大，减少细分
      const baseGalaxies = [
        // 生活基本类（范围扩大）
        '工作', '学习', '生活', '家庭', '社交', '健康', '休闲', '旅行',
        // 情感与心理（合并相似概念）
        '情感', '思考', '成长', '挑战', '回忆', '梦想',
        // 工作相关（合并细分项）
        '项目', '会议', '任务', '合作', '创新',
        // 学习相关（合并细分项）
        '阅读', '研究', '技能', '知识', '实践',
        // 休闲与娱乐（合并细分项）
        '娱乐', '游戏', '社交', '聚会', '爱好', '艺术',
        // 生活场景（合并细分项）
        '日常', '周末', '假日', '季节', '户外',
        // 人际关系（合并细分项）
        '亲情', '友情', '爱情', '同事', '网络',
        // 身心状态（合并细分项）
        '健康', '疲惫', '压力', '平静', '兴奋',
        // 重要事件（合并细分项）
        '节日', '纪念', '成就', '改变',
        // 添加更广泛的分类
        '人生主线', '人生转折', '日常琐事', '重要时刻', '长期规划',
        // 散乱内容分类
        '碎片行星'
      ];
      
      // 合并已有星系和基础星系，去重并保持顺序
      const allGalaxies = [...new Set([...existingGalaxies, ...baseGalaxies])];
      
      // 检查是否有碎片行星相关的星系，如果没有则添加碎片行星
      const scatteredGalaxies = allGalaxies.filter(g => g.includes('碎片行星'));
      if (scatteredGalaxies.length === 0) {
        // 添加碎片行星作为选项
        allGalaxies.push('碎片行星');
      }
      
      const prompt = `从以下列表中选择一个最匹配的星系名称：

${allGalaxies.slice(0, 30).join('、')}

文本："${text}"

规则：
1. 必须从列表中选择，不能创建新名称
2. 如果内容无意义、琐碎或无法分类，选择"碎片行星"
3. 只返回一个名称，不要解释`;
      
      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.1, // 降低温度，减少随机性，更倾向于选择已有星系
        max_tokens: 20
      });
      
      let name = response.choices[0]?.message?.content?.trim();
      
      // 如果返回的名称不在列表中，强制使用碎片行星
      if (!name || !allGalaxies.includes(name)) {
        name = '碎片行星';
        return { name, is_new: true };
      }
      
      // 检查是否为已有星系
      const isExisting = existingGalaxies.includes(name);
      return { name, is_new: !isExisting };
    } catch (error) {
      return { name: '碎片行星', is_new: true };
    }
  }
}

module.exports = { SiliconFlowAIService };
