import os
import json
import base64
import cv2
import numpy as np
import requests
import tkinter as tk
from tkinter import filedialog, messagebox
from fpdf import FPDF
from inference_sdk import InferenceHTTPClient
from fpdf.enums import XPos, YPos

# 載入環境變數（從 .env 檔案）
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    print("[Warning] python-dotenv not installed. Install with: pip install python-dotenv")
    print("[Warning] Using system environment variables only.")

# API 設定（從環境變數讀取）
ROBOFLOW_API_KEY = os.getenv("ROBOFLOW_API_KEY", "")   
WORKSPACE_NAME = os.getenv("WORKSPACE_NAME", "")               
WORKFLOW_ID = os.getenv("WORKFLOW_ID", "")   

# Grok API 設定（從環境變數讀取）
CHATGPT_API_KEY = os.getenv("GROK_API_KEY", os.getenv("CHATGPT_API_KEY", ""))  # 支援舊的環境變數名稱
CHATGPT_ENDPOINT = os.getenv("GROK_ENDPOINT", "https://api.x.ai/v1/chat/completions")


AUTO_CROP_BOX_DEFAULT = (100, 150, 500, 450)

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_FOLDER = os.path.join(BASE_DIR, "outputs")
os.makedirs(OUTPUT_FOLDER, exist_ok=True)


AUTO_CROP_CFG = os.path.join(BASE_DIR, "auto_crop_box.json")

FONTS_DIR = os.path.join(BASE_DIR, "fonts")
os.makedirs(FONTS_DIR, exist_ok=True)

FONT_URLS = {
    "NotoSans": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/hinted/ttf/NotoSans/NotoSans-Regular.ttf",
    "NotoSansSC": "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/SimplifiedChinese/NotoSansSC-Regular.otf",
    "NotoSansTC": "https://raw.githubusercontent.com/googlefonts/noto-cjk/main/Sans/OTF/TraditionalChinese/NotoSansTC-Regular.otf",
    "NotoSansJP": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansJP/NotoSansJP-Regular.ttf",
    "NotoNaskhArabic": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoNaskhArabic/NotoNaskhArabic-Regular.ttf",
    "NotoSansDevanagari": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansDevanagari/NotoSansDevanagari-Regular.ttf",
    "NotoSansThai": "https://raw.githubusercontent.com/googlefonts/noto-fonts/main/unhinted/ttf/NotoSansThai/NotoSansThai-Regular.ttf"
}

def ensure_fonts():
    """Download required fonts if missing"""
    for name, url in FONT_URLS.items():
        filename = os.path.join(FONTS_DIR, os.path.basename(url))
        if not os.path.exists(filename):
            print(f"[Font] Downloading {name} from {url}")
            try:
                r = requests.get(url, timeout=30)
                r.raise_for_status()
                with open(filename, "wb") as f:
                    f.write(r.content)
                print(f"[Font] Saved {filename}")
            except Exception as e:
                print(f"[Font] Failed to download {name}: {e}")
                continue
        FONT_URLS[name] = filename  


QR_TRIGGER_COVERAGE = 10.0


QR_TRIGGER_PIXELS = 100  


QR_IMAGE_PATH = os.path.join(BASE_DIR, "QR.png") 


QR_DATA = "Brush Your Teeth Properly!"


LANGUAGES = {
    "en": "English",
    "zh": "中文 (简体)",
    "zh_tw": "中文 (繁體)",
    "ja": "日本語",
    "es": "Español",
    "ar": "العربية",
    "de": "Deutsch",
    "hi": "हिन्दी",
    "ur": "اردو",
    "ne": "नेपाली",
    "tl": "Filipino",
    "th": "ไทย"
}
current_lang = "en"

