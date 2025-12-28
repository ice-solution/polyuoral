const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');

// JWT 驗證 Middleware
const authenticate = async (req, res, next) => {
  try {
    // 從 header 取得 token
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        message: '請提供認證 token'
      });
    }

    // 驗證 token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 查詢病人是否存在
    const patient = await Patient.findById(decoded.id).select('-Password');
    
    if (!patient) {
      return res.status(401).json({
        error: 'Invalid token',
        message: '無效的認證 token'
      });
    }

    // 將病人資訊附加到 request
    req.patient = patient;
    req.patientId = patient._id;
    req.loginid = patient.loginid;
    
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Invalid token',
        message: '無效的認證 token'
      });
    }
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: '認證 token 已過期，請重新登入'
      });
    }

    res.status(500).json({
      error: 'Authentication error',
      message: error.message
    });
  }
};

// 可選的認證（如果沒有 token 也可以繼續，但不會有 req.patient）
const optionalAuthenticate = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const patient = await Patient.findById(decoded.id).select('-Password');
      
      if (patient) {
        req.patient = patient;
        req.patientId = patient._id;
        req.loginid = patient.loginid;
      }
    }
    
    next();
  } catch (error) {
    // 如果驗證失敗，繼續執行但不附加 patient 資訊
    next();
  }
};

module.exports = {
  authenticate,
  optionalAuthenticate
};


