from ultralytics import YOLO
import sys

def test_image(img_path):
    model = YOLO('yolov8n.pt')
    results = model.predict(img_path, conf=0.05, verbose=True) # Very low confidence
    
    print("\nDETECTIONS:")
    for box in results[0].boxes:
        cls_id = int(box.cls[0])
        name = model.names[cls_id]
        conf = float(box.conf[0])
        print(f"- {name} (conf={conf:.4f})")

if __name__ == "__main__":
    test_image(sys.argv[1])
