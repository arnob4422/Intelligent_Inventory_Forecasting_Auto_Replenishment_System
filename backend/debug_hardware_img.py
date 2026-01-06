from ultralytics import YOLO
import cv2
import numpy as np
import os

def debug_image(image_path):
    print(f"Analyzing {image_path}...")
    model = YOLO('yolov8n.pt')
    results = model.predict(image_path, conf=0.1)
    
    img = cv2.imread(image_path)
    if img is None:
        print("Failed to load image")
        return

    counts = {}
    for result in results:
        boxes = result.boxes
        print(f"Found {len(boxes)} boxes total")
        for i, box in enumerate(boxes):
            cls = int(box.cls[0])
            name = model.names[cls]
            counts[name] = counts.get(name, 0) + 1
            if i < 20: # Show first 20 for detail
                conf = float(box.conf[0])
                b = box.xyxy[0].tolist()
                w = b[2] - b[0]
                h = b[3] - b[1]
                ratio = h / w if w > 0 else 0
                print(f"[{i}] {name} ({conf:.2f}) | Ratio: {ratio:.2f}")

    print("\nSummary Counts:")
    for name, count in counts.items():
        print(f"  {name}: {count}")

if __name__ == "__main__":
    img_path = r"C:/Users/USER/.gemini/antigravity/brain/197fedd7-27dc-48a7-95a1-44352cde31fd/uploaded_image_1766895596347.jpg"
    debug_image(img_path)
