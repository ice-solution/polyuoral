const mongoose = require('mongoose');

const patientSchema = new mongoose.Schema({
  loginid: {
    type: String,
    required: true,
    unique: true,
    index: true
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
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Patient', patientSchema);


