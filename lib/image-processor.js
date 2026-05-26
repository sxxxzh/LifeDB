const crypto = require('crypto');

class ImageProcessor {
  validateImageBuffer(buffer) {
    if (!buffer || buffer.length === 0) return { valid: false, type: null };
    const signatures = {
      jpeg: [0xFF, 0xD8, 0xFF],
      png: [0x89, 0x50, 0x4E, 0x47],
      gif: [0x47, 0x49, 0x46, 0x38],
      webp: [0x52, 0x49, 0x46, 0x46],
    };
    for (const [type, sig] of Object.entries(signatures)) {
      if (sig.every((byte, i) => buffer[i] === byte)) {
        return { valid: true, type };
      }
    }
    return { valid: false, type: null };
  }

  computeImageHash(buffer) {
    return crypto.createHash('md5').update(buffer).digest('hex');
  }

  getImageDescription(moment) {
    const parts = [];
    if (moment.text && moment.text.trim()) parts.push(moment.text.trim());
    if (moment.ai_summary && moment.ai_summary.trim()) parts.push(moment.ai_summary.trim());
    if (moment.ai_tags && Array.isArray(moment.ai_tags) && moment.ai_tags.length > 0) {
      parts.push('标签: ' + moment.ai_tags.join(', '));
    }
    if (moment.ai_emotion) parts.push('情绪: ' + moment.ai_emotion);
    if (moment.file_name) parts.push('文件: ' + moment.file_name);
    return parts.filter(Boolean).join(' | ') || null;
  }
}

module.exports = { ImageProcessor };
