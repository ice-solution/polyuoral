#!/usr/bin/env python3
"""
簡化版的報告生成腳本，用於 API 呼叫
接收圖片路徑，生成 PDF 報告，返回 PDF 路徑
"""
import os
import sys
import json
import base64
import cv2
import numpy as np
import requests
from fpdf import FPDF
try:
    from inference_sdk import InferenceHTTPClient
except ImportError:
    # 如果 inference_sdk 不可用，嘗試使用 requests 直接調用 API
    InferenceHTTPClient = None
from fpdf.enums import XPos, YPos

# API 設定
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")
WORKSPACE_NAME = os.getenv("WORKSPACE_NAME", "")
WORKFLOW_ID = os.getenv("WORKFLOW_ID", "")

# 調試：檢查環境變數是否正確讀取（不顯示完整 key，只顯示前後幾位）
if ROBOFLOW_API_KEY:
    masked_key = f"{ROBOFLOW_API_KEY[:4]}...{ROBOFLOW_API_KEY[-4:]}" if len(ROBOFLOW_API_KEY) > 8 else "***"
    print(f"[DEBUG] ROBOFLOW_API_KEY loaded: {masked_key}", file=sys.stderr)
else:
    print("[DEBUG] ROBOFLOW_API_KEY is empty or not set", file=sys.stderr)

print(f"[DEBUG] WORKSPACE_NAME: {WORKSPACE_NAME}", file=sys.stderr)
print(f"[DEBUG] WORKFLOW_ID: {WORKFLOW_ID}", file=sys.stderr)

# Grok API 設定（使用 x.ai）
GROK_API_KEY = os.getenv("GROK_API_KEY", os.getenv("CHATGPT_API_KEY", ""))  # 支援舊的環境變數名稱
GROK_ENDPOINT = os.getenv("GROK_ENDPOINT", "https://api.x.ai/v1/chat/completions")
GROK_MODEL = os.getenv("GROK_MODEL", "grok-4-1-fast-reasoning")

# 輸出資料夾
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FOLDER = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_FOLDER, exist_ok=True)

QR_TRIGGER_COVERAGE = 10.0
QR_TRIGGER_PIXELS = 100
QR_DATA = "Brush Your Teeth Properly!"

# 語言設定（從環境變數或預設英文）
LANGUAGE = os.getenv("REPORT_LANGUAGE", "en")
LANG_MAP = {
    "en": "English",
    "zh": "中文 (简体)",
    "zh_tw": "中文 (繁體)",
    "ja": "日本語"
}

def decode_and_save(b64_string, name):
    """解碼 Base64 圖片並儲存"""
    img_bytes = base64.b64decode(b64_string.split(",")[-1])
    img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_arr, cv2.IMREAD_UNCHANGED)
    filename = os.path.join(OUTPUT_FOLDER, f"{name}.png")
    cv2.imwrite(filename, img)
    return filename

def run_roboflow(image_path):
    """執行 Roboflow 分析"""
    # 檢查必要的環境變數
    if not ROBOFLOW_API_KEY:
        raise ValueError("ROBOFLOW_API_KEY environment variable is not set")
    if not WORKSPACE_NAME:
        raise ValueError("WORKSPACE_NAME environment variable is not set")
    if not WORKFLOW_ID:
        raise ValueError("WORKFLOW_ID environment variable is not set")
    
    if InferenceHTTPClient is None:
        # 如果沒有 inference_sdk，使用 requests 直接調用 API
        import base64
        try:
            with open(image_path, "rb") as f:
                image_data = base64.b64encode(f.read()).decode("utf-8")
            
            url = f"https://serverless.roboflow.com/workflow/{WORKSPACE_NAME}/{WORKFLOW_ID}"
            headers = {
                "Authorization": f"Bearer {ROBOFLOW_API_KEY}",
                "Content-Type": "application/json"
            }
            data = {
                "image": f"data:image/jpeg;base64,{image_data}",
                "use_cache": True
            }
            
            response = requests.post(url, headers=headers, json=data, timeout=120)
            response.raise_for_status()
            result = response.json()
            
            saved_files = []
            if isinstance(result, list) and len(result) > 0:
                item = result[0]
                for key in ["polygon_visualization", "mask_visualization"]:
                    if key in item:
                        saved_files.append(decode_and_save(item[key], key))
            return saved_files
        except requests.exceptions.RequestException as e:
            error_msg = f"Roboflow API request failed: {str(e)}"
            if hasattr(e, 'response') and e.response is not None:
                try:
                    error_detail = e.response.json()
                    error_msg += f" - Response: {error_detail}"
                except:
                    error_msg += f" - Status: {e.response.status_code}, Body: {e.response.text[:200]}"
            raise Exception(error_msg) from e
    else:
        # 使用 inference_sdk
        try:
            client = InferenceHTTPClient(api_url="https://serverless.roboflow.com", api_key=ROBOFLOW_API_KEY)
            result = client.run_workflow(
                workspace_name=WORKSPACE_NAME,
                workflow_id=WORKFLOW_ID,
                images={"image": image_path},
                use_cache=True
            )
            saved_files = []
            item = result[0]
            for key in ["polygon_visualization", "mask_visualization"]:
                if key in item:
                    saved_files.append(decode_and_save(item[key], key))
            return saved_files
        except Exception as e:
            raise Exception(f"Roboflow inference_sdk failed: {str(e)}") from e

