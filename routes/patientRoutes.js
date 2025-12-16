const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Patient = require('../models/Patient');

// 病人註冊 API
router.post('/register', async (req, res) => {
  try {
    const { Login_ID, Password, Name_CN, Name_EN, Age, Month, Email, PhoneNumber } = req.body;

    // 驗證必填欄位
    if (!Login_ID || !Password || !Name_CN || !Name_EN || !Age || !Month || !Email || !PhoneNumber) {
      return res.status(400).json({ 
        error: 'Missing required fields',
        required: ['Login_ID', 'Password', 'Name_CN', 'Name_EN', 'Age', 'Month', 'Email', 'PhoneNumber']
      });
    }

    // 檢查 Login_ID 是否已存在
    const existingPatient = await Patient.findOne({ Login_ID });
    if (existingPatient) {
      return res.status(409).json({ 
        error: 'Login_ID already exists',
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
      Login_ID,
      Password: hashedPassword,
      Name_CN,
      Name_EN,
      Age,
      Month,
      Email,
      PhoneNumber
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

// 取得所有病人
router.get('/', async (req, res) => {
  try {
    const patients = await Patient.find().select('-Password');
    res.json(patients);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 根據 Login_ID 取得病人資料
router.get('/:loginId', async (req, res) => {
  try {
    const patient = await Patient.findOne({ Login_ID: req.params.loginId }).select('-Password');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新病人資料
router.put('/:loginId', async (req, res) => {
  try {
    const patient = await Patient.findOneAndUpdate(
      { Login_ID: req.params.loginId },
      req.body,
      { new: true, runValidators: true }
    ).select('-Password');
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json(patient);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 刪除病人資料
router.delete('/:loginId', async (req, res) => {
  try {
    const patient = await Patient.findOneAndDelete({ Login_ID: req.params.loginId });
    if (!patient) {
      return res.status(404).json({ error: 'Patient not found' });
    }
    res.json({ message: 'Patient deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

