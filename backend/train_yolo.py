from ultralytics import YOLO
import os
import yaml

def create_dummy_dataset_structure():
    """Creates a template dataset structure if none exists."""
    os.makedirs("dataset/train/images", exist_ok=True)
    os.makedirs("dataset/train/labels", exist_ok=True)
    os.makedirs("dataset/val/images", exist_ok=True)
    os.makedirs("dataset/val/labels", exist_ok=True)
    
    data_config = {
        'path': os.path.abspath("dataset"),
        'train': 'train/images',
        'val': 'val/images',
        'names': {
            0: 'Air Conditioner'
        }
    }
    
    with open("dataset/data.yaml", "w") as f:
        yaml.dump(data_config, f)
        
    print(f"\n[INFO] Created template dataset structure in: {os.path.abspath('dataset')}")
    print("[ACTION REQUIRED] Please place your images in 'dataset/train/images' and labels in 'dataset/train/labels' before training.")

def train_model():
    print("="*60)
    print("🚀 YOLOv8 Training Script")
    print("="*60)
    
    # Check for existing dataset configuration
    data_yaml_path = "dataset/data.yaml"
    
    if not os.path.exists(data_yaml_path):
        create_dummy_dataset_structure()
        # Create a dummy image to prevent immediate crash if user runs it without looking
        # But really we want them to add data.
        return

    print(f"Training with config: {data_yaml_path}")
    print("Epochs: 50")
    
    try:
        # Load a model
        model = YOLO('yolov8n.pt')  # load a pretrained model (recommended for training)

        # Train the model
        results = model.train(
            data=data_yaml_path, 
            epochs=50, 
            imgsz=640,
            project='runs/detect',
            name='train_ac_model'
        )
        
        print("\n✅ Training Complete!")
        print(f"Best model saved to: {os.path.abspath('runs/detect/train_ac_model/weights/best.pt')}")
        print("\nTo use this model, update 'yolov8_detection_server.py' to load this new .pt file.")
        
    except Exception as e:
        print(f"\n❌ Training Error: {e}")
        print("Tip: Ensure you have images and labels in your dataset folder.")

if __name__ == "__main__":
    train_model()