translations = {
    "title": {
        "en": "Oral Health Assistant",
        "zh": "口腔健康助手",
        "zh_tw": "口腔健康助理",
        "ja": "口腔ヘルスアシスタント",
        "es": "Asistente de Salud Oral",
        "ar": "مساعد صحة الفم",
        "de": "Mundgesundheitsassistent",
        "hi": "मौखिक स्वास्थ्य सहायक",
        "ur": "منہ की صحت کا معاون",
        "ne": "मुख स्वास्थ्य सहायक",
        "tl": "Katulong sa Kalusugan ng Bibig",
        "th": "ผู้ช่วยสุขภาพช่องปาก"
    },
    "roboflow_btn": {
        "en": "Dental Plaque Detection",
        "zh": "牙菌斑检测",
        "zh_tw": "牙菌斑檢測",
        "ja": "歯垢検出",
        "es": "Detección de placa dental",
        "ar": "كشف اللويحة السنية",
        "de": "Plaque-Erkennung",
        "hi": "दंत पट्टिका का पता लगाना",
        "ur": "دانتوں की تختी की نشاندाही",
        "ne": "दन्त पट्टिका पत्ता लगाउने",
        "tl": "Pagtukoy ng Plaka sa Ngipin",
        "th": "ตรวจหาคราบจุลินทรีย์"
    },
    "chatgpt_btn": {
        "en": "Generate Report",
        "zh": "生成报告",
        "zh_tw": "生成報告",
        "ja": "レポート生成",
        "es": "Generar informe",
        "ar": "إنشاء تقرير",
        "de": "Bericht erstellen",
        "hi": "रिपोर्ट तैयार करें",
        "ur": "رپورٹ تیار کریں",
        "ne": "रिपोर्ट तयार गर्नुहोस्",
        "tl": "Gumawa ng Ulat",
        "th": "สร้างรายงาน"
    },
    "roboflow_done": {
        "en": "Analysis complete.\nSaved:",
        "zh": "分析完成。\n保存到：",
        "zh_tw": "分析完成。\n已儲存：",
        "ja": "分析完了。\n保存先:",
        "es": "Análisis completo.\nGuardado en:",
        "ar": "اكتمل التحليل.\nتم الحفظ:",
        "de": "Analyse abgeschlossen.\nGespeichert:",
        "hi": "विश्लेषण पूरा हुआ।\nसहेजा गया:",
        "ur": "تجزیہ مکمل۔\nمحفوظ کیا گیا:",
        "ne": "विश्लेषण पूरा भयो।\nसञ्चय गरिएको:",
        "tl": "Tapos na ang pagsusuri.\nNai-save:",
        "th": "การวิเคราะห์เสร็จสิ้น\nบันทึกไว้ที่:"
    },
    "roboflow_error": {
        "en": "Please run Roboflow first.",
        "zh": "请先运行 Roboflow。",
        "zh_tw": "請先執行 Roboflow。",
        "ja": "先に Roboflow を実行してください。",
        "es": "Ejecute Roboflow primero.",
        "ar": "يرجى تشغيل Roboflow أولاً.",
        "de": "Bitte zuerst Roboflow ausführen.",
        "hi": "कृपया पहले Roboflow चलाएँ।",
        "ur": "براہ کرم پہلے روبوفلو چلائیں۔",
        "ne": "कृपया पहिले Roboflow चलाउनुहोस्।",
        "tl": "Pakibuksan muna ang Roboflow.",
        "th": "กรุณาเรียกใช้ Roboflow ก่อน"
    },
    "report_saved": {
        "en": "Report saved to",
        "zh": "报告已保存到",
        "zh_tw": "報告已儲存到",
        "ja": "レポートを保存しました:",
        "es": "Informe guardado en",
        "ar": "تم حفظ التقرير في",
        "de": "Bericht gespeichert unter",
        "hi": "रिपोर्ट सहेजी गई",
        "ur": "رپورٹ محفوظ کی گئی",
        "ne": "रिपोर्ट यो स्थानमा सुरक्षित गरियो",
        "tl": "Nai-save ang ulat sa",
        "th": "บันทึกรายงานไว้ที่"
    },
    "report_title": {
        "en": "Oral Health Report",
        "zh": "口腔健康报告",
        "zh_tw": "口腔健康報告",
        "ja": "口腔健康レポート",
        "es": "Informe de Salud Oral",
        "ar": "تقرير صحة الفم",
        "de": "Bericht zur Mundgesundheit",
        "hi": "मौखिक स्वास्थ्य रिपोर्ट",
        "ur": "منہ کی صحت کی رپورٹ",
        "ne": "मुख स्वास्थ्य प्रतिवेदन",
        "tl": "Ulat sa Kalusugan ng Bibig",
        "th": "รายงานสุขภาพช่องปาก"
    },
    "analysis_images": {
        "en": "Roboflow Analysis Images:",
        "zh": "Roboflow 分析图像：",
        "zh_tw": "Roboflow 分析圖像：",
        "ja": "Roboflow解析画像:",
        "es": "Imágenes de análisis de Roboflow:",
        "ar": "صور تحليل Roboflow:",
        "de": "Roboflow-Analysebilder:",
        "hi": "Roboflow विश्लेषण छवियाँ:",
        "ur": "روبوفلو تجزیہ تصاویر:",
        "ne": "Roboflow विश्लेषण छविहरू:",
        "tl": "Mga Larawan ng Pagsusuri ng Roboflow:",
        "th": "ภาพวิเคราะห์ของ Roboflow:"
    },
    "plaque_area": {
        "en": "Plaque Area:",
        "zh": "牙菌斑面积：",
        "zh_tw": "牙菌斑面積：",
        "ja": "歯垢エリア:",
        "es": "Área de placa:",
        "ar": "منطقة اللويحة:",
        "de": "Plaquebereich:",
        "hi": "पट्टिका क्षेत्र:",
        "ur": "پلاک کا رقبہ:",
        "ne": "पट्टिका क्षेत्र:",
        "tl": "Lugar ng Plaka:",
        "th": "พื้นที่คราบจุลินทรีย์:"
    },
    "pixels": {
        "en": "Pixels",
        "th": "พิกเซล",
        "zh": "像素",
        "zh_tw": "像素",
        "ja": "ピクセル",
        "es": "Píxeles",
        "ar": "بكسل",
        "de": "Pixel",
        "hi": "पिक्सेल",
        "ur": "پکسل",
        "ne": "पिक्सेल",
        "tl": "Mga Pixel"
    },
    "coverage": {
        "en": "Coverage",
        "th": "การครอบคลุม",
        "zh": "覆盖率",
        "zh_tw": "覆蓋率",
        "ja": "カバー率",
        "es": "Cobertura",
        "ar": "التغطية",
        "de": "Abdeckung",
        "hi": "कवरेज",
        "ur": "کوریج",
        "ne": "कभर",
        "tl": "Saklaw"
    },
    "recommendations": {
        "en": "ChatGPT Recommendations:",
        "zh": "ChatGPT 建议：",
        "zh_tw": "ChatGPT 建議：",
        "ja": "ChatGPT 推奨事項:",
        "es": "Recomendaciones de ChatGPT:",
        "ar": "توصيات ChatGPT:",
        "de": "ChatGPT-Empfehlungen:",
        "hi": "ChatGPT सिफारिशें:",
        "ur": "ChatGPT سفارشات:",
        "ne": "ChatGPT सिफारिसहरू:",
        "tl": "Mga Rekomendasyon ng ChatGPT:",
        "th": "คำแนะนำจาก ChatGPT:"
    },
    "language": LANGUAGES
}


