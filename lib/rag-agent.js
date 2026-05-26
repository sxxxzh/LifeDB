const OpenAI = require('openai');
const { ZillizClient } = require('./zilliz-client');
const { EmbeddingService } = require('./embedding-service');

const SYSTEM_PROMPT = `你是用户的个人知识助手，名为"混沌记忆管家"。
你有权访问用户的多种数据：生活记忆(moment)、博客文章(blog_post)、项目总结(project)等。
请基于提供的资料片段回答问题。

规则：
- 如果资料足以回答问题，直接回答并引用来源的类型和时间
- 如果资料不足，诚实告知用户"我没有找到相关的记录"
- 回答保持温暖、个人化的语气，像一位了解用户的朋友
- 不要编造资料中不存在的信息
- 用中文回答`;

const CONTEXT_TOKEN_BUDGET = 2048;
const MAX_CONTEXT_ITEMS = 10;
const SEARCH_TOP_K = 20;

class RagAgent {
  constructor() {
    this.zilliz = new ZillizClient();
    this.embedding = new EmbeddingService();

    const llmProvider = process.env.LLM_PROVIDER || 'deepseek';
    if (llmProvider === 'deepseek') {
      this.llm = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        maxRetries: 2,
        timeout: 60000,
      });
      this.llmModel = process.env.DEEPSEEK_CHAT_MODEL || 'deepseek-chat';
    } else if (llmProvider === 'siliconflow') {
      this.llm = new OpenAI({
        apiKey: process.env.SILICON_FLOW_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.SILICON_FLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
        maxRetries: 2,
        timeout: 30000,
      });
      this.llmModel = process.env.SILICON_FLOW_CHAT_MODEL || 'Qwen/Qwen2.5-7B-Instruct';
    } else {
      this.llm = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 2,
        timeout: 30000,
      });
      this.llmModel = 'gpt-4o-mini';
    }

    this.temperature = parseFloat(process.env.RAG_TEMPERATURE || '0.7');
  }

  async ask(question, options = {}) {
    const { timeRange, emotion, tag, maxResults, sourceType } = options;

    const memories = await this.retrieve(question, {
      timeRange, emotion, tag, sourceType,
      topK: maxResults || SEARCH_TOP_K,
    });

    const context = this.buildContext(memories, question);

    if (context.items.length === 0) {
      return {
        answer: '我还没有找到相关的记忆记录。请先创建一些生活记录，或换个问题试试看。',
        sources: [],
        context_used: [],
      };
    }

    const messages = [
      { role: 'system', content: SYSTEM_PROMPT },
    ];

    const contextText = context.items.map((item, i) => {
      let header = `[${item.source_type || '记忆'} ${i + 1}]`;
      if (item.date) header += ` 时间: ${item.date}`;
      if (item.emotion) header += ` | 心情: ${item.emotion}`;
      if (item.title) header += ` | 标题: ${item.title}`;
      return `${header}\n${item.text}`;
    }).join('\n\n');

    messages.push({
      role: 'user',
      content: `以下是我的一些记忆记录：\n\n${contextText}\n\n---\n用户问题: ${question}\n\n请基于以上记忆记录回答。`,
    });

    const res = await this.llm.chat.completions.create({
      model: this.llmModel,
      messages,
      temperature: this.temperature,
      max_tokens: 4096,
    });

    const answer = res.choices[0].message.content || '';

    return {
      answer,
      sources: context.items.map(item => ({
        source_type: item.source_type,
        moment_id: item.moment_id,
        source_id: item.source_id,
        title: item.title,
        date: item.date,
        emotion: item.emotion,
        preview: item.text.substring(0, 200),
      })),
      context_used: context.items,
    };
  }

  async retrieve(query, filters = {}) {
    if (!this.zilliz.available) return [];

    await this.zilliz.ensureCollection();

    const queryEmbedding = await this.embedding.embed(query);

    const zillizFilter = this.buildZillizFilter(filters);

    const res = await this.zilliz.search(queryEmbedding, {
      topK: filters.topK || SEARCH_TOP_K,
      filter: zillizFilter,
      outputFields: ['content_hash', 'text_preview', 'metadata', 'content_type'],
    });

    const rawResults = res.data || [];

    const seen = new Set();
    const deduped = [];
    for (const r of rawResults) {
      let meta = {};
      try { meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}); } catch (_) {}

      if (!meta.is_canonical) continue;
      if (seen.has(r.content_hash)) continue;

      seen.add(r.content_hash);
      deduped.push({
        id: r.id,
        content_hash: r.content_hash,
        text: r.text_preview || '',
        content_type: r.content_type,
        score: r.distance || r.score || 0,
        source_type: meta.source_type || 'moment',
        source_id: meta.source_id || meta.moment_id,
        moment_id: meta.moment_id,
        title: meta.title || meta.project_name,
        date: meta.created_at,
        emotion: meta.emotion,
        importance: meta.importance || 0,
        tags: meta.tags || [],
        file_url: meta.file_url,
        galaxy: meta.galaxy,
      });
    }

    deduped.sort((a, b) => {
      const scoreA = (a.score || 0) * 0.4 + (a.importance / 5) * 0.3;
      const scoreB = (b.score || 0) * 0.4 + (b.importance / 5) * 0.3;
      return scoreB - scoreA;
    });

    return deduped;
  }

  buildZillizFilter(filters) {
    const parts = [];

    if (filters.timeRange) {
      const { start, end } = filters.timeRange;
      if (start) {
        parts.push(`metadata["created_at"] >= "${start}"`);
      }
      if (end) {
        parts.push(`metadata["created_at"] <= "${end}"`);
      }
    }

    if (filters.emotion) {
      parts.push(`metadata["emotion"] == "${filters.emotion}"`);
    }

    if (filters.tag) {
      parts.push(`metadata["tags"] like "%${filters.tag}%"`);
    }

    if (filters.sourceType) {
      parts.push(`metadata["source_type"] == "${filters.sourceType}"`);
    }

    return parts.length > 0 ? parts.join(' && ') : '';
  }

  buildContext(memories, question) {
    const items = [];
    let tokenUsed = 0;

    const queryTokens = this.estimateTokens(question);
    const systemTokens = this.estimateTokens(SYSTEM_PROMPT);
    const reservedTokens = queryTokens + systemTokens + 200;
    const availableTokens = CONTEXT_TOKEN_BUDGET - reservedTokens;

    for (const mem of memories) {
      if (items.length >= MAX_CONTEXT_ITEMS) break;

      const dateStr = mem.date ? new Date(mem.date).toLocaleDateString('zh-CN') : '未知';
      const text = mem.text || '';
      const memTokens = this.estimateTokens(text + dateStr);

      if (tokenUsed + memTokens > availableTokens) break;

      items.push({
        source_type: mem.source_type || 'moment',
        source_id: mem.source_id,
        title: mem.title,
        moment_id: mem.moment_id,
        date: dateStr,
        emotion: mem.emotion,
        text: text,
      });
      tokenUsed += memTokens;
    }

    return { items, tokenUsed };
  }

  estimateTokens(text) {
    if (!text) return 0;
    const chineseChars = (text.match(/[\u4e00-\u9fff]/g) || []).length;
    const other = text.length - chineseChars;
    return Math.ceil(chineseChars * 1.5 + other * 0.3);
  }

  async getMemories(limit = 50, offset = 0) {
    if (!this.zilliz.available) return [];

    try {
      const res = await this.zilliz.query({
        outputFields: ['content_hash', 'text_preview', 'metadata', 'content_type', 'id'],
        limit,
        offset,
      });

      return (res.data || []).map(r => {
        let meta = {};
        try { meta = typeof r.metadata === 'string' ? JSON.parse(r.metadata) : (r.metadata || {}); } catch (_) {}
        return {
          id: r.id,
          content_hash: r.content_hash,
          content_type: r.content_type,
          text_preview: r.text_preview,
          moment_id: meta.moment_id,
          date: meta.created_at,
          emotion: meta.emotion,
          importance: meta.importance,
          is_canonical: meta.is_canonical,
        };
      });
    } catch (_) {
      return [];
    }
  }
}

module.exports = { RagAgent };
