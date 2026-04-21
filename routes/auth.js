const express = require('express');
const { JWTManager } = require('../lib/auth');

const router = express.Router();
const jwtManager = new JWTManager();

// 使用密钥换取访问令牌
router.post('/exchange-token', async (req, res) => {
  try {
    const { secret_key, client_id = 'anonymous' } = req.body;

    // 验证请求参数
    if (!secret_key) {
      return res.status(400).json({
        success: false,
        error: '缺少密钥参数',
        message: '请提供 secret_key 参数'
      });
    }

    // 验证密钥
    if (!jwtManager.validateSecretKey(secret_key)) {
      return res.status(401).json({
        success: false,
        error: '密钥验证失败',
        message: '提供的密钥不正确'
      });
    }

    // 生成访问令牌
    const token = jwtManager.generateAccessToken(client_id);
    const decoded = jwtManager.verifyToken(token);

    res.json({
      success: true,
      data: {
        token,
        token_type: 'Bearer',
        expires_in: jwtManager.expiryHours * 3600, // 秒
        expires_at: new Date(decoded.exp * 1000).toISOString(),
        client_id
      },
      message: '令牌生成成功'
    });

  } catch (error) {
    console.error('令牌交换失败:', error);
    res.status(500).json({
      success: false,
      error: '令牌生成失败',
      message: error.message
    });
  }
});

// 验证令牌有效性
router.post('/verify-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: '缺少令牌参数'
      });
    }

    const decoded = jwtManager.verifyToken(token);
    const isExpiringSoon = jwtManager.isTokenExpiringSoon(token);

    res.json({
      success: true,
      data: {
        valid: true,
        decoded,
        expires_at: new Date(decoded.exp * 1000).toISOString(),
        is_expiring_soon: isExpiringSoon,
        client_id: decoded.clientId
      }
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: '令牌无效',
      message: error.message
    });
  }
});

// 刷新令牌
router.post('/refresh-token', async (req, res) => {
  try {
    const { token } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        error: '缺少令牌参数'
      });
    }

    const newToken = jwtManager.refreshToken(token);
    const decoded = jwtManager.verifyToken(newToken);

    res.json({
      success: true,
      data: {
        token: newToken,
        token_type: 'Bearer',
        expires_in: jwtManager.expiryHours * 3600,
        expires_at: new Date(decoded.exp * 1000).toISOString(),
        client_id: decoded.clientId
      },
      message: '令牌刷新成功'
    });

  } catch (error) {
    res.status(401).json({
      success: false,
      error: '令牌刷新失败',
      message: error.message
    });
  }
});

// 获取服务器时间（用于客户端时间同步）
router.get('/server-time', (req, res) => {
  res.json({
    success: true,
    data: {
      server_time: new Date().toISOString(),
      timestamp: Date.now(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    }
  });
});

// 获取认证配置信息
router.get('/config', (req, res) => {
  res.json({
    success: true,
    data: {
      token_expiry_hours: jwtManager.expiryHours,
      auth_enabled: true,
      supported_endpoints: [
        'POST /api/auth/exchange-token',
        'POST /api/auth/verify-token',
        'POST /api/auth/refresh-token',
        'GET /api/auth/server-time',
        'GET /api/auth/config'
      ]
    }
  });
});

module.exports = router;