/**
 * 清理數據庫中的舊索引和字段
 * 運行方式: node cleanup_old_indexes.js
 */

const mongoose = require('mongoose');
require('dotenv').config();

const Patient = require('./models/Patient');

async function cleanupDatabase() {
  try {
    // 連接數據庫
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/ployu_oral_dev';
    await mongoose.connect(mongoUri);
    console.log('✅ 已連接到數據庫');

    const db = mongoose.connection.db;
    const collection = db.collection('patients');

    // 1. 列出所有索引
    console.log('\n📋 當前索引列表:');
    const indexes = await collection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // 2. 檢查是否有 Login_ID 索引
    const loginIdIndex = indexes.find(idx => 
      idx.name === 'Login_ID_1' || 
      Object.keys(idx.key).includes('Login_ID')
    );

    if (loginIdIndex) {
      console.log('\n⚠️  發現舊的 Login_ID 索引，準備刪除...');
      
      try {
        // 刪除舊索引
        await collection.dropIndex('Login_ID_1');
        console.log('✅ 已刪除 Login_ID_1 索引');
      } catch (err) {
        if (err.code === 27) {
          console.log('ℹ️  索引 Login_ID_1 不存在（可能已刪除）');
        } else {
          console.error('❌ 刪除索引時出錯:', err.message);
        }
      }

      // 嘗試刪除其他可能的 Login_ID 相關索引
      try {
        await collection.dropIndex({ Login_ID: 1 });
        console.log('✅ 已刪除 Login_ID 索引');
      } catch (err) {
        if (err.code === 27) {
          console.log('ℹ️  索引 Login_ID 不存在');
        }
      }
    } else {
      console.log('\n✅ 沒有發現 Login_ID 索引');
    }

    // 3. 檢查並清理舊的 Login_ID 字段
    console.log('\n🔍 檢查數據中的 Login_ID 字段...');
    const patientsWithOldField = await collection.find({ Login_ID: { $exists: true } }).toArray();
    
    if (patientsWithOldField.length > 0) {
      console.log(`⚠️  發現 ${patientsWithOldField.length} 筆記錄包含舊的 Login_ID 字段`);
      
      // 移除舊字段
      const result = await collection.updateMany(
        { Login_ID: { $exists: true } },
        { $unset: { Login_ID: "" } }
      );
      console.log(`✅ 已從 ${result.modifiedCount} 筆記錄中移除 Login_ID 字段`);
    } else {
      console.log('✅ 沒有發現包含 Login_ID 字段的記錄');
    }

    // 4. 檢查是否有 loginid 為 null 或空的記錄
    console.log('\n🔍 檢查 loginid 為 null 或空的記錄...');
    const patientsWithoutLoginid = await collection.find({
      $or: [
        { loginid: null },
        { loginid: { $exists: false } },
        { loginid: "" }
      ]
    }).toArray();

    if (patientsWithoutLoginid.length > 0) {
      console.log(`⚠️  發現 ${patientsWithoutLoginid.length} 筆記錄沒有有效的 loginid`);
      
      // 為這些記錄生成 loginid
      for (const patient of patientsWithoutLoginid) {
        const newLoginid = `migrated_${patient._id}_${Date.now()}`;
        await collection.updateOne(
          { _id: patient._id },
          { $set: { loginid: newLoginid } }
        );
        console.log(`  ✅ 為記錄 ${patient._id} 設置 loginid: ${newLoginid}`);
      }
    } else {
      console.log('✅ 所有記錄都有有效的 loginid');
    }

    // 5. 顯示最終的索引列表
    console.log('\n📋 最終索引列表:');
    const finalIndexes = await collection.indexes();
    finalIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    console.log('\n✅ 清理完成！');
    
  } catch (error) {
    console.error('❌ 清理過程中出錯:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 已關閉數據庫連接');
  }
}

// 運行清理
cleanupDatabase();