translations.setdefault("qr_section_title", {
    "en": "Next Steps",
    "zh": "下一步",
    "zh_tw": "下一步",
    "ja": "次のステップ",
    "es": "Próximos pasos",
    "ar": "الخطوات التالية",
    "de": "Nächste Schritte",
    "hi": "अगले कदम",
    "ur": "اگلے اقدامات",
    "ne": "अर्को चरण",
    "tl": "Susunod na mga Hakbang",
    "th": "ขั้นตอนถัดไป"
})
translations.setdefault("qr_caption", {
    "en": "Scan this QR to check how to brush teeth in a proper way!",
    "zh": "扫描此二维码查看正确的刷牙方法。",
    "zh_tw": "掃描此 QR 碼查看正確的刷牙方式。",
    "ja": "このQRをスキャンして正しい歯みがき方法を確認しましょう。",
    "es": "Escanee este código para ver cómo cepillarse los dientes correctamente.",
    "ar": "امسح رمز الاستجابة السريعة لمشاهدة الطريقة الصحيحة لتنظيف الأسنان بالفرشاة.",
    "de": "Scannen Sie diesen QR, um die richtige Zahnputztechnik zu sehen.",
    "hi": "इस QR को स्कैन कर दाँत सही तरीके से ब्रश करना देखें।",
    "ur": "اس QR کو اسکین کر کے دانت صحیح طریقے سے برش کرنے کا طریقہ دیکھیں۔",
    "ne": "यो QR स्क्यान गरी दाँत सही तरिकाले ब्रस गर्ने तरिका हेर्नुहोस्।",
    "tl": "I-scan ang QR para makita ang tamang paraan ng pagsesepilyo.",
    "th": "สแกน QR นี้เพื่อดูวิธีแปรงฟันที่ถูกต้อง"
})

