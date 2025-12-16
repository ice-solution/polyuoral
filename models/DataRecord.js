const mongoose = require('mongoose');

// 統一的數據記錄 Schema
// 使用 type 欄位來區分 HRV、GSR、把脈Data
const dataRecordSchema = new mongoose.Schema({
  Login_ID: {
    type: String,
    required: true,
    index: true
  },
  type: {
    type: String,
    required: true,
    enum: ['HRV', 'GSR', 'Pulse'],
    index: true
  },
  UploadDateTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  // HRV 數據
  HRV: {
    minRRI: Number,
    LF: Number,
    HF: Number,
    HRV: Number,
    RMSSD: Number,
    pNN50: Number,
    SDNN: Number,
    SD1: Number,
    SD2: Number,
    SDPoint: [{
      x: Number,
      y: Number
    }]
  },
  // GSR 數據
  GSR: {
    RawData: [Number],
    RawDataTime: [Number],
    SCL: [Number],
    SCR: [Number],
    numOfPeak: Number
  },
  // 把脈Data
  Pulse: {
    Data_1_L: Number,
    Data_2_L: Number,
    Data_3_L: Number,
    Data_4_L: Number,
    Data_5_L: Number,
    Data_6_L: Number,
    Data_7_L: Number,
    Data_8_L: Number,
    Data_9_L: Number,
    Data_10_L: Number,
    Data_11_L: Number,
    Data_12_L: Number,
    Data_1_R: Number,
    Data_2_R: Number,
    Data_3_R: Number,
    Data_4_R: Number,
    Data_5_R: Number,
    Data_6_R: Number,
    Data_7_R: Number,
    Data_8_R: Number,
    Data_9_R: Number,
    Data_10_R: Number,
    Data_11_R: Number,
    Data_12_R: Number
  }
}, {
  timestamps: true
});

// 複合索引：方便查詢特定病人的特定類型數據
dataRecordSchema.index({ Login_ID: 1, type: 1, UploadDateTime: -1 });

// 驗證：確保根據 type 只填寫對應的數據欄位
dataRecordSchema.pre('save', function(next) {
  if (this.type === 'HRV' && !this.HRV) {
    return next(new Error('HRV type requires HRV data'));
  }
  if (this.type === 'GSR' && !this.GSR) {
    return next(new Error('GSR type requires GSR data'));
  }
  if (this.type === 'Pulse' && !this.Pulse) {
    return next(new Error('Pulse type requires Pulse data'));
  }
  next();
});

module.exports = mongoose.model('DataRecord', dataRecordSchema);

