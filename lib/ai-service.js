const OpenAI = require('openai');

/**
 * DeepSeek AI 分析服务
 * 使用 OpenAI 兼容 API 接入 DeepSeek 模型
 */
class DeepSeekAIService {
  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
      baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
      maxRetries: 3,
      timeout: 60000,
    });

    this.models = {
      chat: process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat',
    };
  }

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
        temperature: 0.1,
        max_tokens: 20
      });

      const emotion = response.choices[0]?.message?.content?.trim().toLowerCase();
      const validEmotions = ['happy', 'sad', 'angry', 'calm', 'shocked', 'love', 'anxious', 'excited', 'numb'];
      return validEmotions.includes(emotion) ? emotion : 'calm';
    } catch (error) {
      console.error('情感分析失败:', error);
      return 'calm';
    }
  }

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
      return isNaN(score) ? 2 : Math.max(0, Math.min(5, score));
    } catch (error) {
      console.error('重要性评估失败:', error);
      return 2;
    }
  }

  async generateTags(text, hint) {
    try {
      const baseTags = [
        '工作', '学习', '生活', '家庭', '社交', '健康', '休闲', '旅行',
        '情感', '思考', '成长', '挑战', '回忆', '梦想',
        '项目', '会议', '任务', '合作', '创新',
        '阅读', '研究', '技能', '知识', '实践',
        '娱乐', '游戏', '社交', '聚会', '爱好', '艺术',
        '日常', '周末', '假日', '季节', '户外',
        '亲情', '友情', '爱情', '同事', '网络',
        '健康', '疲惫', '压力', '平静', '兴奋',
        '节日', '纪念', '成就', '改变',
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
        temperature: 0.2,
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

      return ['生活'];
    } catch (error) {
      console.error('标签生成失败:', error);
      return ['生活'];
    }
  }

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
      return text.substring(0, 50) + (text.length > 50 ? '...' : '');
    }
  }

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
      return text.substring(0, 60) + (text.length > 60 ? '...' : '');
    }
  }

  async analyzeText(text, hint) {
    try {
      console.log('AI分析开始:', text.substring(0, 50) + '...');

      const h = (typeof hint === 'string' || hint == null)
        ? { emotion: hint || '', importance: hint || '', tags: hint || '', summary: hint || '' }
        : { emotion: hint.emotion || '', importance: hint.importance || '', tags: hint.tags || '', summary: hint.summary || '' };

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

      console.log('AI分析完成:', result);
      return result;
    } catch (error) {
      console.error('AI分析失败:', error);
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

  async testConnection() {
    try {
      const response = await this.client.chat.completions.create({
        model: this.models.chat,
        messages: [{ role: 'user', content: '你好' }],
        max_tokens: 10
      });
      return !!response.choices[0]?.message?.content;
    } catch (error) {
      console.error('DeepSeek AI 连接测试失败:', error);
      return false;
    }
  }

  async decideGalaxy(text, existingGalaxies = [], hint) {
    try {
      const baseGalaxies = [
        '工作', '学习', '生活', '家庭', '社交', '健康', '休闲', '旅行',
        '情感', '思考', '成长', '挑战', '回忆', '梦想',
        '项目', '会议', '任务', '合作', '创新',
        '阅读', '研究', '技能', '知识', '实践',
        '娱乐', '游戏', '社交', '聚会', '爱好', '艺术',
        '日常', '周末', '假日', '季节', '户外',
        '亲情', '友情', '爱情', '同事', '网络',
        '健康', '疲惫', '压力', '平静', '兴奋',
        '节日', '纪念', '成就', '改变',
        '人生主线', '人生转折', '日常琐事', '重要时刻', '长期规划',
        '碎片行星'
      ];

      const allGalaxies = [...new Set([...existingGalaxies, ...baseGalaxies])];

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
        temperature: 0.1,
        max_tokens: 20
      });

      let name = response.choices[0]?.message?.content?.trim();

      if (!name || !allGalaxies.includes(name)) {
        name = '碎片行星';
        return { name, is_new: true };
      }

      const isExisting = existingGalaxies.includes(name);
      return { name, is_new: !isExisting };
    } catch (error) {
      return { name: '碎片行星', is_new: true };
    }
  }
}

module.exports = { DeepSeekAIService };
