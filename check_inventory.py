import sqlite3
from pathlib import Path

db_path = Path("data/inventory.db")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

product_id = 11
cursor.execute("SELECT * FROM inventory WHERE product_id = ?", (product_id,))
inventory = cursor.fetchall()

if not inventory:
    print(f"No inventory records found for product ID {product_id}")
else:
    for inv in inventory:
        print(inv)

conn.close()
