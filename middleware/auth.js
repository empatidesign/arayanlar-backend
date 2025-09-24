const userService = require('../services/userService');

const authenticateToken = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Erişim token\'ı gerekli'
      });
    }

    const decoded = userService.verifyToken(token);
    
    const user = await userService.getUserById(decoded.id);
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname
    };

    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token süresi dolmuş'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Geçersiz token'
      });
    }

    return res.status(500).json({
      success: false,
      message: 'Token doğrulama hatası'
    });
  }
};

const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = userService.verifyToken(token);
    const user = await userService.getUserById(decoded.id);
    
    req.user = user ? {
      id: user.id,
      email: user.email,
      name: user.name,
      surname: user.surname
    } : null;

    next();
  } catch (error) {
    req.user = null;
    next();
  }
};

module.exports = {
  authenticateToken,
  optionalAuth
};