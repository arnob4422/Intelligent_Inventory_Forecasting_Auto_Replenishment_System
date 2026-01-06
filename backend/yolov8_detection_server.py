import os
import cv2
import numpy as np
from fastapi import FastAPI, File, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from ultralytics import YOLO
from PIL import Image
import io
import torch
from sqlalchemy.orm import Session
from database import SessionLocal
import models
import json
from collections import defaultdict

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Models
print("🚀 Loading YOLOv8 Models (High Precision)...")
model_custom = YOLO("best_custom.pt") # Specialized Retail Brand Model
model_nano = YOLO("yolov8n.pt")     # Using Nano for maximum speed and density
print("✅ Models Loaded Successfully!")

# Helper: Calculate IoU
def calculate_iou(box1, box2):
    x1, y1, x2, y2 = box1
    x3, y3, x4, y4 = box2
    
    x_inter1 = max(x1, x3)
    y_inter1 = max(y1, y3)
    x_inter2 = min(x2, x4)
    y_inter2 = min(y2, y4)
    
    width_inter = max(0, x_inter2 - x_inter1)
    height_inter = max(0, y_inter2 - y_inter1)
    area_inter = width_inter * height_inter
    
    area_box1 = (x2 - x1) * (y2 - y1)
    area_box2 = (x4 - x3) * (y4 - y3)
    area_union = area_box1 + area_box2 - area_inter
    
    return area_inter / area_union if area_union > 0 else 0

# Mapping AI labels to Inventory Names
LABEL_MAPPINGS = {
    "apple": "Apple",
    "orange": "Orange",
    "banana": "Banana",
    "broccoli": "Broccoli",
    "carrot": "Carrot",
    "tomato": "Tomato",
    "potato": "Potato",
    "pear": "Pear",
    "lemon": "Lemon",
    "pepper": "Bell Pepper",
    "cucumber": "Cucumber",
    "sports ball": "Fresh Produce", 
    "bowl": "Produce Container",
    "cup": "Coffee Cup",
    "tv": "Packaged Goods",
    "book": "Packaged Food",
    "suitcase": "Packaged Goods",
    "handbag": "Dairy Carton",
    "backpack": "Packaged Inventory",
    "chair": "Stool",
    "potted plant": "Store Item",
}

# 🚫 Hallucination Blacklist (Strict for retail)
HALLUCINATION_BLACKLIST = [
    "pizza", "clock", "zebra", "giraffe", "elephant", "hot dog", "sandwich", 
    "toilet", "refrigerator", "dog", "cat", "horse"
]

