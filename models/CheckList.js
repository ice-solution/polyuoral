const mongoose = require('mongoose');

const checkListSchema = new mongoose.Schema({
  Login_ID: {
    type: String,
    required: true,
    index: true
  },
  // 這裡可以根據實際需求定義檢查清單的欄位
  // 暫時使用動態結構
  checklistData: {
    type: mongoose.Schema.Types.Mixed
  },
  UploadDateTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  }
}, {
  timestamps: true
});

// 複合索引
checkListSchema.index({ Login_ID: 1, UploadDateTime: -1 });

module.exports = mongoose.model('CheckList', checkListSchema);

