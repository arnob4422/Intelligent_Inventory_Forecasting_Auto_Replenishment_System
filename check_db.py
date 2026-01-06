import sqlite3
import os
from pathlib import Path

db_path = Path("data/inventory.db")
if not db_path.exists():
    print(f"Error: Database not found at {db_path}")
    exit(1)

print(f"Checking database at {db_path}...")
try:
    # Try to open with a short timeout to check for locks
    conn = sqlite3.connect(db_path, timeout=1)
    cursor = conn.cursor()
    cursor.execute("SELECT name FROM sqlite_master WHERE type='table';")
    tables = cursor.fetchall()
    print(f"Connection successful. Tables found: {len(tables)}")
    for t in tables:
        print(f"  - {t[0]}")
    conn.close()
except sqlite3.OperationalError as e:
    print(f"Database is likely LOCKED or inaccessible: {e}")
except Exception as e:
    print(f"Error: {e}")