def t(key): return translations.get(key, {}).get(current_lang, key)


def load_auto_crop_box():
    """Load saved auto-crop box from JSON; fallback to default."""
    if os.path.exists(AUTO_CROP_CFG):
        try:
            with open(AUTO_CROP_CFG, "r", encoding="utf-8") as f:
                data = json.load(f)
            box = tuple(map(int, data.get("auto_crop_box", AUTO_CROP_BOX_DEFAULT)))
            # Sanity check length
            if len(box) == 4:
                return box
        except Exception as e:
            print(f"[AutoCrop] Failed to load config: {e}")
    return AUTO_CROP_BOX_DEFAULT

def save_auto_crop_box(box):
    """Save (left, top, right, bottom) to JSON."""
    try:
        with open(AUTO_CROP_CFG, "w", encoding="utf-8") as f:
            json.dump({"auto_crop_box": list(map(int, box))}, f, indent=2)
        print(f"[AutoCrop] Saved to {AUTO_CROP_CFG}: {box}")
        return True
    except Exception as e:
        print(f"[AutoCrop] Failed to save config: {e}")
        return False

AUTO_CROP_BOX = load_auto_crop_box()


def decode_and_save(b64_string, name):
    img_bytes = base64.b64decode(b64_string.split(",")[-1])
    img_arr = np.frombuffer(img_bytes, dtype=np.uint8)
    img = cv2.imdecode(img_arr, cv2.IMREAD_UNCHANGED)
    filename = os.path.join(OUTPUT_FOLDER, f"{name}.png")
    cv2.imwrite(filename, img)
    return filename

def run_roboflow(image_path):
    # 檢查 API 設定
    if not ROBOFLOW_API_KEY or not WORKSPACE_NAME or not WORKFLOW_ID:
        messagebox.showerror("Error", "Roboflow API settings not configured.\nPlease set ROBOFLOW_API_KEY, WORKSPACE_NAME, and WORKFLOW_ID in .env file.")
        return []
    
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

def calculate_plaque_area(mask_path):
    mask = cv2.imread(mask_path)
    if mask is None: return 0, 0.0
    hsv = cv2.cvtColor(mask, cv2.COLOR_BGR2HSV)
    purple_mask = cv2.inRange(hsv, np.array([120,40,40]), np.array([160,255,255]))
    plaque_area = cv2.countNonZero(purple_mask)
    total_area = mask.shape[0] * mask.shape[1]
    return plaque_area, (plaque_area / total_area) * 100

