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
    const { loginid } = req.query;
    const query = loginid ? { loginid } : {};
    
    const recommends = await Recommend.find(query)
      .sort({ UploadDateTime: -1 });
    res.json(recommends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定病人的建議
router.get('/patient/:loginid', async (req, res) => {
  try {
    const recommends = await Recommend.find({ loginid: req.params.loginid })
      .sort({ UploadDateTime: -1 });
    res.json(recommends);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;


