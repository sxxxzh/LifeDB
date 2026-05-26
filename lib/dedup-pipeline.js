const crypto = require('crypto');

class DedupPipeline {
  constructor(embeddingService) {
    this.embeddingService = embeddingService;
  }

  normalizeText(text) {
    return (text || '')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
  }

  computeMD5(text) {
    return crypto.createHash('md5').update(text, 'utf8').digest('hex');
  }

  async dedupBatch(moments, existingIndex) {
    const results = [];
    const existingHashes = new Map();

    if (existingIndex && existingIndex.length > 0) {
      for (const row of existingIndex) {
        existingHashes.set(row.content_hash, row);
      }
    }

    const toEmbed = [];

    for (const moment of moments) {
      const text = moment.ai_summary || moment.text || '';
      if (!text.trim()) continue;

      const normalized = this.normalizeText(text);
      const contentHash = this.computeMD5(normalized);

      results.push({
        moment,
        content_hash: contentHash,
        normalized_text: normalized,
        is_exact_duplicate: existingHashes.has(contentHash),
      });

      toEmbed.push(normalized);
    }

    if (toEmbed.length > 0) {
      const embeddings = await this.embeddingService.embedBatch(toEmbed);
      for (let i = 0; i < results.length; i++) {
        results[i].embedding = embeddings[i];
      }
    }

    return results;
  }
}

module.exports = { DedupPipeline };