def ask_chatgpt(image_files):
    """
    Uses Grok model: grok-4-1-fast-reasoning (OpenAI-compatible chat/completions).
    Keeps your existing request structure: text + inline base64 images.
    """
    # 檢查 API Key 是否設定
    if not CHATGPT_API_KEY:
        messagebox.showerror("Error", "Grok API Key not configured.\nPlease set GROK_API_KEY in .env file.")
        return "Error: GROK_API_KEY not set. Please set GROK_API_KEY environment variable."
    
    headers = {
        "Authorization": f"Bearer {CHATGPT_API_KEY}",
        "Content-Type": "application/json",
    }

    # IMPORTANT FIX:
    # Your old prompt used `t('language')` which returns a dict, not the current language name.
    # Use the display name for the currently selected language:
    lang_name = LANGUAGES.get(current_lang, "English")

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
            "image_url": {"url": "data:image/png;base64," + b64_string}
        })

    data = {
        "model": "grok-4-1-fast-reasoning",
        "messages": [
            {"role": "user", "content": content}
        ],
        # Optional: keep responses consistent
        "temperature": 0.4
    }

    r = requests.post(CHATGPT_ENDPOINT, headers=headers, json=data, timeout=120)

    if r.status_code != 200:
        # show server error body to help debug auth/endpoint/model issues
        return f"Error {r.status_code}: {r.text}"

    j = r.json()

    # OpenAI-compatible shape:
    # {"choices":[{"message":{"content":"..."}}]}
    try:
        return j["choices"][0]["message"]["content"]
    except Exception:
        return f"Unexpected response format: {j}"


def interactive_crop(image_path, save_dir=OUTPUT_FOLDER):
    """
    Interactive crop with auto-scaling (fits to ~90% of screen), then maps the
    selected ROI back to ORIGINAL pixels and saves the cropped original image.
    Returns the cropped image path, or None if cancelled.
    """
    
    img = cv2.imread(image_path)
    if img is None:
        messagebox.showerror("Error", f"Could not load image for cropping:\n{image_path}")
        return None
    H, W = img.shape[:2]

    
    tmp = tk.Toplevel()
    tmp.withdraw()
    screen_w = tmp.winfo_screenwidth()
    screen_h = tmp.winfo_screenheight()
    tmp.destroy()

    
    max_w = int(screen_w * 0.9)
    max_h = int(screen_h * 0.9)
    scale = min(max_w / W, max_h / H, 1.0)
    disp_w = int(W * scale)
    disp_h = int(H * scale)

    
    disp = cv2.resize(img, (disp_w, disp_h), interpolation=cv2.INTER_AREA)

    
    win_title = "Draw crop region (ENTER to confirm, ESC to cancel)"
    r = cv2.selectROI(win_title, disp, fromCenter=False, showCrosshair=True)
    cv2.destroyAllWindows()

    
    if r == (0, 0, 0, 0):
        use_original = messagebox.askyesno("Crop cancelled", "No region selected. Use the original image instead?")
        return image_path if use_original else None

    
    x, y, w, h = map(int, r)
    left   = int(round(x / scale))
    top    = int(round(y / scale))
    right  = int(round((x + w) / scale))
    bottom = int(round((y + h) / scale))

    
    left   = max(0, min(left, W - 1))
    right  = max(0, min(right, W))
    top    = max(0, min(top, H - 1))
    bottom = max(0, min(bottom, H))

    if right <= left or bottom <= top:
        messagebox.showerror("Error", "Invalid crop box after mapping. Please try again.")
        return None

   
    cropped = img[top:bottom, left:right]
    base = os.path.splitext(os.path.basename(image_path))[0]
    cropped_path = os.path.join(save_dir, f"{base}_interactive_cropped.png")
    cv2.imwrite(cropped_path, cropped)
    print(f"[Interactive Crop] Saved {cropped_path} (mapped box={left,top,right,bottom})")
    return cropped_path

