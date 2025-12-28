const FormData = require('form-data');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

// 創建簡單的測試圖片（1x1 像素的 PNG）
const createTestImage = (filename) => {
  // 1x1 像素的透明 PNG (base64)
  const base64Image = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';
  const imageBuffer = Buffer.from(base64Image, 'base64');
  const filePath = path.join(__dirname, 'test_images', filename);
  
  // 確保目錄存在
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  
  fs.writeFileSync(filePath, imageBuffer);
  return filePath;
};

// 創建測試圖片
const facePhoto = createTestImage('face.jpg');
const touguePhoto = createTestImage('tongue.jpg');
const teethEPhoto = createTestImage('teeth_e.jpg');

// 準備數據
const loginid = 'balbal12345';
const API_URL = process.env.API_URL || 'http://localhost:3101/api';

// HRV 數據（約4個數字，有小數點）
const HRV = {
  RMSSD: 25.5,
  SDNN: 40.2,
  pNN50: 10.8,
  SD1: 20.3,
  SD2: 30.7,
  HeartBeat: [60.5, 65.2, 70.8, 75.3],
  Times: [0.1, 0.2, 0.3, 0.4],
  IBIms: [1000.5, 950.2, 900.8, 850.3]
};

// HRV2 數據
const HRV2 = {
  RMSSD: 28.6,
  SDNN: 42.4,
  pNN50: 12.1,
  SD1: 22.5,
  SD2: 32.9,
  HeartBeat: [62.3, 67.1, 72.6, 77.4],
  Times: [0.15, 0.25, 0.35, 0.45],
  IBIms: [980.4, 930.7, 880.1, 830.6]
};

// GSR 數據（約4個數字，有小數點）
const GSR = {
  RawIndex: [0, 1, 2, 3],
  RawValue: [100.5, 200.3, 300.7, 400.2],
  RawTime: [0.1, 0.2, 0.3, 0.4],
  SCL: [1.5, 1.6, 1.7, 1.8]
};

// GSR2 數據
const GSR2 = {
  RawIndex: [0, 1, 2, 3],
  RawValue: [110.2, 210.8, 310.4, 410.9],
  RawTime: [0.15, 0.25, 0.35, 0.45],
  SCL: [1.55, 1.65, 1.75, 1.85]
};

// 創建 FormData
const formData = new FormData();
formData.append('loginid', loginid);
formData.append('FacePhoto', fs.createReadStream(facePhoto));
formData.append('TouguePhoto', fs.createReadStream(touguePhoto));
formData.append('TeethEPhoto', fs.createReadStream(teethEPhoto));
formData.append('HRV', JSON.stringify(HRV));
formData.append('HRV2', JSON.stringify(HRV2));
formData.append('GSR', JSON.stringify(GSR));
formData.append('GSR2', JSON.stringify(GSR2));

// 發送請求
console.log('📤 正在創建測試記錄...');
console.log('   loginid:', loginid);
console.log('   API URL:', `${API_URL}/patient-records`);
console.log('   HRV:', JSON.stringify(HRV, null, 2));
console.log('   HRV2:', JSON.stringify(HRV2, null, 2));
console.log('   GSR:', JSON.stringify(GSR, null, 2));
console.log('   GSR2:', JSON.stringify(GSR2, null, 2));

axios.post(`${API_URL}/patient-records`, formData, {
  headers: {
    ...formData.getHeaders(),
  },
  maxContentLength: Infinity,
  maxBodyLength: Infinity,
})
.then(response => {
  console.log('\n✅ 記錄創建成功！');
  console.log('📋 記錄 ID:', response.data.record._id);
  console.log('📸 照片:', Object.keys(response.data.record.Photos || {}));
  console.log('📊 數據:', {
    hasHRV: !!response.data.record.HRV,
    hasHRV2: !!response.data.record.HRV2,
    hasGSR: !!response.data.record.GSR,
    hasGSR2: !!response.data.record.GSR2
  });
  console.log('\n完整記錄:', JSON.stringify(response.data.record, null, 2));
  process.exit(0);
})
.catch(error => {
  console.error('\n❌ 創建記錄失敗:');
  if (error.response) {
    console.error('   狀態碼:', error.response.status);
    console.error('   錯誤信息:', error.response.data);
  } else {
    console.error('   錯誤:', error.message);
  }
  process.exit(1);
});

