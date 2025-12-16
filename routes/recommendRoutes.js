const express = require('express');
const router = express.Router();
const Recommend = require('../models/Recommend');

// 建立建議
router.post('/', async (req, res) => {
  try {
    const recommend = new Recommend(req.body);
    await recommend.save();
    res.status(201).json(recommend);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 取得所有建議
router.get('/', async (req, res) => {
  try {
    const { Login_ID } = req.query;
    const query = Login_ID ? { Login_ID } : {};
    
    const recommends = await Recommend.find(query)
      .sort({ UploadDateTime: -1 });
    res.json(recommends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定病人的建議
router.get('/patient/:loginId', async (req, res) => {
  try {
    const recommends = await Recommend.find({ Login_ID: req.params.loginId })
      .sort({ UploadDateTime: -1 });
    res.json(recommends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

