from ultralytics import YOLO
import cv2
import sys

# Load model
model = YOLO('yolov8n.pt')

# Load image
img_path = r"C:/Users/USER/.gemini/antigravity/brain/49513ed2-4ec5-4b4c-8b54-5df9f43538f3/uploaded_image_0_1766975254300.png"
print(f"Testing image: {img_path}")

# Run detection
results = model(img_path, conf=0.01, imgsz=1280)

print(f"Total detections: {len(results[0].boxes)}")

unique_classes = set()
for box in results[0].boxes:
    cls_id = int(box.cls[0])
    cls_name = model.names[cls_id]
    conf = float(box.conf[0])
    unique_classes.add(cls_name)
    print(f" - {cls_name} ({conf:.2f})")

print(f"Unique classes found: {unique_classes}")
