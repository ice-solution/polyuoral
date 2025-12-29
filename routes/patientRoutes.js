const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');

// 病人註冊 API
router.post('/register', async (req, res) => {
  try {
    const { loginid, Password, Name_CN, Name_EN, Age, Month, Email, PhoneNumber } = req.body;

    // 驗證必填欄位
    if (!loginid || !Password || !Name_CN || !Name_EN || !Age || !Month || !Email || !PhoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['loginid', 'Password', 'Name_CN', 'Name_EN', 'Age', 'Month', 'Email', 'PhoneNumber']
      });
    }

    // 檢查 loginid 是否已存在
    const existingPatient = await Patient.findOne({ loginid });
    if (existingPatient) {
      return res.status(409).json({ 
        error: 'loginid already exists',
        message: '此登入帳號已被使用，請使用其他帳號'
      });
    }

    // 檢查 Email 是否已存在
    const existingEmail = await Patient.findOne({ Email });
    if (existingEmail) {
      return res.status(409).json({ 
        error: 'Email already exists',
        message: '此電子郵件已被使用'
      });
    }

    // 加密密碼
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(Password, salt);

    // 建立新病人
    const patient = new Patient({
      loginid,
      Password: hashedPassword,
      Name_CN,
      Name_EN,
      Age,
      Month,
      Email,
      PhoneNumber,
      status: 'active' // 註冊時默認為 active
    });

    await patient.save();

    // 回傳時不包含密碼
    const patientResponse = patient.toObject();
    delete patientResponse.Password;

    res.status(201).json({
      message: 'Patient registered successfully',
      patient: patientResponse
    });
  } catch (error) {
    if (error.code === 11000) {
      // MongoDB duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        error: `${field} already exists`,
        message: '此資料已被使用'
      });
    }
    res.status(400).json({ error: error.message });
  }
});

// 建立病人資料（保留原有功能）
router.post('/', async (req, res) => {
  try {
    // 如果提供了密碼，自動加密
    if (req.body.Password) {
      const salt = await bcrypt.genSalt(10);
      req.body.Password = await bcrypt.hash(req.body.Password, salt);
    }

    const patient = new Patient(req.body);
    await patient.save();
    
    // 回傳時不包含密碼
    const patientResponse = patient.toObject();
    delete patientResponse.Password;
    
    res.status(201).json(patientResponse);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        error: `${field} already exists`
      });
    }
    res.status(400).json({ error: error.message });
  }
});

