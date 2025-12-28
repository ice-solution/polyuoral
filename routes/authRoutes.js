const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Patient = require('../models/Patient');

// 登入
router.post('/login', async (req, res) => {
  try {
    const { loginid, Password } = req.body;

    // 驗證必填欄位
    if (!loginid || !Password) {
      return res.status(400).json({
        error: 'Missing required fields',
        message: '請提供 loginid 和 Password'
      });
    }

    // 查詢病人
    const patient = await Patient.findOne({ loginid });
    
    if (!patient) {
      console.log(`登入失敗: 找不到帳號 ${loginid}`);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '登入帳號或密碼錯誤'
      });
    }

    console.log(`嘗試登入: ${loginid}, 找到用戶: ${patient.loginid}`);

    // 驗證密碼
    // 注意：如果密碼是明文儲存，需要先更新為加密儲存
    // 這裡假設密碼可能是明文或已加密
    let isPasswordValid = false;
    
    // 檢查密碼是否已加密（bcrypt hash 通常以 $2a$ 或 $2b$ 開頭）
    if (patient.Password.startsWith('$2')) {
      // 已加密，使用 bcrypt 比較
      isPasswordValid = await bcrypt.compare(Password, patient.Password);
    } else {
      // 明文，直接比較（為了向後兼容）
      isPasswordValid = patient.Password === Password;
      
      // 如果驗證成功，更新為加密密碼
      if (isPasswordValid) {
        const salt = await bcrypt.genSalt(10);
        patient.Password = await bcrypt.hash(Password, salt);
        await patient.save();
      }
    }

    if (!isPasswordValid) {
      console.log(`登入失敗: 密碼錯誤 (帳號: ${loginid})`);
      return res.status(401).json({
        error: 'Invalid credentials',
        message: '登入帳號或密碼錯誤'
      });
    }

    console.log(`登入成功: ${loginid}`);

    // 生成 JWT token
    const token = jwt.sign(
      { 
        id: patient._id,
        loginid: patient.loginid 
      },
      process.env.JWT_SECRET,
      { 
        expiresIn: process.env.JWT_EXPIRE || '7d' 
      }
    );

    // 返回 token 和病人資訊（不包含密碼）
    const patientResponse = patient.toObject();
    delete patientResponse.Password;

    res.json({
      message: 'Login successful',
      token,
      patient: patientResponse
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      error: 'Login failed',
      message: error.message
    });
  }
});

// 驗證 token（檢查當前登入狀態）
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({
        error: 'No token provided',
        message: '請提供認證 token'
      });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const patient = await Patient.findById(decoded.id).select('-Password');

    if (!patient) {
      return res.status(401).json({
        error: 'Invalid token',
        message: '無效的認證 token'
      });
    }

    res.json({
      valid: true,
      patient
    });
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError') {
      return res.status(401).json({
        valid: false,
        error: error.name,
        message: error.name === 'TokenExpiredError' ? 'Token 已過期' : '無效的 token'
      });
    }

    res.status(500).json({
      error: 'Verification failed',
      message: error.message
    });
  }
});

// 登出（客戶端刪除 token 即可，這裡提供一個端點用於記錄）
router.post('/logout', (req, res) => {
  res.json({
    message: 'Logout successful',
    note: '請在客戶端刪除 token'
  });
});

module.exports = router;


