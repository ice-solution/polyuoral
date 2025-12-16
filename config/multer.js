const multer = require('multer');
const path = require('path');
const fs = require('fs');

// 上傳目錄
const UPLOAD_DIR = path.join(__dirname, '..', 'public');

// 確保 public 目錄存在
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// 設定儲存
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // 根據 patientId 建立資料夾
    const patientId = req.body.patientId || req.params.patientId || 'default';
    const patientDir = path.join(UPLOAD_DIR, patientId);
    
    // 確保病人資料夾存在
    if (!fs.existsSync(patientDir)) {
      fs.mkdirSync(patientDir, { recursive: true });
    }
    
    cb(null, patientDir);
  },
  filename: function (req, file, cb) {
    // 檔案名稱格式: {fieldname}_{timestamp}.{ext}
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${file.fieldname}_${uniqueSuffix}${ext}`;
    cb(null, filename);
  }
});

// 檔案過濾器（只允許圖片）
const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif|bmp|tiff|webp/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('只允許上傳圖片檔案 (jpeg, jpg, png, gif, bmp, tiff, webp)'));
  }
};

// Multer 設定
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB
  },
  fileFilter: fileFilter
});

// 多檔案上傳（7張照片）
const uploadPhotos = upload.fields([
  { name: 'FacePhoto', maxCount: 1 },
  { name: 'TouguePhoto', maxCount: 1 },
  { name: 'TeethEPhoto', maxCount: 1 },
  { name: 'TeethInPhoto1', maxCount: 1 },
  { name: 'TeethInPhoto2', maxCount: 1 },
  { name: 'TeethInPhoto3', maxCount: 1 },
  { name: 'TeethInPhoto4', maxCount: 1 }
]);

module.exports = {
  upload,
  uploadPhotos
};

