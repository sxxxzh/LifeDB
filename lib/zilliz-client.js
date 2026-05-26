const axios = require('axios');

class ZillizClient {
  constructor() {
    this.endpoint = process.env.ZILLIZ_ENDPOINT;
    this.apiKey = process.env.ZILLIZ_API_KEY;
    this.collectionName = process.env.ZILLIZ_COLLECTION_NAME || 'chaos_life';

    if (!this.endpoint || !this.apiKey) {
      console.warn('[Zilliz] ZILLIZ_ENDPOINT 或 ZILLIZ_API_KEY 未配置，向量功能不可用');
      this.available = false;
      this.http = null;
      return;
    }

    this.available = true;
    this.http = axios.create({
      baseURL: this.endpoint.replace(/\/$/, ''),
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Request-Timeout': '15',
      },
      timeout: 15000,
    });
  }

  async _request(method, path, data = null) {
    if (!this.available) {
      throw new Error('Zilliz 客户端未配置');
    }
    const start = Date.now();
    try {
      const res = await this.http({ method, url: path, data });
      await this._logUsage(path, data ? (data.data || []).length : 0, Date.now() - start, true);
      return res.data;
    } catch (err) {
      const msg = err.response ? JSON.stringify(err.response.data) : err.message;
      await this._logUsage(path, 0, Date.now() - start, false, msg);
      throw err;
    }
  }

  async _logUsage(operation, vectorCount, latencyMs, success, errorMessage) {
    try {
      const { supabase } = require('../config/supabase');
      await supabase.from('zilliz_usage_log').insert([{
        operation,
        vector_count: vectorCount,
        latency_ms: latencyMs,
        success,
        error_message: errorMessage || null,
      }]);
    } catch (_) {}
  }

  async ensureCollection() {
    if (!this.available || !this.http) return;

    const { data: list } = await this.http.post('/v2/vectordb/collections/list', {});
    const exists = Array.isArray(list.data) && list.data.includes(this.collectionName);

    if (exists) {
      console.log('[Zilliz] Collection 已存在:', this.collectionName);
      return;
    }

    const dimension = parseInt(process.env.EMBEDDING_DIMENSION || '1024');
    await this.http.post('/v2/vectordb/collections/create', {
      collectionName: this.collectionName,
      dimension,
      metricType: 'COSINE',
      primaryFieldName: 'id',
      vectorFieldName: 'embedding',
      idType: 'VarChar',
      autoID: false,
      params: { max_length: '64' },
      description: 'LifeDB 个人记忆向量库',
    });
    console.log('[Zilliz] Collection 已创建:', this.collectionName);
  }

  async insert(entities) {
    return this._request('POST', '/v2/vectordb/entities/insert', {
      collectionName: this.collectionName,
      data: entities,
    });
  }

  async upsert(entities) {
    return this._request('POST', '/v2/vectordb/entities/upsert', {
      collectionName: this.collectionName,
      data: entities,
    });
  }

  async search(queryEmbedding, { topK = 20, filter = '', outputFields = [] } = {}) {
    const params = {
      collectionName: this.collectionName,
      data: [queryEmbedding],
      annsField: 'embedding',
      limit: topK,
    };
    if (filter) params.filter = filter;
    if (outputFields && outputFields.length > 0) params.outputFields = outputFields;

    return this._request('POST', '/v2/vectordb/entities/search', params);
  }

  async delete(filter) {
    return this._request('POST', '/v2/vectordb/entities/delete', {
      collectionName: this.collectionName,
      filter,
    });
  }

  async deleteByIds(ids) {
    const filter = ids.map(id => `id == "${id}"`).join(' || ');
    return this.delete(filter);
  }

  async getByIds(ids, outputFields = []) {
    return this._request('POST', '/v2/vectordb/entities/get', {
      collectionName: this.collectionName,
      id: ids,
      outputFields: outputFields.length > 0 ? outputFields : ['*'],
    });
  }

  async query({ filter = '', outputFields = ['*'], limit = 10, offset = 0 } = {}) {
    return this._request('POST', '/v2/vectordb/entities/query', {
      collectionName: this.collectionName,
      filter,
      outputFields,
      limit,
      offset,
    });
  }
}

module.exports = { ZillizClient };
