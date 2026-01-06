import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

from ml_engine import VisionEngine

def test_engine():
    print("Initializing VisionEngine...")
    engine = VisionEngine()
    
    if engine.is_ready:
        print("SUCCESS: VisionEngine is ready!")
        # Optional: check if model can predict (needs an image)
        return True
    else:
        print(f"FAILURE: VisionEngine not ready. Error: {engine.error_message}")
        return False

if __name__ == "__main__":
    if test_engine():
        sys.exit(0)
    else:
        sys.exit(1)
