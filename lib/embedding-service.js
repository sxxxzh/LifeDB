const OpenAI = require('openai');

class EmbeddingService {
  constructor() {
    this.provider = process.env.EMBEDDING_PROVIDER || 'deepseek';

    this.useChatEmbedding = false;

    if (this.provider === 'deepseek') {
      this.client = new OpenAI({
        apiKey: process.env.DEEPSEEK_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        maxRetries: 2,
        timeout: 60000,
      });
      this.model = process.env.EMBEDDING_MODEL || 'deepseek-v4-flash';
      this.useNgramFallback = true;
    } else if (this.provider === 'openai') {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 2,
        timeout: 30000,
      });
      this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
      this.useNgramFallback = false;
    } else if (this.provider === 'siliconflow') {
      this.client = new OpenAI({
        apiKey: process.env.SILICON_FLOW_API_KEY || process.env.OPENAI_API_KEY,
        baseURL: process.env.SILICON_FLOW_BASE_URL || 'https://api.siliconflow.cn/v1',
        maxRetries: 2,
        timeout: 30000,
      });
      this.model = process.env.EMBEDDING_MODEL || 'BAAI/bge-large-zh-v1.5';
      this.useNgramFallback = false;
    } else {
      this.client = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY,
        maxRetries: 2,
        timeout: 30000,
      });
      this.model = process.env.EMBEDDING_MODEL || 'text-embedding-3-small';
      this.useNgramFallback = false;
    }

    this.dimension = parseInt(process.env.EMBEDDING_DIMENSION || '256');
    this.available = true;
  }

  _embedViaNgrams(text) {
    const chars = (text || '').replace(/[^\u4e00-\u9fff\w]/g, '');
    const dim = this.dimension;
    const vec = new Array(dim).fill(0);

    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      let h1 = 0;
      for (let j = 0; j < c.length; j++) {
        h1 = ((h1 << 5) - h1) + c.charCodeAt(j);
        h1 |= 0;
      }
      vec[Math.abs(h1) % dim] += 1;
    }

    for (let i = 0; i < chars.length - 1; i++) {
      const bg = chars[i] + chars[i + 1];
      let h2 = 0;
      for (let j = 0; j < bg.length; j++) {
        h2 = ((h2 << 5) - h2) + bg.charCodeAt(j);
        h2 |= 0;
      }
      vec[Math.abs(h2) % dim] += 1;
    }

    const words = (text || '').toLowerCase().split(/[\s,，。！？、；：""''（）]+/).filter(Boolean);
    for (const w of words) {
      let h3 = 0;
      for (let j = 0; j < w.length; j++) {
        h3 = ((h3 << 5) - h3) + w.charCodeAt(j);
        h3 |= 0;
      }
      vec[Math.abs(h3) % dim] += 1;
    }

    const mag = Math.sqrt(vec.reduce((s, v) => s + v * v, 0));
    if (mag === 0) return vec;
    for (let i = 0; i < dim; i++) {
      vec[i] /= mag;
    }
    return vec;
  }

  async embed(text) {
    if (!text || text.trim().length === 0) throw new Error('输入文本为空');

    if (this.useNgramFallback) {
      return this._embedViaNgrams(text);
    }

    const input = text.length > 8000 ? text.substring(0, 8000) : text;
    const res = await this.client.embeddings.create({
      model: this.model,
      input,
      encoding_format: 'float',
    });
    return res.data[0].embedding;
  }

  async embedBatch(texts) {
    const valid = texts.map(t => (t || '').trim()).filter(Boolean);
    if (valid.length === 0) return [];

    if (this.useNgramFallback) {
      return valid.map(t => this._embedViaNgrams(t));
    }

    const input = valid.map(t => t.length > 8000 ? t.substring(0, 8000) : t);
    const res = await this.client.embeddings.create({
      model: this.model,
      input,
      encoding_format: 'float',
    });
    return res.data.map(d => d.embedding);
  }

  cosineSimilarity(a, b) {
    if (!a || !b || a.length !== b.length) return 0;
    let dot = 0, magA = 0, magB = 0;
    for (let i = 0; i < a.length; i++) {
      dot += a[i] * b[i];
      magA += a[i] * a[i];
      magB += b[i] * b[i];
    }
    const denom = Math.sqrt(magA) * Math.sqrt(magB);
    return denom === 0 ? 0 : dot / denom;
  }
}

module.exports = { EmbeddingService };
