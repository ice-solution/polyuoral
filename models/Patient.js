const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  loginid: {
    type: String,
    required: [true, 'loginid is required'],
    unique: true,
    index: true,
    trim: true,
    validate: {
      validator: function(v) {
        return v != null && v.trim() !== '';
      },
      message: 'loginid cannot be empty or null'
    }
  },
  Password: {
    type: String,
    required: true
  },
  Name_CN: {
    type: String,
    required: true
  },
  Name_EN: {
    type: String,
    required: true
  },
  Age: {
    type: Number,
    required: true
  },
  Month: {
    type: Number,
    required: true
  },
  Email: {
    type: String,
    required: true
  },
  PhoneNumber: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive'],
    default: 'active',
    index: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);


