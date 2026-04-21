const jwt = require('jsonwebtoken');
const crypto = require('crypto-js');

// JWT 工具类
class JWTManager {
  constructor() {
    this.secret = process.env.JWT_SECRET || 'your-default-secret-key';
    this.expiryHours = parseInt(process.env.TOKEN_EXPIRY_HOURS) || 24;
    this.authSecretKey = process.env.AUTH_SECRET_KEY || '2259421152shen';
  }

  // 生成 Token
  generateToken(payload) {
    const expiresIn = `${this.expiryHours}h`;
    return jwt.sign(payload, this.secret, { 
      expiresIn,
      issuer: 'chaos-life-backend',
      audience: 'cosmic-users'
    });
  }

  // 验证 Token
  verifyToken(token) {
    try {
      return jwt.verify(token, this.secret, {
        issuer: 'chaos-life-backend',
        audience: 'cosmic-users'
      });
    } catch (error) {
      throw new Error('Token 验证失败: ' + error.message);
    }
  }

  // 从请求头中提取 Token
  extractTokenFromHeader(authHeader) {
    if (!authHeader) {
      throw new Error('缺少 Authorization 头');
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      throw new Error('Authorization 头格式错误，应为: Bearer <token>');
    }

    return parts[1];
  }

  // 验证密钥
  validateSecretKey(providedKey) {
    return providedKey === this.authSecretKey;
  }

  // 生成简单的访问令牌（用于密钥交换）
  generateAccessToken(clientId) {
    const payload = {
      clientId,
      type: 'access',
      issuedAt: Date.now(),
      expiresAt: Date.now() + (this.expiryHours * 60 * 60 * 1000)
    };

    return this.generateToken(payload);
  }

  // 检查 Token 是否即将过期
  isTokenExpiringSoon(token, thresholdMinutes = 30) {
    try {
      const decoded = jwt.decode(token);
      const currentTime = Math.floor(Date.now() / 1000);
      const timeUntilExpiry = decoded.exp - currentTime;
      
      return timeUntilExpiry <= (thresholdMinutes * 60);
    } catch (error) {
      return true; // 如果无法解码，认为即将过期
    }
  }

  // 刷新 Token
  refreshToken(token) {
    try {
      const decoded = jwt.verify(token, this.secret, {
        issuer: 'chaos-life-backend',
        audience: 'cosmic-users',
        ignoreExpiration: true // 允许过期的 token 刷新
      });

      // 移除过期时间等字段
      delete decoded.exp;
      delete decoded.iat;
      delete decoded.nbf;

      return this.generateToken(decoded);
    } catch (error) {
      throw new Error('Token 刷新失败: ' + error.message);
    }
  }
}

// 认证中间件
function authenticateToken(req, res, next) {
  const jwtManager = new JWTManager();

  try {
    const authHeader = req.headers['authorization'];
    const token = jwtManager.extractTokenFromHeader(authHeader);
    
    const decoded = jwtManager.verifyToken(token);
    
    // 将用户信息添加到请求对象
    req.user = decoded;
    req.token = token;
    
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: '认证失败',
      message: error.message
    });
  }
}

// 可选认证中间件（有 token 就验证，没有就跳过）
function optionalAuthenticateToken(req, res, next) {
  const jwtManager = new JWTManager();
  
  try {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
      const token = jwtManager.extractTokenFromHeader(authHeader);
      const decoded = jwtManager.verifyToken(token);
      req.user = decoded;
      req.token = token;
    }
    next();
  } catch (error) {
    // 认证失败也不阻止，只是不添加用户信息
    next();
  }
}

// 检查权限中间件
function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: '需要认证'
      });
    }

    // 这里可以根据需要扩展权限系统
    // 目前只要有有效的 token 就有权限
    next();
  };
}

module.exports = {
  JWTManager,
  authenticateToken,
  optionalAuthenticateToken,
  requirePermission
};