from ultralytics import YOLO
import cv2
import PIL.Image as Image
import numpy as np

def debug_banana_detection():
    model_nano = YOLO('yolov8n.pt')
    image_path = r"C:\Users\USER\.gemini\antigravity\brain\e38d914f-35d5-4726-8e92-0514d75bbdc4\uploaded_image_1767589187496.png"
    
    img = cv2.imread(image_path)
    # YOLO expects RGB
    img_rgb = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
    
    results = model_nano(img_rgb, conf=0.01, imgsz=1280)
    
    print(f"\nDetection Results for {image_path}:")
    for res in results:
        for b in res.boxes:
            conf = float(b.conf[0])
            cls = int(b.cls[0])
            name = model_nano.names[cls]
            bbox = b.xyxy[0].tolist()
            bbox_int = [int(v) for v in bbox]
            roi = img_rgb[max(0, bbox_int[1]):min(img.shape[0], bbox_int[3]), 
                          max(0, bbox_int[0]):min(img.shape[1], bbox_int[2])]
            if roi.size > 0:
                hsv_roi = cv2.cvtColor(roi, cv2.COLOR_RGB2HSV)
                avg_hsv = hsv_roi.mean(axis=(0, 1))
            else:
                avg_hsv = np.array([0,0,0])
            
            w = bbox[2] - bbox[0]
            h = bbox[3] - bbox[1]
            ar = w/h if h > 0 else 1
            yc = (bbox[1] + bbox[3]) / (2 * img.shape[0])
            print(f"DEBUG_CUP - {name}: Conf={conf:.4f}, AR={ar:.2f}, YC={yc:.2f}, HSV={avg_hsv.tolist()}")

if __name__ == "__main__":
    debug_banana_detection()
