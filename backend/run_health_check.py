import sys
import os

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from fastapi.testclient import TestClient
from main import app
from database import SessionLocal
from sqlalchemy import text

client = TestClient(app)

def test_health():
    print("Testing /api/health...")
    response = client.get("/api/health")
    if response.status_code == 200:
        print("✅ Health Check Passed:", response.json())
    else:
        print("❌ Health Check Failed:", response.status_code, response.text)

def test_db_connection():
    print("\nTesting Database Connection...")
    try:
        db = SessionLocal()
        result = db.execute(text("SELECT 1"))
        print("✅ Database Connection Passed")
        db.close()
    except Exception as e:
        print("❌ Database Connection Failed:", str(e))

def test_stats():
    print("\nTesting /api/stats...")
    try:
        response = client.get("/api/stats")
        if response.status_code == 200:
            data = response.json()
            print("✅ Stats Endpoint Passed")
            print(f"   - Products: {data.get('products')}")
            print(f"   - Locations: {data.get('locations')}")
            print(f"   - Sales Records: {data.get('sales_records')}")
        else:
            print("❌ Stats Endpoint Failed:", response.status_code, response.text)
    except Exception as e:
         print("❌ Stats Endpoint Exception:", str(e))

if __name__ == "__main__":
    print("🚀 Starting Backend Health Check\n")
    test_health()
    test_db_connection()
    test_stats()
    print("\n✅ Health Check Complete")
