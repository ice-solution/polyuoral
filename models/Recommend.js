const mongoose = require('mongoose');

const recommendSchema = new mongoose.Schema({
  loginid: {
    type: String,
    required: true,
    index: true
  },
  Recommend: {
    type: String,
    required: true
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
recommendSchema.index({ loginid: 1, UploadDateTime: -1 });

module.exports = mongoose.model('Recommend', recommendSchema);