def calculate_plaque_area(mask_path):
    """計算牙菌斑面積"""
    mask = cv2.imread(mask_path)
    if mask is None: 
        return 0, 0.0
    hsv = cv2.cvtColor(mask, cv2.COLOR_BGR2HSV)
    purple_mask = cv2.inRange(hsv, np.array([120,40,40]), np.array([160,255,255]))
    plaque_area = cv2.countNonZero(purple_mask)
    total_area = mask.shape[0] * mask.shape[1]
    return plaque_area, (plaque_area / total_area) * 100

def ask_grok(image_files, lang="en"):
    """
    呼叫 Grok API 生成建議
    使用 Grok 模型: grok-4-1-fast-reasoning (OpenAI-compatible chat/completions)
    """
    if not GROK_API_KEY:
        return "Error: GROK_API_KEY not set. Please set GROK_API_KEY environment variable."
    
    lang_name = LANG_MAP.get(lang, "English")
    headers = {
        "Authorization": f"Bearer {GROK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    content = [{
        "type": "text",
        "text": (
            "You are a professional dentist. "
            "The attached images are AI-analyzed outputs from Roboflow: the purple mask highlights areas of dental plaque. "
            "Based on these plaque areas, explain to the patient what this means for their oral health and provide clear, "
            "step-by-step instructions on how to maintain proper oral hygiene. "
            f"Write your response in {lang_name}."
        )
    }]
    
    for img in image_files:
        with open(img, "rb") as f:
            b64_string = base64.b64encode(f.read()).decode("utf-8")
        content.append({
            "type": "image_url",
            "image_url": {"url": f"data:image/png;base64,{b64_string}"}
        })
    
    data = {
        "model": GROK_MODEL,
        "messages": [
            {"role": "user", "content": content}
        ],
        # Optional: keep responses consistent
        "temperature": 0.4
    }
    
    try:
        r = requests.post(GROK_ENDPOINT, headers=headers, json=data, timeout=120)
        
        if r.status_code != 200:
            # show server error body to help debug auth/endpoint/model issues
            return f"Error {r.status_code}: {r.text}"
        
        j = r.json()
        
        # OpenAI-compatible shape:
        # {"choices":[{"message":{"content":"..."}}]}
        try:
            return j["choices"][0]["message"]["content"]
        except Exception as e:
            return f"Unexpected response format: {j}"
            
    except requests.exceptions.Timeout:
        return "Error: Request timeout. The Grok API took too long to respond."
    except Exception as e:
        return f"Error calling Grok API: {str(e)}"

def get_or_make_qr():
    """取得或生成 QR 碼"""
    qr_path = os.path.join(BASE_DIR, "QR.png")
    if os.path.exists(qr_path):
        return qr_path
    try:
        import qrcode
        img = qrcode.make(QR_DATA)
        out_path = os.path.join(OUTPUT_FOLDER, "qr_generated.png")
        img.save(out_path)
        return out_path
    except Exception as e:
        print(f"[QR] Could not generate QR: {e}")
        return None

