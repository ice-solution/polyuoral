const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const PatientRecord = require('../models/PatientRecord');
const Patient = require('../models/Patient');

const execAsync = promisify(exec);

// 臨時檔案資料夾
const TEMP_FOLDER = path.join(__dirname, '..', 'temp');
const OUTPUT_FOLDER = path.join(__dirname, '..', 'outputs');

// 確保資料夾存在
(async () => {
  try {
    await fs.mkdir(TEMP_FOLDER, { recursive: true });
    await fs.mkdir(OUTPUT_FOLDER, { recursive: true });
  } catch (error) {
    console.error('Error creating folders:', error);
  }
})();

// 生成 PDF 報告
router.get('/:patientId/:recordId', async (req, res) => {
  try {
    const { patientId, recordId } = req.params;
    const { language = 'en' } = req.query;

    // 1. 查詢 PatientRecord
    const record = await PatientRecord.findOne({
      _id: recordId,
      patientId: patientId
    }).populate('patientId', '-Password');

    if (!record) {
      return res.status(404).json({
        error: 'Record not found',
        message: '找不到指定的病人記錄'
      });
    }

    // 2. 檢查是否有 FacePhoto
    if (!record.Photos || !record.Photos.FacePhoto) {
      return res.status(400).json({
        error: 'FacePhoto not found',
        message: '此記錄中沒有 FacePhoto'
      });
    }

    // 3. 從 URL 取得圖片檔案路徑
    const photoUrl = record.Photos.FacePhoto;
    const photoPath = path.join(__dirname, '..', photoUrl);
    
    // 檢查檔案是否存在
    try {
      await fs.access(photoPath);
    } catch (error) {
      return res.status(404).json({
        error: 'Photo file not found',
        message: '圖片檔案不存在',
        path: photoPath
      });
    }

    // 複製到臨時資料夾（Python 腳本需要）
    const tempImagePath = path.join(TEMP_FOLDER, `face_${recordId}_${Date.now()}${path.extname(photoPath)}`);
    await fs.copyFile(photoPath, tempImagePath);

    // 4. 生成 PDF 檔案路徑
    const pdfFileName = `report_${patientId}_${recordId}_${Date.now()}.pdf`;
    const pdfPath = path.join(OUTPUT_FOLDER, pdfFileName);

    // 5. 呼叫 Python 腳本生成 PDF
    const pythonScript = path.join(__dirname, '..', 'generate_report.py');
    // 使用虛擬環境中的 Python（如果存在），否則使用系統 Python
    const venvPython = path.join(__dirname, '..', 'venv', 'bin', 'python3');
    const pythonCmd = require('fs').existsSync(venvPython) ? venvPython : 'python3';
    
    // 設置環境變數（從 process.env 傳遞給 Python 腳本）
    const roboflowApiKey = process.env.ROBOFLOW_API_KEY || '';
    const workspaceName = process.env.WORKSPACE_NAME || '';
    const workflowId = process.env.WORKFLOW_ID || '';
    
    // 調試：檢查環境變數（不顯示完整 key）
    const maskedKey = roboflowApiKey ? `${roboflowApiKey.substring(0, 4)}...${roboflowApiKey.substring(roboflowApiKey.length - 4)}` : 'NOT SET';
    console.log(`[Report] Environment variables check:`);
    console.log(`[Report]   ROBOFLOW_API_KEY: ${maskedKey}`);
    console.log(`[Report]   WORKSPACE_NAME: ${workspaceName}`);
    console.log(`[Report]   WORKFLOW_ID: ${workflowId}`);
    
    const env = {
      ...process.env,
      ROBOFLOW_API_KEY: roboflowApiKey,
      WORKSPACE_NAME: workspaceName,
      WORKFLOW_ID: workflowId,
      GROK_API_KEY: process.env.GROK_API_KEY || process.env.CHATGPT_API_KEY || '',
      GROK_ENDPOINT: process.env.GROK_ENDPOINT || 'https://api.x.ai/v1/chat/completions',
      GROK_MODEL: process.env.GROK_MODEL || 'grok-4-1-fast-reasoning',
      REPORT_LANGUAGE: language
    };
    
    const command = `"${pythonCmd}" "${pythonScript}" "${tempImagePath}" "${pdfPath}" "${language}"`;

    console.log(`[Report] Executing: ${command}`);

    try {
      const { stdout, stderr } = await execAsync(command, {
        timeout: 300000, // 5 分鐘超時
        maxBuffer: 10 * 1024 * 1024, // 10MB buffer
        env: env // 傳遞環境變數
      });

      // 將 stderr 也記錄下來（可能包含有用的錯誤信息）
      if (stderr) {
        console.error('[Report] Python stderr:', stderr);
      }
      
      // 檢查 stdout 是否為空
      const stdoutTrimmed = stdout.trim();
      if (!stdoutTrimmed) {
        throw new Error(`Python script returned no output. stderr: ${stderr || 'none'}`);
      }

      // 解析 Python 腳本的 JSON 輸出
      let result;
      try {
        result = JSON.parse(stdoutTrimmed);
      } catch (parseError) {
        console.error('[Report] Failed to parse Python output:', stdoutTrimmed);
        console.error('[Report] stderr:', stderr);
        throw new Error(`Failed to parse Python script output: ${parseError.message}. Output: ${stdoutTrimmed.substring(0, 200)}`);
      }

      if (result.error) {
        // 清理臨時檔案
        try {
          await fs.unlink(tempImagePath);
        } catch (e) {}

        return res.status(500).json({
          error: 'PDF generation failed',
          message: result.error
        });
      }

      // 6. 檢查 PDF 是否生成成功
      try {
        await fs.access(pdfPath);
      } catch (error) {
        // 清理臨時檔案
        try {
          await fs.unlink(tempImagePath);
        } catch (e) {}

        return res.status(500).json({
          error: 'PDF file not created',
          message: 'PDF 檔案生成失敗'
        });
      }

      // 7. 讀取 PDF 檔案
      const pdfBuffer = await fs.readFile(pdfPath);

      // 8. 清理臨時檔案
      try {
        await fs.unlink(tempImagePath);
        // 可選：也可以刪除 PDF 檔案（如果不需要保留）
        // await fs.unlink(pdfPath);
      } catch (e) {
        console.warn('[Report] Failed to cleanup temp files:', e);
      }

      // 9. 返回 PDF
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${pdfFileName}"`);
      res.send(pdfBuffer);

    } catch (execError) {
      // 清理臨時檔案
      try {
        await fs.unlink(tempImagePath);
      } catch (e) {}

      console.error('[Report] Python execution error:', execError);

      return res.status(500).json({
        error: 'Python script execution failed',
        message: execError.message,
        details: execError.stderr || execError.stdout
      });
    }

  } catch (error) {
    console.error('[Report] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// 取得報告狀態（檢查記錄是否存在）
router.get('/:patientId/:recordId/status', async (req, res) => {
  try {
    const { patientId, recordId } = req.params;

    const record = await PatientRecord.findOne({
      _id: recordId,
      patientId: patientId
    }).select('Photos.FacePhoto loginid');

    if (!record) {
      return res.status(404).json({
        exists: false,
        hasFacePhoto: false
      });
    }

    res.json({
      exists: true,
      hasFacePhoto: !!(record.Photos && record.Photos.FacePhoto)
    });
  } catch (error) {
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

module.exports = router;

