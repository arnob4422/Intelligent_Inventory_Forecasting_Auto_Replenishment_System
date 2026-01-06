import httpx
import sys
import json

async def test_server(image_path):
    url = "http://localhost:8001/api/detect/realtime?confidence=0.10"
    async with httpx.AsyncClient(timeout=60.0) as client:
        with open(image_path, "rb") as f:
            files = {"file": f}
            response = await client.post(url, files=files)
            if response.status_code == 200:
                data = response.json()
                # Print first 10 detections
                print(f"Total detections: {data.get('count')}")
                print(json.dumps(data.get("detections")[:10], indent=2))
            else:
                print(f"Error: {response.status_code} - {response.text}")

if __name__ == "__main__":
    import asyncio
    if len(sys.argv) > 1:
        asyncio.run(test_server(sys.argv[1]))
    else:
        print("Usage: python call_yolo.py <image_path>")
