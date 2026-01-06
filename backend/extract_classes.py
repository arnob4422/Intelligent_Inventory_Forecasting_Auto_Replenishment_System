from ultralytics import YOLO
import json
import os

def extract_classes(model_path):
    print(f"Loading model: {model_path}")
    try:
        model = YOLO(model_path)
        classes = list(model.names.values())
        print(f"Extracted {len(classes)} classes.")
        
        with open('custom_classes.json', 'w') as f:
            json.dump(classes, f, indent=4)
        print("Saved to custom_classes.json")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    extract_classes("best_custom.pt")
