const express = require('express');
const router = express.Router();
const path = require('path');
const { uploadPhotos } = require('../config/multer');
const PatientRecord = require('../models/PatientRecord');
const Patient = require('../models/Patient');

// 建立完整的 PatientRecord（使用 multer 上傳圖片）
router.post('/', uploadPhotos, async (req, res) => {
  try {
    const { Login_ID, HRV, GSR, Pulse, Recommend, CheckList, UploadDateTime } = req.body;

    // 驗證必填欄位
    if (!Login_ID) {
      return res.status(400).json({ 
        error: 'Login_ID is required' 
      });
    }

    // 驗證 Patient 是否存在
    const patient = await Patient.findOne({ Login_ID });
    if (!patient) {
      return res.status(404).json({ 
        error: 'Patient not found. Please register patient first.',
        message: '請先註冊病人帳號'
      });
    }

    // 處理上傳的圖片檔案
    const photos = {};
    const photoFields = ['FacePhoto', 'TouguePhoto', 'TeethEPhoto', 'TeethInPhoto1', 'TeethInPhoto2', 'TeethInPhoto3', 'TeethInPhoto4'];
    
    let hasAtLeastOnePhoto = false;

    if (req.files) {
      photoFields.forEach(field => {
        if (req.files[field] && req.files[field][0]) {
          const file = req.files[field][0];
          // 建立 URL 路徑: /public/{patientId}/{filename}
          const photoUrl = `/public/${patient._id}/${file.filename}`;
          photos[field] = photoUrl;
          hasAtLeastOnePhoto = true;
        }
      });
    }

    // 驗證至少有一張照片
    if (!hasAtLeastOnePhoto) {
      return res.status(400).json({ 
        error: 'At least one photo must be uploaded',
        message: '必須上傳至少一張照片（7張照片：FacePhoto, TouguePhoto, TeethEPhoto, TeethInPhoto1-4）',
        requiredPhotos: photoFields
      });
    }

    // 建立 PatientRecord
    const recordData = {
      Login_ID,
      patientId: patient._id,
      Photos: photos
    };

    // 可選：添加 HRV（如果提供）
    if (HRV) {
      try {
        recordData.HRV = typeof HRV === 'string' ? JSON.parse(HRV) : HRV;
      } catch (e) {
        recordData.HRV = HRV;
      }
    }

    // 可選：添加 GSR（如果提供）
    if (GSR) {
      try {
        recordData.GSR = typeof GSR === 'string' ? JSON.parse(GSR) : GSR;
      } catch (e) {
        recordData.GSR = GSR;
      }
    }

    // 可選：添加其他欄位（如果提供）
    if (Pulse) {
      try {
        recordData.Pulse = typeof Pulse === 'string' ? JSON.parse(Pulse) : Pulse;
      } catch (e) {
        recordData.Pulse = Pulse;
      }
    }
    if (Recommend) recordData.Recommend = Recommend;
    if (CheckList) {
      try {
        recordData.CheckList = typeof CheckList === 'string' ? JSON.parse(CheckList) : CheckList;
      } catch (e) {
        recordData.CheckList = CheckList;
      }
    }
    if (UploadDateTime) recordData.UploadDateTime = UploadDateTime;

    const patientRecord = new PatientRecord(recordData);
    await patientRecord.save();
    
    // 回傳時包含 Patient 資料
    const result = await PatientRecord.findById(patientRecord._id)
      .populate('patientId', '-Password');
    
    res.status(201).json({
      message: 'Patient record created successfully',
      record: result
    });
  } catch (error) {
    console.error('Error creating patient record:', error);
    
    // 如果發生錯誤，清理已上傳的檔案
    if (req.files) {
      const fs = require('fs');
      Object.keys(req.files).forEach(field => {
        if (req.files[field] && req.files[field][0]) {
          const filePath = req.files[field][0].path;
          try {
            fs.unlinkSync(filePath);
          } catch (e) {
            console.error('Error deleting file:', e);
          }
        }
      });
    }

    if (error.message.includes('Photos')) {
      return res.status(400).json({ 
        error: error.message,
        message: '照片是必須的，請確保至少上傳一張照片'
      });
    }
    
    if (error.message.includes('只允許上傳圖片')) {
      return res.status(400).json({
        error: 'Invalid file type',
        message: error.message
      });
    }

    res.status(400).json({ 
      error: error.message,
      details: error.stack
    });
  }
});

// 取得所有 PatientRecord
router.get('/', async (req, res) => {
  try {
    const { Login_ID, startDate, endDate, hasHRV, hasGSR, hasPulse } = req.query;
    const query = {};
    
    if (Login_ID) query.Login_ID = Login_ID;
    if (startDate || endDate) {
      query.UploadDateTime = {};
      if (startDate) query.UploadDateTime.$gte = new Date(startDate);
      if (endDate) query.UploadDateTime.$lte = new Date(endDate);
    }
    if (hasHRV === 'true') query.HRV = { $exists: true, $ne: null };
    if (hasGSR === 'true') query.GSR = { $exists: true, $ne: null };
    if (hasPulse === 'true') query.Pulse = { $exists: true, $ne: null };
    
    const records = await PatientRecord.find(query)
      .populate('patientId')
      .sort({ UploadDateTime: -1 });
    
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定病人的所有記錄
router.get('/patient/:loginId', async (req, res) => {
  try {
    const records = await PatientRecord.find({ Login_ID: req.params.loginId })
      .populate('patientId')
      .sort({ UploadDateTime: -1 });
    
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定記錄
router.get('/:id', async (req, res) => {
  try {
    const record = await PatientRecord.findById(req.params.id)
      .populate('patientId');
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新 PatientRecord
router.put('/:id', async (req, res) => {
  try {
    const record = await PatientRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    ).populate('patientId');
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 部分更新（例如：只更新 HRV 或 GSR）
router.patch('/:id', async (req, res) => {
  try {
    const record = await PatientRecord.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    ).populate('patientId');
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 刪除 PatientRecord（同時刪除相關圖片）
router.delete('/:id', async (req, res) => {
  try {
    const record = await PatientRecord.findById(req.params.id);
    
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }

    // 刪除相關圖片檔案
    const fs = require('fs');
    const path = require('path');
    const photoFields = ['FacePhoto', 'TouguePhoto', 'TeethEPhoto', 'TeethInPhoto1', 'TeethInPhoto2', 'TeethInPhoto3', 'TeethInPhoto4'];
    
    photoFields.forEach(field => {
      if (record.Photos && record.Photos[field]) {
        const photoUrl = record.Photos[field];
        // 從 URL 轉換為檔案路徑
        const filePath = path.join(__dirname, '..', photoUrl);
        try {
          if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
          }
        } catch (e) {
          console.error(`Error deleting photo ${field}:`, e);
        }
      }
    });

    // 刪除資料庫記錄
    await PatientRecord.findByIdAndDelete(req.params.id);
    
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;
