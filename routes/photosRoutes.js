const express = require('express');
const router = express.Router();
const Photos = require('../models/Photos');

// 上傳照片
router.post('/', async (req, res) => {
  try {
    const photos = new Photos(req.body);
    await photos.save();
    res.status(201).json(photos);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 取得所有照片記錄
router.get('/', async (req, res) => {
  try {
    const { Login_ID, startDate, endDate } = req.query;
    const query = {};
    
    if (Login_ID) query.Login_ID = Login_ID;
    if (startDate || endDate) {
      query.UploadDateTime = {};
      if (startDate) query.UploadDateTime.$gte = new Date(startDate);
      if (endDate) query.UploadDateTime.$lte = new Date(endDate);
    }
    
    const photos = await Photos.find(query)
      .sort({ UploadDateTime: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定病人的照片
router.get('/patient/:loginId', async (req, res) => {
  try {
    const photos = await Photos.find({ Login_ID: req.params.loginId })
      .sort({ UploadDateTime: -1 });
    res.json(photos);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定照片記錄
router.get('/:id', async (req, res) => {
  try {
    const photo = await Photos.findById(req.params.id);
    if (!photo) {
      return res.status(404).json({ error: 'Photo not found' });
    }
    res.json(photo);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