def auto_crop(image_path, box=None, save_dir=OUTPUT_FOLDER):
    """
    Auto crop using (left, top, right, bottom).
    Uses persisted box if not provided.
    """
    if box is None:
        box = AUTO_CROP_BOX
    img = cv2.imread(image_path)
    if img is None:
        messagebox.showerror("Error", "Could not load image for auto cropping.")
        return None
    h, w = img.shape[:2]
    left, top, right, bottom = map(int, box)
    left = max(0, min(left, w))
    right = max(0, min(right, w))
    top = max(0, min(top, h))
    bottom = max(0, min(bottom, h))
    if right <= left or bottom <= top:
        messagebox.showerror("Error", f"Invalid auto-crop box: {box}")
        return None
    cropped = img[top:bottom, left:right]
    base = os.path.splitext(os.path.basename(image_path))[0]
    cropped_path = os.path.join(save_dir, f"{base}_auto_cropped.png")
    cv2.imwrite(cropped_path, cropped)
    print(f"[Auto Crop] Saved {cropped_path} (box={left,top,right,bottom})")
    return cropped_path

def set_auto_crop_box_by_roi():
    """
    Lets user pick any image, shows scaled preview, draws ROI,
    maps ROI back to original pixels, saves to AUTO_CROP_CFG,
    updates global AUTO_CROP_BOX and GUI label.
    """
    
    file_path = filedialog.askopenfilename(
        title="Select an image for setting Auto-Crop Box",
        filetypes=[("Image files", "*.jpg *.jpeg *.png *.bmp *.tif *.tiff")]
    )
    if not file_path:
        return

    
    img = cv2.imread(file_path)
    if img is None:
        messagebox.showerror("Error", f"Could not load image: {file_path}")
        return
    H, W = img.shape[:2]

    
    temp = tk.Toplevel()  
    temp.withdraw()
    screen_w = temp.winfo_screenwidth()
    screen_h = temp.winfo_screenheight()
    temp.destroy()

    max_w = int(screen_w * 0.9)
    max_h = int(screen_h * 0.9)
    scale = min(max_w / W, max_h / H, 1.0)
    disp_w = int(W * scale)
    disp_h = int(H * scale)
    disp = cv2.resize(img, (disp_w, disp_h), interpolation=cv2.INTER_AREA)

    
    msg = "Draw ROI for Auto-Crop (ENTER to confirm, ESC to cancel)"
    r = cv2.selectROI(msg, disp, fromCenter=False, showCrosshair=True)
    cv2.destroyAllWindows()
    if r == (0, 0, 0, 0):
        print("[AutoCrop] ROI cancelled")
        return

    x, y, w, h = map(int, r)

    
    left   = int(round(x / scale))
    top    = int(round(y / scale))
    right  = int(round((x + w) / scale))
    bottom = int(round((y + h) / scale))

   
    left   = max(0, min(left, W - 1))
    right  = max(0, min(right, W))
    top    = max(0, min(top, H - 1))
    bottom = max(0, min(bottom, H))

   
    box = (left, top, right, bottom)
    if save_auto_crop_box(box):
        global AUTO_CROP_BOX
        AUTO_CROP_BOX = box
        auto_hint_var.set(f"AUTO_CROP_BOX = {AUTO_CROP_BOX} (persisted)")
        messagebox.showinfo("Auto-Crop", f"Saved auto-crop box: {box}")


def set_unicode_font(pdf, lang_code="en"):
    ensure_fonts()
    font_map = {
        "zh": ("NotoSansSC", FONT_URLS["NotoSansSC"]),
        "zh_tw": ("NotoSansTC", FONT_URLS["NotoSansTC"]),
        "ja": ("NotoSansJP", FONT_URLS["NotoSansJP"]),
        "ar": ("NotoNaskhArabic", FONT_URLS["NotoNaskhArabic"]),
        "ur": ("NotoNaskhArabic", FONT_URLS["NotoNaskhArabic"]),
        "hi": ("NotoSansDevanagari", FONT_URLS["NotoSansDevanagari"]),
        "ne": ("NotoSansDevanagari", FONT_URLS["NotoSansDevanagari"]),
        "th": ("NotoSansThai", FONT_URLS["NotoSansThai"]),
        "en": ("NotoSans", FONT_URLS["NotoSans"]),
        "es": ("NotoSans", FONT_URLS["NotoSans"]),
        "de": ("NotoSans", FONT_URLS["NotoSans"]),
        "tl": ("NotoSans", FONT_URLS["NotoSans"])
    }
    name, path = font_map[lang_code]
    pdf.add_font(name, "", path, uni=True)
    pdf.set_font(name, "", 12)