def run_detection_on_frame(image_raw, is_video=False):
    """Returns RAW detections without database lookups for speed."""
    image_rgb = cv2.cvtColor(image_raw, cv2.COLOR_BGR2RGB)
    image = Image.fromarray(image_rgb)
    
    # 🏎️ Optimized for High-Fidelity: 1600 for images, 1280 for video
    inference_sz = 1024 # Optimized for speed & accuracy (V12)
    if is_video: inference_sz = 1280
    elif max(image.size) < 400: inference_sz = 640
    
    # High sensitivity for maximum product counts
    custom_conf = 0.01 # Even more aggressive
    nano_conf = 0.002  # Extreme sensitivity for dense shelves
    
    results_custom = model_custom.predict(image_raw, conf=custom_conf, iou=0.85, imgsz=inference_sz, verbose=False)
    results_nano = model_nano.predict(image_raw, conf=nano_conf, iou=0.85, imgsz=inference_sz, verbose=False)
    
    custom_candidates = []
    nano_candidates = []
    
    for res in results_custom:
        for b in res.boxes:
            bbox = b.xyxy[0].tolist()
            conf = float(b.conf[0])
            class_id = int(b.cls[0])
            class_name = model_custom.names[class_id].lower()
            custom_candidates.append({"bbox": bbox, "conf": conf, "class_name": class_name, "type": "custom"})

    for res in results_nano:
        for b in res.boxes:
            bbox = b.xyxy[0].tolist()
            conf = float(b.conf[0])
            class_id = int(b.cls[0])
            class_name = model_nano.names[class_id].lower()
            
            if class_name in HALLUCINATION_BLACKLIST: continue
            
            is_produce = class_name in ["apple", "orange", "banana", "broccoli", "carrot", "tomato", "potato", "pear", "lemon", "pepper", "cucumber", "sports ball"]
            
            # 🛡️ High-Sensitivity Filtering (V12)
            min_conf = 0.002 # Base sensitivity
            
            if is_produce:
                min_conf = 0.10 # Balanced for produce (was 0.18)
                if class_name == "banana":
                    min_conf = 0.25 # Stricter for bananas (was 0.35)
            elif class_name in ["suitcase", "handbag", "book", "backpack"]:
                min_conf = 0.05 # Allow these as they are likely packaging
            else:
                min_conf = 0.08 # Standard general items
                
            if conf < min_conf: continue
            
            nano_candidates.append({"bbox": bbox, "conf": conf, "class_name": class_name, "type": "nano", "is_produce": is_produce})

    final_boxes = []
    
    # 🛡️ PRIORITY 1: Custom Retail Brands
    for cc in custom_candidates:
        noise_brands = ["amour", "chocapic", "selecto", "wafa", "dziriya"]
        min_brand_conf = 0.35 if cc["class_name"] in noise_brands else 0.15
        if cc["conf"] > min_brand_conf:
            product_name = cc["class_name"].title()
            # Explicit brand overrides for matching robustness
            if "coca" in cc["class_name"].lower(): product_name = "Coca Cola"
            elif "fanta" in cc["class_name"].lower(): product_name = "Fanta"
            elif "nestle" in cc["class_name"].lower(): product_name = "Nestle"
            elif "nescafe" in cc["class_name"].lower(): product_name = "Nescafe"
            elif "ricamar" in cc["class_name"].lower(): product_name = "Ricamar"
            
            final_boxes.append({"bbox": cc["bbox"], "conf": cc["conf"], "name": product_name, "type": "custom"})

    # 🛡️ PRIORITY 2: Produce
    for nc in nano_candidates:
        should_skip = False
        for b in final_boxes:
            if b["type"] == "custom" and calculate_iou(nc["bbox"], b["bbox"]) > 0.4:
                if b["conf"] > nc["conf"]:
                    should_skip = True
                    break
        if not should_skip and nc["is_produce"]:
            if any(calculate_iou(nc["bbox"], b["bbox"]) > 0.65 for b in final_boxes if b["type"] == "nano"): continue
            product_name = LABEL_MAPPINGS.get(nc["class_name"], nc["class_name"].title())
            final_boxes.append({"bbox": nc["bbox"], "conf": nc["conf"], "name": product_name, "type": "nano"})

    # 🛡️ PRIORITY 3: General Retail Items
    remaining = sorted(nano_candidates, key=lambda x: x["conf"], reverse=True)
    for r in remaining:
        if any(calculate_iou(r["bbox"], b["bbox"]) > 0.5 for b in final_boxes): continue
        if r["conf"] > 0.05: # Even lower threshold for general items
            product_name = LABEL_MAPPINGS.get(r["class_name"], r["class_name"].title())
            final_boxes.append({"bbox": r["bbox"], "conf": r["conf"], "name": product_name, "type": "nano"})

    return final_boxes 

