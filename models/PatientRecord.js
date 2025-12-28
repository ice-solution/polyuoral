const mongoose = require('mongoose');

// PatientRecord 作為主記錄，整合所有相關資料
const patientRecordSchema = new mongoose.Schema({
  // 關聯到 Patient
  patientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Patient',
    required: true,
    index: true
  },
  loginid: {
    type: String,
    required: true,
    index: true
  },
  UploadDateTime: {
    type: Date,
    required: true,
    default: Date.now,
    index: true
  },
  // Photos（必須存在）- 儲存圖片 URL 路徑
  Photos: {
    FacePhoto: {
      type: String,  // 圖片 URL 路徑
      default: null
    },
    TouguePhoto: {
      type: String,
      default: null
    },
    TeethEPhoto: {
      type: String,
      default: null
    },
    TeethInPhoto1: {
      type: String,
      default: null
    },
    TeethInPhoto2: {
      type: String,
      default: null
    },
    TeethInPhoto3: {
      type: String,
      default: null
    },
    TeethInPhoto4: {
      type: String,
      default: null
    }
  },
  // HRV 數據（可選）
  HRV: {
    RMSSD: Number,
    SDNN: Number,
    pNN50: Number,
    SD1: Number,
    SD2: Number,
    HeartBeat: [Number],
    Times: [Number],
    IBIms: [Number]
  },
  // GSR 數據（可選）
  GSR: {
    RawIndex: [Number],
    RawValue: [Number],
    RawTime: [Number],
    SCL: [Number]
  },
  // HRV2 數據（可選）
  HRV2: {
    RMSSD: Number,
    SDNN: Number,
    pNN50: Number,
    SD1: Number,
    SD2: Number,
    HeartBeat: [Number],
    Times: [Number],
    IBIms: [Number]
  },
  // GSR2 數據（可選）
  GSR2: {
    RawIndex: [Number],
    RawValue: [Number],
    RawTime: [Number],
    SCL: [Number]
  },
  // 把脈Data（可選）
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
  },
  // 建議（可選）
  Recommend: {
    type: String
  },
  // 檢查清單（可選）
  CheckList: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// 複合索引：方便查詢特定病人的記錄
patientRecordSchema.index({ loginid: 1, UploadDateTime: -1 });
patientRecordSchema.index({ patientId: 1, UploadDateTime: -1 });

// 驗證：確保 Photos 必須存在，且至少有一張照片
patientRecordSchema.pre('save', function(next) {
  if (!this.Photos || Object.keys(this.Photos).length === 0) {
    return next(new Error('Photos are required. At least one photo must be uploaded.'));
  }
  
  // 檢查是否至少有一張照片有資料（現在是 URL 字串）
  const photoFields = ['FacePhoto', 'TouguePhoto', 'TeethEPhoto', 'TeethInPhoto1', 'TeethInPhoto2', 'TeethInPhoto3', 'TeethInPhoto4'];
  const hasAtLeastOnePhoto = photoFields.some(field => {
    const photo = this.Photos[field];
    return photo && typeof photo === 'string' && photo.length > 0;
  });
  
  if (!hasAtLeastOnePhoto) {
    return next(new Error('At least one photo must be uploaded. Photos are required.'));
  }
  
  next();
});

module.exports = mongoose.model('PatientRecord', patientRecordSchema);