def create_pdf(image_files, grok_text, save_path, lang="en"):
    """生成 PDF 報告"""
    pdf = FPDF()
    pdf.add_page()
    
    # 設定字型（簡化版，使用預設字型）
    pdf.set_font("Arial", "", 16)
    pdf.cell(0, 10, "Oral Health Report", new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")
    
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 10, "Roboflow Analysis Images:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    for img in image_files:
        if os.path.exists(img):
            pdf.image(img, w=150)
            pdf.ln(10)
    
    pdf.add_page()
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 10, "Plaque Area:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    
    triggered_qr = False
    max_px_seen = 0
    max_pc_seen = 0.0
    
    for img in image_files:
        if "mask_visualization" in img and os.path.exists(img):
            px, pc = calculate_plaque_area(img)
            max_px_seen = max(max_px_seen, px)
            max_pc_seen = max(max_pc_seen, pc)
            if (pc >= QR_TRIGGER_COVERAGE) or (px >= QR_TRIGGER_PIXELS):
                triggered_qr = True
            
            pdf.multi_cell(
                0, 10,
                f"{os.path.basename(img)}:\n"
                f"- Pixels: {px}\n"
                f"- Coverage: {pc:.2f}%"
            )
    
    pdf.add_page()
    pdf.set_font("Arial", "", 12)
    pdf.cell(0, 10, "AI Recommendations:", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.multi_cell(0, 10, grok_text)
    
    if triggered_qr:
        qr_path = get_or_make_qr()
        if qr_path and os.path.exists(qr_path):
            pdf.add_page()
            pdf.set_font("Arial", "", 14)
            pdf.cell(0, 10, "Next Steps", new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font("Arial", "", 12)
            pdf.multi_cell(0, 8, "Scan this QR to check how to brush teeth in a proper way!")
            
            qr_w = 70
            page_w = pdf.w - 2 * pdf.l_margin
            x = pdf.l_margin + (page_w - qr_w) / 2
            y = pdf.get_y() + 8
            pdf.image(qr_path, x=x, y=y, w=qr_w)
            
            pdf.ln(14)
            pdf.set_font("Arial", "", 11)
            pdf.multi_cell(
                0, 7,
                f"(QR shown because max coverage={max_pc_seen:.2f}% or max pixels={max_px_seen} "
                f"exceeded thresholds {QR_TRIGGER_COVERAGE:.1f}% / {QR_TRIGGER_PIXELS} px.)"
            )
    
    pdf.output(save_path)
    return save_path

def main():
    """主函數：從命令行接收參數"""
    if len(sys.argv) < 3:
        print(json.dumps({
            "error": "Missing arguments",
            "usage": "python generate_report.py <image_path> <output_pdf_path> [language]"
        }))
        sys.exit(1)
    
    image_path = sys.argv[1]
    output_pdf_path = sys.argv[2]
    language = sys.argv[3] if len(sys.argv) > 3 else "en"
    
    if not os.path.exists(image_path):
        print(json.dumps({
            "error": f"Image file not found: {image_path}"
        }))
        sys.exit(1)
    
    try:
        # 1. 執行 Roboflow 分析
        print("[INFO] Running Roboflow analysis...", file=sys.stderr)
        try:
            image_files = run_roboflow(image_path)
        except Exception as roboflow_error:
            error_msg = str(roboflow_error)
            print(f"[ERROR] Roboflow analysis failed: {error_msg}", file=sys.stderr)
            print(json.dumps({
                "error": f"Roboflow analysis failed: {error_msg}"
            }))
            sys.exit(1)
        
        if not image_files:
            print(json.dumps({
                "error": "No analysis results from Roboflow"
            }))
            sys.exit(1)
        
        # 2. 呼叫 Grok API 生成建議
        print("[INFO] Generating recommendations with Grok...", file=sys.stderr)
        grok_text = ask_grok(image_files, language)
        
        if grok_text.startswith("Error"):
            print(f"[ERROR] {grok_text}", file=sys.stderr)
            print(json.dumps({
                "error": grok_text
            }))
            sys.exit(1)
        
        # 3. 生成 PDF
        print("[INFO] Creating PDF report...", file=sys.stderr)
        pdf_path = create_pdf(image_files, grok_text, output_pdf_path, language)
        
        # 4. 返回結果
        print(json.dumps({
            "success": True,
            "pdf_path": pdf_path,
            "analysis_files": image_files
        }))
        
    except Exception as e:
        print(json.dumps({
            "error": str(e),
            "type": type(e).__name__
        }))
        sys.exit(1)

if __name__ == "__main__":
    main()