def map_detections_to_db(boxes, db):
    """Performs bulk database matching in one pass to avoid hangs."""
    if not boxes: return []
    all_products = db.query(models.Product).all()
    name_lookup = {p.name.lower().strip(): p for p in all_products}
    norm_name_lookup = {p.name.lower().replace(" ", ""): p for p in all_products}
    
    detections = []
    import re
    # Helper for deep normalization
    def normalize(text):
        return re.sub(r'[^a-zA-Z0-9]', '', text.lower())

    for item in boxes:
        product_name = item["name"]
        clean_name = product_name.lower().strip()
        norm_name = normalize(clean_name)
        
        # 1. Direct Lookup
        product = name_lookup.get(clean_name)
        
        # 2. Normalized Lookup
        if not product:
            product = norm_name_lookup.get(norm_name)
        
        # 3. Fuzzy Brand Search
        if not product:
            for p_name, p_obj in name_lookup.items():
                p_norm = normalize(p_name)
                # Matches if one name is a substring of the other (normalized)
                if norm_name in p_norm or p_norm in norm_name:
                    product = p_obj
                    break

        detections.append({
            "product_name": product_name,
            "product_exists": product is not None,
            "product_id": product.id if product else None,
            "confidence": round(item["conf"], 3),
            "bbox": {"x1": int(item["bbox"][0]), "y1": int(item["bbox"][1]), "x2": int(item["bbox"][2]), "y2": int(item["bbox"][3])}
        })
    return detections

@app.post("/api/detect/realtime")
def detect_retail(file: UploadFile = File(...)):
    print(f"📥 Received high-density image request: {file.filename}", flush=True)
    try:
        contents = file.file.read()
        nparr = np.frombuffer(contents, np.uint8)
        image_raw = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        if image_raw is None: return {"status": "error", "message": "Decode failed"}
        
        db = SessionLocal()
        try:
            raw_boxes = run_detection_on_frame(image_raw)
            detections = map_detections_to_db(raw_boxes, db)
            print(f"🎯 Zero-Lag Identify: {len(detections)} items", flush=True)
            return {"success": True, "detections": detections}
        finally:
            db.close()
    except Exception as e:
        print(f"❌ Error: {e}")
        return {"status": "error", "message": str(e)}

@app.post("/api/detect/video")
def detect_video(file: UploadFile = File(...)):
    print(f"📥 Received v10 high-fidelity video request: {file.filename}", flush=True)
    temp_file = f"temp_{file.filename}"
    try:
        with open(temp_file, "wb") as f: f.write(file.file.read())
        cap = cv2.VideoCapture(temp_file)
        if not cap.isOpened(): return {"status": "error", "message": "Video open failed"}
        
        fps = cap.get(cv2.CAP_PROP_FPS)
        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        if total_frames <= 0 or fps <= 0: return {"status": "error", "message": "Invalid video data"}
        
        # 🧪 HIGH-FIDELITY SAMPLING: Every 1.5 seconds, capped at 50 frames
        num_samples = 50
        sample_interval = max(int(fps * 1.5), int(total_frames / num_samples))
        
        print(f"🎥 Scanning: {num_samples} frames (1 per {sample_interval} frames) at 1280px", flush=True)
        all_boxes = []
        
        for frame_idx in range(0, total_frames, sample_interval):
            cap.set(cv2.CAP_PROP_POS_FRAMES, frame_idx)
            ret, frame = cap.read()
            if not ret: continue
            
            frame_boxes = run_detection_on_frame(frame, is_video=True)
            all_boxes.extend(frame_boxes)
            print(f"   🎞️ Sampled Frame {frame_idx}/{total_frames}: Found {len(frame_boxes)} items", flush=True)
            
        # 🧪 OPTIMIZED FUSION (V11): High-fidelity deduplication
        unique_boxes = []
        all_boxes.sort(key=lambda x: x["conf"], reverse=True)
        
        for b in all_boxes:
            is_overlap = False
            for u in unique_boxes:
                # Strictly deduplicate same-named items or highly overlapping boxes
                iou_threshold = 0.45 if b["name"] == u["name"] else 0.75
                if calculate_iou(b["bbox"], u["bbox"]) > iou_threshold:
                    is_overlap = True
                    break
            if not is_overlap:
                unique_boxes.append(b)

        db = SessionLocal()
        try:
            detections = map_detections_to_db(unique_boxes, db)
            print(f"🎯 Total Video Coverage (V10): {len(detections)} high-fidelity items", flush=True)
            return {"success": True, "detections": detections}
        finally:
            db.close()
            cap.release()
    except Exception as e:
        print(f"❌ Video Deep Scan Error: {e}")
        return {"status": "error", "message": str(e)}
    finally:
        if os.path.exists(temp_file): os.remove(temp_file)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)