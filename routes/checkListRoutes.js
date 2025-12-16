const express = require('express');
const router = express.Router();
const CheckList = require('../models/CheckList');

// 建立檢查清單
router.post('/', async (req, res) => {
  try {
    const checkList = new CheckList(req.body);
    await checkList.save();
    res.status(201).json(checkList);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
});

// 取得所有檢查清單
router.get('/', async (req, res) => {
  try {
    const { Login_ID } = req.query;
    const query = Login_ID ? { Login_ID } : {};
    
    const checkLists = await CheckList.find(query)
      .sort({ UploadDateTime: -1 });
    res.json(checkLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 取得特定病人的檢查清單
router.get('/patient/:loginId', async (req, res) => {
  try {
    const checkLists = await CheckList.find({ Login_ID: req.params.loginId })
      .sort({ UploadDateTime: -1 });
    res.json(checkLists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

