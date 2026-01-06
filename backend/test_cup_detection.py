"""
Quick test to verify YOLO can detect a cup
"""
from ultralytics import YOLO
from PIL import Image
import sys

# Load model
print("Loading YOLOv8n...")
model = YOLO('yolov8n.pt')

# Test image path
if len(sys.argv) > 1:
    image_path = sys.argv[1]
else:
    print("Usage: python test_cup_detection.py <image_path>")
    sys.exit(1)

# Load and detect
print(f"Loading image: {image_path}")
image = Image.open(image_path)

print("\nRunning detection...")
results = model.predict(image, conf=0.10, verbose=True)

print("\n=== DETECTION RESULTS ===")
for result in results:
    for box in result.boxes:
        conf = float(box.conf[0])
        class_id = int(box.cls[0])
        class_name = model.names[class_id]
        print(f"  Detected: {class_name} (confidence: {conf:.2f})")

print(f"\nTotal detections: {sum(len(r.boxes) for r in results)}")