// 申請帳號（不需要密碼，狀態設為 inactive）
router.post('/application', async (req, res) => {
  try {
    const { Name_CN, Name_EN, Age, Month, Email, PhoneNumber } = req.body;

    // 驗證必填欄位
    if (!Name_CN || !Name_EN || !Age || !Month || !Email || !PhoneNumber) {
      return res.status(400).json({
        error: 'Missing required fields',
        required: ['Name_CN', 'Name_EN', 'Age', 'Month', 'Email', 'PhoneNumber']
      });
    }

    // 檢查 Email 是否已存在
    const existingEmail = await Patient.findOne({ Email });
    if (existingEmail) {
      return res.status(409).json({
        error: 'Email already exists',
        message: '此電子郵件已被使用'
      });
    }

    // 生成臨時 loginid（確保唯一性）
    let tempLoginid;
    let isUnique = false;
    let attempts = 0;
    const maxAttempts = 10;

    // 確保生成的 loginid 是唯一的
    while (!isUnique && attempts < maxAttempts) {
      tempLoginid = `app_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const existing = await Patient.findOne({ loginid: tempLoginid });
      if (!existing) {
        isUnique = true;
      }
      attempts++;
    }

    if (!isUnique) {
      return res.status(500).json({
        error: 'Failed to generate unique loginid',
        message: '無法生成唯一的登入帳號，請稍後再試'
      });
    }

    const tempPassword = Math.random().toString(36).slice(-8); // 臨時密碼

    // 加密密碼
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(tempPassword, salt);

    // 建立新病人（狀態為 inactive）
    const patient = new Patient({
      loginid: tempLoginid,
      Password: hashedPassword,
      Name_CN,
      Name_EN,
      Age: Number(Age),
      Month: Number(Month),
      Email,
      PhoneNumber,
      status: 'inactive'
    });

    await patient.save();

    // 回傳時不包含密碼
    const patientResponse = patient.toObject();
    delete patientResponse.Password;

    res.status(201).json({
      message: 'Application submitted successfully. Please wait for admin approval.',
      application: patientResponse
    });
  } catch (error) {
    console.error('Application submission error:', error);
    console.error('Error details:', {
      code: error.code,
      keyPattern: error.keyPattern,
      keyValue: error.keyValue,
      message: error.message
    });
    
    // 處理重複鍵錯誤
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0] || 'unknown';
      const fieldValue = error.keyValue || {};
      
      // 根據實際重複的字段返回對應的錯誤訊息
      if (field === 'Email' || fieldValue.Email) {
        return res.status(409).json({
          error: 'Duplicate entry',
          message: '此電子郵件已被使用',
          field: 'Email'
        });
      } else if (field === 'loginid' || fieldValue.loginid) {
        // 如果真的是 loginid 重複（理論上不應該發生），重新生成並重試
        console.warn('Unexpected loginid duplicate, regenerating...');
        // 這裡可以實現重試邏輯，但為了簡化，直接返回錯誤
        return res.status(500).json({
          error: 'System error',
          message: '系統錯誤，請稍後再試'
        });
      } else {
        // 其他字段重複（可能是舊的 Login_ID 索引問題）
        return res.status(409).json({
          error: 'Duplicate entry',
          message: '此資料已被使用，請稍後再試',
          field: field
        });
      }
    }

    // 處理驗證錯誤
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(e => e.message);
      return res.status(400).json({
        error: 'Validation error',
        message: errors.join(', '),
        details: errors
      });
    }

    res.status(400).json({ 
      error: error.message || '提交申請失敗',
      message: '提交申請時發生錯誤，請稍後再試'
    });
  }
});

// 取得所有病人
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find().select('-Password');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根據 loginid 取得病人資料
router.get('/:loginid', async (req, res) => {
  try {
    const patient = await Patient.findOne({ loginid: req.params.loginid }).select('-Password');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新病人資料
router.put('/:loginid', async (req, res) => {
  try {
    // 解碼 URL 參數（處理特殊字符）
    const loginid = decodeURIComponent(req.params.loginid);
    console.log(`更新用戶請求 - URL參數: ${req.params.loginid}, 解碼後: ${loginid}`);
    
    // 先查找當前用戶
    // 如果 loginid 看起來像 MongoDB ObjectId（24個十六進制字符），則使用 _id 查找
    // 否則使用 loginid 查找
    let currentPatient;
    if (loginid.match(/^[0-9a-fA-F]{24}$/)) {
      // 看起來像 ObjectId，使用 _id 查找
      currentPatient = await Patient.findById(loginid);
    } else {
      // 使用 loginid 查找
      currentPatient = await Patient.findOne({ loginid: loginid });
    }
    
    if (!currentPatient) {
      console.error(`Patient not found with identifier: ${loginid}`);
      // 嘗試查找所有患者，看看是否有類似的 loginid
      const allPatients = await Patient.find().select('loginid _id');
      console.log('當前數據庫中的所有 loginid:', allPatients.map(p => ({ loginid: p.loginid, _id: p._id })));
      return res.status(404).json({ 
        error: 'Patient not found',
        message: `找不到用戶`
      });
    }

    const updateData = { ...req.body };
    
    // 確定查找條件（使用 _id 或 loginid）
    const findCondition = loginid.match(/^[0-9a-fA-F]{24}$/) 
      ? { _id: loginid }
      : { loginid: loginid };
    
    // 如果要更新 loginid，檢查新的 loginid 是否已被其他用戶使用
    if (updateData.loginid && updateData.loginid !== currentPatient.loginid) {
      const existingPatient = await Patient.findOne({ loginid: updateData.loginid });
      if (existingPatient && existingPatient._id.toString() !== currentPatient._id.toString()) {
        return res.status(409).json({ 
          error: 'loginid already exists',
          message: '此登入帳號已被其他用戶使用'
        });
      }
    }
    
    // 如果提供了密碼，則加密
    if (updateData.Password) {
      const salt = await bcrypt.genSalt(10);
      updateData.Password = await bcrypt.hash(updateData.Password, salt);
    }
    
    // 如果要更新 Email，檢查新的 Email 是否已被其他用戶使用（排除當前用戶）
    if (updateData.Email && updateData.Email !== currentPatient.Email) {
      const existingEmail = await Patient.findOne({ 
        Email: updateData.Email,
        _id: { $ne: currentPatient._id } // 排除當前用戶（使用 _id）
      });
      if (existingEmail) {
        return res.status(409).json({ 
          error: 'Email already exists',
          message: '此電子郵件已被其他用戶使用'
        });
      }
    }
    
    const patient = await Patient.findOneAndUpdate(
      findCondition,
      updateData,
      { new: true, runValidators: true }
    ).select('-Password');
    
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ 
        error: `${field} already exists`,
        message: '此資料已被使用'
      });
    }
    res.status(400).json({ error: error.message });
  }
});

// 刪除病人資料
router.delete('/:loginid', async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({ loginid: req.params.loginid });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

