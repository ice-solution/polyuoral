const express = require('express');
const router = express.Router();
const DataRecord = require('../models/DataRecord');

// 建立數據記錄（HRV、GSR、HRV2、GSR2、把脈Data）
router.post('/', async (req, res) => {
  try {
    const dataRecord = new DataRecord(req.body);
    await dataRecord.save();
    res.status(201).json(dataRecord);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 取得所有數據記錄
router.get('/', async (req, res) => {
  try {
    const { loginid, type, startDate, endDate } = req.query;
    const query = {};
    
    if (loginid) query.loginid = loginid;
    if (type) query.type = type;
    if (startDate || endDate) {
      query.UploadDateTime = {};
      if (startDate) query.UploadDateTime.$gte = new Date(startDate);
      if (endDate) query.UploadDateTime.$lte = new Date(endDate);
    }
    
    const records = await DataRecord.find(query)
      .sort({ UploadDateTime: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定病人的數據記錄
router.get('/patient/:loginid', async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    const query = { loginid: req.params.loginid };
    
    if (type) query.type = type;
    if (startDate || endDate) {
      query.UploadDateTime = {};
      if (startDate) query.UploadDateTime.$gte = new Date(startDate);
      if (endDate) query.UploadDateTime.$lte = new Date(endDate);
    }
    
    const records = await DataRecord.find(query)
      .sort({ UploadDateTime: -1 });
    res.json(records);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定記錄
router.get('/:id', async (req, res) => {
  try {
    const record = await DataRecord.findById(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 更新數據記錄
router.put('/:id', async (req, res) => {
  try {
    const record = await DataRecord.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json(record);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 刪除數據記錄
router.delete('/:id', async (req, res) => {
  try {
    const record = await DataRecord.findByIdAndDelete(req.params.id);
    if (!record) {
      return res.status(404).json({ error: 'Record not found' });
    }
    res.json({ message: 'Record deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


