const mongoose = require('mongoose');

const photosSchema = new mongoose.Schema({
  Login_ID: {
    type: String,
    required: true,
    index: true
  },
  FacePhoto: {
    type: Buffer,
    contentType: String
  },
  TouguePhoto: {
    type: Buffer,
    contentType: String
  },
  TeethEPhoto: {
    type: Buffer,
    contentType: String
  },
  TeethInPhoto1: {
    type: Buffer,
    contentType: String
  },
  TeethInPhoto2: {
    type: Buffer,
    contentType: String
  },
  TeethInPhoto3: {
    type: Buffer,
    contentType: String
  },
  TeethInPhoto4: {
    type: Buffer,
    contentType: String
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
photosSchema.index({ Login_ID: 1, UploadDateTime: -1 });

module.exports = mongoose.model('Photos', photosSchema);

