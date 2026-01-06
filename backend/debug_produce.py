import requests
import json
import os
import time

def identify_produce_crowd_timed():
    url = "http://localhost:8001/api/detect/realtime"
    image_path = r"C:\Users\USER\.gemini\antigravity\brain\470bc3aa-ef40-4256-901a-092f3fb38cdc\uploaded_image_1767667353735.png"
    
    if not os.path.exists(image_path):
        print(f"Error: {image_path} not found")
        return

    print(f"\n--- Testing High-Density Produce Shelf (Timed): {os.path.basename(image_path)} ---")
    
    start_time = time.time()
    with open(image_path, 'rb') as f:
        files = {'file': f}
        try:
            response = requests.post(url, files=files, timeout=60) # High timeout for test
        except requests.exceptions.Timeout:
            print("Request timed out > 60s")
            return
        except Exception as e:
            print(f"Request failed: {e}")
            return
            
    elapsed = time.time() - start_time
    print(f"Time Taken: {elapsed:.2f} seconds")
        
    if response.status_code == 200:
        results = response.json().get('detections', [])
        print(f"Total Objects Found: {len(results)}")
        
        # Group by name
        counts = {}
        for det in results:
            name = det['product_name']
            counts[name] = counts.get(name, 0) + 1
            
        print("\nDetection Summary:")
        for name, count in sorted(counts.items(), key=lambda x: x[1], reverse=True):
            print(f" - {name}: {count}")
    else:
        print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    identify_produce_crowd_timed()
