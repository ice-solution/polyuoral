const express = require('express');
const cors = require('cors');
require('dotenv').config();
const connectDB = require('./config/database');

// 檢查必要的環境變數
const requiredEnvVars = ['MONGODB_URI', 'JWT_SECRET'];
const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
  console.error('❌ Missing required environment variables:');
  missingEnvVars.forEach(varName => {
    console.error(`   - ${varName}`);
  });
  console.error('\n請檢查 .env 檔案是否正確設定。');
  process.exit(1);
}

// 連接資料庫
connectDB();

const app = express();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' })); // 增加限制以支援圖片上傳
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 靜態檔案服務 - 提供圖片存取
app.use('/public', express.static('public'));

// Routes
app.use('/api/auth', require('./routes/authRoutes')); // 認證路由（登入、登出、驗證）
app.use('/api/patients', require('./routes/patientRoutes'));
app.use('/api/patient-records', require('./routes/patientRecordRoutes')); // 主要使用的 API
app.use('/api/data-records', require('./routes/dataRecordRoutes')); // 保留作為備用
app.use('/api/photos', require('./routes/photosRoutes')); // 保留作為備用
app.use('/api/recommends', require('./routes/recommendRoutes'));
app.use('/api/checklists', require('./routes/checkListRoutes'));
app.use('/api/report', require('./routes/reportRoutes')); // PDF 報告生成

// 根路由
app.get('/', (req, res) => {
  res.json({ message: 'PolyU Oral Health Data API' });
});

// 從環境變數讀取 PORT，如果沒有則使用預設值 3000
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
});

