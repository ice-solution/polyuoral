#!/bin/bash
# 驗證構建環境變數腳本

echo "🔍 檢查構建環境配置..."
echo ""

# 1. 檢查 .env.production 是否存在
if [ -f ".env.production" ]; then
    echo "✅ .env.production 文件存在"
    echo ""
    echo "📄 文件內容："
    cat .env.production
    echo ""
else
    echo "❌ .env.production 文件不存在"
    echo "   請創建 .env.production 文件"
    exit 1
fi

# 2. 檢查是否包含 REACT_APP_API_URL
if grep -q "REACT_APP_API_URL" .env.production; then
    API_URL=$(grep "REACT_APP_API_URL" .env.production | cut -d '=' -f2)
    echo "✅ 找到 REACT_APP_API_URL: $API_URL"
    echo ""
else
    echo "❌ .env.production 中沒有找到 REACT_APP_API_URL"
    exit 1
fi

# 3. 檢查是否包含生產環境 URL
if echo "$API_URL" | grep -q "polyu.ice-solution.hk"; then
    echo "✅ 使用生產環境 URL: $API_URL"
else
    echo "⚠️  警告: API URL 似乎不是生產環境 URL"
    echo "   當前 URL: $API_URL"
fi

echo ""
echo "📦 開始構建（會自動使用 .env.production）..."
echo ""

# 4. 執行構建
npm run build

echo ""
echo "🔍 驗證構建結果..."
echo ""

# 5. 檢查構建文件中的 URL
if [ -d "build/static/js" ]; then
    echo "檢查構建文件中的 API URL..."
    
    # 查找生產環境 URL
    if grep -r "polyu.ice-solution.hk" build/static/js/*.js > /dev/null 2>&1; then
        echo "✅ 構建文件中包含生產環境 URL"
        echo ""
        echo "找到的 URL："
        grep -o "polyu.ice-solution.hk[^\"]*" build/static/js/*.js | head -3
    else
        echo "❌ 構建文件中沒有找到生產環境 URL"
    fi
    
    # 檢查是否包含開發環境 URL（不應該有）
    if grep -r "localhost:3000\|localhost:3101" build/static/js/*.js > /dev/null 2>&1; then
        echo "⚠️  警告: 構建文件中包含開發環境 URL（localhost）"
        echo "   這可能表示使用了錯誤的環境變數"
    else
        echo "✅ 構建文件中沒有開發環境 URL"
    fi
else
    echo "❌ build/static/js 目錄不存在，構建可能失敗"
fi

echo ""
echo "✨ 驗證完成！"

