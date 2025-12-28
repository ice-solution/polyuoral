const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
require('dotenv').config();
const connectDB = require('./config/database');
const Patient = require('./models/Patient');

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

// 初始化預設 admin 帳號
const initAdminAccount = async () => {
  try {
    // 等待資料庫連接
    if (mongoose.connection.readyState !== 1) {
      // 如果資料庫還沒連接，等待連接完成
      await new Promise((resolve) => {
        if (mongoose.connection.readyState === 1) {
          resolve();
        } else {
          mongoose.connection.once('connected', resolve);
        }
      });
    }

    const adminLoginId = 'admin';
    const existingAdmin = await Patient.findOne({ loginid: adminLoginId });

    if (!existingAdmin) {
      // 創建預設 admin 帳號
      const defaultPassword = 'admin123';
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(defaultPassword, salt);

      const admin = new Patient({
        loginid: adminLoginId,
        Password: hashedPassword,
        Name_CN: '系統管理員',
        Name_EN: 'System Administrator',
        Age: 0,
        Month: 0,
        Email: 'admin@polyu.edu.hk',
        PhoneNumber: '00000000'
      });

      await admin.save();
      console.log('\n✅ 預設管理員帳號已創建');
      console.log(`   📧 登入帳號: ${adminLoginId}`);
      console.log(`   🔑 密碼: ${defaultPassword}`);
      console.log('   ⚠️  請在首次登入後立即更改密碼！\n');
    } else {
      console.log('ℹ️  管理員帳號已存在\n');
    }
  } catch (error) {
    console.error('❌ 初始化管理員帳號時發生錯誤:', error.message);
  }
};

// 在資料庫連接後初始化 admin 帳號
mongoose.connection.once('connected', () => {
  initAdminAccount();
});

// 如果資料庫已經連接，直接初始化
if (mongoose.connection.readyState === 1) {
  initAdminAccount();
}

const app = express();

// Middleware
app.use(cors());

// 調試中間件：記錄所有請求頭（僅在開發環境）
if (process.env.NODE_ENV === 'development') {
  app.use((req, res, next) => {
    try {
      const headerSize = JSON.stringify(req.headers).length;
      const headerKeys = Object.keys(req.headers);
      
      console.log(`\n📥 收到請求: ${req.method} ${req.url}`);
      console.log(`📏 請求頭大小: ${headerSize} bytes (${(headerSize / 1024).toFixed(2)} KB)`);
      console.log(`🔑 請求頭數量: ${headerKeys.length}`);
      
      // 檢查每個請求頭的大小
      const largeHeaders = [];
      headerKeys.forEach(key => {
        const value = req.headers[key];
        const size = typeof value === 'string' ? value.length : JSON.stringify(value).length;
        if (size > 1000) {
          largeHeaders.push({ key, size });
        }
      });
      
      if (largeHeaders.length > 0) {
        console.warn('⚠️  發現大的請求頭:');
        largeHeaders.forEach(({ key, size }) => {
          console.warn(`   ${key}: ${size} bytes (${(size / 1024).toFixed(2)} KB)`);
        });
      }
      
      if (headerSize > 8000) {
        console.warn('⚠️  請求頭總大小超過 8KB！');
      }
    } catch (err) {
      console.error('讀取請求頭時出錯:', err.message);
    }
    next();
  });
}

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

// 創建 HTTP 服務器並增加請求頭大小限制
const http = require('http');

// 在創建服務器之前設置全局選項
process.env.NODE_OPTIONS = process.env.NODE_OPTIONS 
  ? `${process.env.NODE_OPTIONS} --max-http-header-size=131072`
  : '--max-http-header-size=131072';

const server = http.createServer({
  maxHeaderSize: 131072, // 128KB (默認是 8KB，增加到 128KB)
  // 增加其他限制
  keepAliveTimeout: 65000,
  headersTimeout: 66000
}, app);

// 處理 431 錯誤和其他客戶端錯誤
server.on('clientError', (err, socket) => {
  if (err.code === 'HPE_HEADER_OVERFLOW' || err.message?.includes('header')) {
    console.error('❌ 請求頭過大錯誤 (431)');
    console.error('錯誤詳情:', err.message);
    console.error('錯誤代碼:', err.code);
    socket.end('HTTP/1.1 431 Request Header Fields Too Large\r\n\r\n');
  } else {
    console.error('客戶端錯誤:', err.message);
    socket.end('HTTP/1.1 400 Bad Request\r\n\r\n');
  }
});

// 監聽錯誤事件
server.on('error', (err) => {
  console.error('服務器錯誤:', err);
});

// 啟動伺服器
server.listen(PORT, () => {
  console.log(`🚀 Server is running on port ${PORT}`);
  console.log(`📝 Environment: ${NODE_ENV}`);
  console.log(`🌐 API URL: http://localhost:${PORT}`);
});

