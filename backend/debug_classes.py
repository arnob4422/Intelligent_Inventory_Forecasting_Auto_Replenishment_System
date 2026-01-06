import torch
from ultralytics import YOLO
import sys

def debug_image(image_path):
    model = YOLO('best_custom.pt')
    results = model(image_path, conf=0.1)  # Low threshold for debugging
    
    for result in results:
        names = result.names
        boxes = result.boxes
        print(f"Detected {len(boxes)} items in {image_path}")
        
        for i, box in enumerate(boxes):
            top_idx = int(box.cls[0])
            top_name = names[top_idx]
            top_conf = float(box.conf[0])
            
            print(f"\nDetection {i+1}:")
            print(f"  Top Label: {top_name} ({top_conf:.2f})")
            
            # If it's a detection model, we might not have full distribution per box easily 
            # unless we look at the raw output. But we can check if other classes are close.
            # In YOLOv8 detection, box.cls only stores the winner.
            
if __name__ == "__main__":
    if len(sys.argv) > 1:
        debug_image(sys.argv[1])
    else:
        print("Usage: python debug_classes.py <image_path>")
