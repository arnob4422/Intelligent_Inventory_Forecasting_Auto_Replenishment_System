import requests
import json

def check_stats_api():
    try:
        response = requests.get("http://localhost:8000/api/stats")
        if response.status_code == 200:
            data = response.json()
            print(f"API Stats Result:")
            print(f" - products: {data.get('products')}")
            print(f" - locations: {data.get('locations')}")
            # print(json.dumps(data, indent=2))
        else:
            print(f"Failed to fetch stats: {response.status_code}")
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    check_stats_api()