def get_or_make_qr():
    """
    Return a path to a QR image:
    - If QR_IMAGE_PATH exists, use it.
    - Else try to generate from QR_DATA using 'qrcode' (if available).
    - Else return None.
    """
    if QR_IMAGE_PATH and os.path.exists(QR_IMAGE_PATH):
        return QR_IMAGE_PATH
    try:
        import qrcode
        img = qrcode.make(QR_DATA)
        out_path = os.path.join(OUTPUT_FOLDER, "qr_generated.png")
        img.save(out_path)
        print(f"[QR] Generated {out_path} for data: {QR_DATA}")
        return out_path
    except Exception as e:
        print(f"[QR] Could not generate QR (install 'qrcode' or provide QR_IMAGE_PATH): {e}")
        return None


def create_pdf(image_files, chatgpt_text, save_path):
    pdf = FPDF()
    pdf.add_page()
    set_unicode_font(pdf, current_lang)

    pdf.set_font(pdf.font_family, "", 16)
    pdf.cell(0, 10, t("report_title"), new_x=XPos.LMARGIN, new_y=YPos.NEXT, align="C")

    pdf.set_font(pdf.font_family, "", 12)
    pdf.cell(0, 10, t("analysis_images"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    for img in image_files:
        pdf.image(img, w=150)
        pdf.ln(10)

    pdf.add_page()
    pdf.set_font(pdf.font_family, "", 12)
    pdf.cell(0, 10, t("plaque_area"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)

   
    triggered_qr = False
    max_px_seen = 0
    max_pc_seen = 0.0

    for img in image_files:
        if "mask_visualization" in img:
            px, pc = calculate_plaque_area(img)
            max_px_seen = max(max_px_seen, px)
            max_pc_seen = max(max_pc_seen, pc)
            if (pc >= QR_TRIGGER_COVERAGE) or (px >= QR_TRIGGER_PIXELS):
                triggered_qr = True

            pdf.multi_cell(
                0, 10,
                f"{os.path.basename(img)}:\n"
                f"- {t('pixels')}: {px}\n"
                f"- {t('coverage')}: {pc:.2f}%"
            )

    pdf.add_page()
    pdf.set_font(pdf.font_family, "", 12)
    pdf.cell(0, 10, t("recommendations"), new_x=XPos.LMARGIN, new_y=YPos.NEXT)
    pdf.multi_cell(0, 10, chatgpt_text)

    
    if triggered_qr:
        qr_path = get_or_make_qr()
        if qr_path and os.path.exists(qr_path):
            pdf.add_page()
            
            pdf.set_font(pdf.font_family, "", 14)
            pdf.cell(0, 10, translations["qr_section_title"][current_lang], new_x=XPos.LMARGIN, new_y=YPos.NEXT)
            pdf.set_font(pdf.font_family, "", 12)
            pdf.multi_cell(0, 8, translations["qr_caption"][current_lang])

            
            qr_w = 70  # mm
            page_w = pdf.w - 2 * pdf.l_margin
            x = pdf.l_margin + (page_w - qr_w) / 2
            y = pdf.get_y() + 8
            pdf.image(qr_path, x=x, y=y, w=qr_w)

            
            try:
                pdf.set_xy(x, y + qr_w + 6)
                pdf.set_text_color(0, 0, 255)
                pdf.cell(0, 10, QR_DATA, link=QR_DATA)
                pdf.set_text_color(0, 0, 0)
            except Exception:
                pass

            
            pdf.ln(14)
            pdf.set_font(pdf.font_family, "", 11)
            pdf.multi_cell(
                0, 7,
                f"(QR shown because max coverage={max_pc_seen:.2f}% or max pixels={max_px_seen} "
                f"exceeded thresholds {QR_TRIGGER_COVERAGE:.1f}% / {QR_TRIGGER_PIXELS} px.)"
            )

    pdf.output(save_path)
    print(f"[PDF] Saved {save_path}")


root = tk.Tk()
root.title(t("title"))
root.geometry("560x480")

roboflow_outputs = []


crop_mode = tk.StringVar(value="interactive")
mode_frame = tk.LabelFrame(root, text="Crop Mode")
mode_frame.pack(pady=8, fill="x", padx=10)
tk.Radiobutton(mode_frame, text="Interactive (manual ROI)", variable=crop_mode, value="interactive").pack(anchor="w", padx=10)
tk.Radiobutton(mode_frame, text="Automatic (fixed area)", variable=crop_mode, value="auto").pack(anchor="w", padx=10)
tk.Radiobutton(mode_frame, text="None (use full image)", variable=crop_mode, value="none").pack(anchor="w", padx=10)


auto_hint_var = tk.StringVar()
if os.path.exists(AUTO_CROP_CFG):
    auto_hint_var.set(f"AUTO_CROP_BOX = {AUTO_CROP_BOX} (persisted)")
else:
    auto_hint_var.set(f"AUTO_CROP_BOX (default) = {AUTO_CROP_BOX}")
auto_hint_label = tk.Label(root, textvariable=auto_hint_var)
auto_hint_label.pack(pady=2)

set_auto_btn = tk.Button(root, text="Set Auto-Crop Box (draw ROI)", command=set_auto_crop_box_by_roi)
set_auto_btn.pack(pady=6)

def run_roboflow_button():
    global roboflow_outputs
    img = filedialog.askopenfilename(filetypes=[("Images","*.jpg *.jpeg *.png *.bmp *.tif *.tiff")])
    if not img:
        return

    
    if crop_mode.get() == "interactive":
        cropped = interactive_crop(img)
        if not cropped:
            return
        img_for_analysis = cropped
    elif crop_mode.get() == "auto":
        img_for_analysis = auto_crop(img, box=AUTO_CROP_BOX)
        if not img_for_analysis:
            return
    else:
        img_for_analysis = img  

    roboflow_outputs = run_roboflow(img_for_analysis)
    messagebox.showinfo("Roboflow", f"{t('roboflow_done')} {roboflow_outputs}")

def run_chatgpt_button():
    if not roboflow_outputs:
        return messagebox.showerror("Error", t("roboflow_error"))
    chat_text = ask_chatgpt(roboflow_outputs)
    save = filedialog.asksaveasfilename(defaultextension=".pdf", filetypes=[("PDF","*.pdf")])
    if not save:
        return
    create_pdf(roboflow_outputs, chat_text, save)
    messagebox.showinfo("ChatGPT", f"{t('report_saved')} {save}")

roboflow_btn = tk.Button(root, text=t("roboflow_btn"), command=run_roboflow_button, width=24, height=2)
roboflow_btn.pack(pady=12)

chatgpt_btn = tk.Button(root, text=t("chatgpt_btn"), command=run_chatgpt_button, width=24, height=2)
chatgpt_btn.pack(pady=8)

def set_language(lang):
    global current_lang
    current_lang = lang
    root.title(t("title"))
    roboflow_btn.config(text=t("roboflow_btn"))
    chatgpt_btn.config(text=t("chatgpt_btn"))

lang_var = tk.StringVar(value=current_lang)
lang_menu = tk.OptionMenu(root, lang_var, *LANGUAGES.keys(), command=set_language)
menu = lang_menu["menu"]; menu.delete(0, "end")
for code, display_name in LANGUAGES.items():
    menu.add_command(label=display_name, command=lambda c=code:(lang_var.set(c), set_language(c)))
lang_menu.pack(pady=6)

root.mainloop()
