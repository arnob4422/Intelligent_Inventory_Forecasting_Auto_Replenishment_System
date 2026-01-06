import sys
import os

def verify_model(model_path):
    print(f"Checking model: {model_path}")
    if not os.path.exists(model_path):
        print(f"Error: File {model_path} not found")
        return

    try:
        import torch
        print("Attempting torch.load...")
        checkpoint = torch.load(model_path, map_location='cpu', weights_only=False)
        print("torch.load successful!")
        
        from ultralytics import YOLO
        print("Importing YOLO...")
        model = YOLO(model_path)
        print("YOLO model loaded successfully!")
        print(f"Model names: {model.names}")
        print(f"Number of classes: {len(model.names)}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    model_path = "best_custom.pt"
    verify_model(model_path)
