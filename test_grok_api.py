#!/usr/bin/env python3
"""
測試 Grok API 連線
用於診斷 API 被拒絕的問題
"""
import os
import sys
import requests
import json

# 載入環境變數
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[Warning] python-dotenv not installed. Using system environment variables only.")

# API 設定
API_KEY = os.getenv("GROK_API_KEY", os.getenv("CHATGPT_API_KEY", ""))
ENDPOINT = os.getenv("GROK_ENDPOINT", "https://api.x.ai/v1/chat/completions")
MODEL = os.getenv("GROK_MODEL", "grok-4-1-fast-reasoning")

def test_api():
    """測試 Grok API 連線"""
    print("=" * 60)
    print("Grok API 連線測試")
    print("=" * 60)
    
    # 1. 檢查 API Key
    if not API_KEY:
        print("❌ 錯誤：GROK_API_KEY 未設定")
        print("\n請在 .env 檔案中設定：")
        print("GROK_API_KEY=xai-您的API金鑰")
        return False
    
    print(f"✅ API Key 已設定: {API_KEY[:20]}...")
    
    # 2. 檢查 API Key 格式
    if not API_KEY.startswith("xai-"):
        print(f"⚠️  警告：API Key 格式可能不正確（應以 'xai-' 開頭）")
        print(f"   當前格式: {API_KEY[:10]}...")
    else:
        print("✅ API Key 格式正確")
    
    # 3. 檢查端點
    print(f"✅ 端點: {ENDPOINT}")
    print(f"✅ 模型: {MODEL}")
    
    # 4. 準備請求
    headers = {
        "Authorization": f"Bearer {API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": MODEL,
        "messages": [
            {
                "role": "user",
                "content": "Hello, this is a test. Please respond with 'API is working correctly'."
            }
        ],
        "temperature": 0.4
    }
    
    # 5. 發送請求
    print("\n" + "=" * 60)
    print("發送測試請求...")
    print("=" * 60)
    
    try:
        r = requests.post(ENDPOINT, headers=headers, json=data, timeout=30)
        
        print(f"\n狀態碼: {r.status_code}")
        
        if r.status_code == 200:
            result = r.json()
            print("✅ API 連線成功！")
            print(f"\n回應內容:")
            print(f"  {result['choices'][0]['message']['content']}")
            return True
        else:
            print(f"❌ API 請求失敗")
            print(f"\n錯誤詳情:")
            print(f"  狀態碼: {r.status_code}")
            print(f"  回應標頭: {dict(r.headers)}")
            
            try:
                error_data = r.json()
                print(f"  錯誤訊息: {json.dumps(error_data, indent=2, ensure_ascii=False)}")
            except:
                print(f"  回應內容: {r.text}")
            
            # 提供建議
            print("\n" + "=" * 60)
            print("建議解決方法:")
            print("=" * 60)
            
            if r.status_code == 401:
                print("1. 檢查 API Key 是否正確")
                print("2. 確認 API Key 沒有過期或被撤銷")
                print("3. 重新生成 API Key: https://x.ai/")
            elif r.status_code == 403:
                print("1. 檢查帳號是否有 API 存取權限")
                print("2. 確認帳號狀態: https://x.ai/")
            elif r.status_code == 404:
                print("1. 檢查模型名稱是否正確")
                print("2. 嘗試其他模型: grok-beta")
            elif r.status_code == 429:
                print("1. 請求過於頻繁，請稍後再試")
                print("2. 檢查 API 使用配額")
            else:
                print("1. 檢查網路連接")
                print("2. 稍後再試")
                print("3. 聯繫 x.ai 支援")
            
            return False
            
    except requests.exceptions.Timeout:
        print("❌ 請求超時")
        print("   請檢查網路連接或稍後再試")
        return False
    except requests.exceptions.ConnectionError:
        print("❌ 連線錯誤")
        print("   無法連接到 API 伺服器")
        print("   請檢查網路連接")
        return False
    except Exception as e:
        print(f"❌ 發生錯誤: {type(e).__name__}")
        print(f"   錯誤訊息: {str(e)}")
        return False

if __name__ == "__main__":
    success = test_api()
    sys.exit(0 if success else 1)


