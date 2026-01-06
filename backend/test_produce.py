import requests
import os
import glob

def test_produce_variety():
    url = "http://localhost:8001/api/detect/realtime"
    artifact_dir = r"C:\Users\USER\.gemini\antigravity\brain\e38d914f-35d5-4726-8e92-0514d75bbdc4"
    image_paths = [
        os.path.join(artifact_dir, "uploaded_image_0_1767585542760.png"),
        os.path.join(artifact_dir, "uploaded_image_1_1767585542760.jpg")
    ]
    
    for img_path in image_paths:
        if not os.path.exists(img_path): continue
        print(f"\n--- Testing Image: {os.path.basename(img_path)} ---")
        with open(img_path, "rb") as f:
            files = {"file": f}
            data = {"confidence": 0.01}
            response = requests.post(url, files=files, data=data)
            
        if response.status_code == 200:
            result = response.json()
            counts = {}
            for det in result['detections']:
                name = det['product_name']
                counts[name] = counts.get(name, 0) + 1
            
            print(f"Total Objects: {result['count']}")
            print("Distribution:")
            for name, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
                print(f" - {name}: {count}")
        else:
            print(f"Error {response.status_code}: {response.text}")

if __name__ == "__main__":
    test_produce_variety()
