import sqlite3
from pathlib import Path

db_path = Path("backend/data/inventory.db") # Wait, check_db.py said data/inventory.db
# Let's check where it actually is.
if not db_path.exists():
    db_path = Path("data/inventory.db")

print(f"🔍 Checking database at {db_path}...")
conn = sqlite3.connect(db_path)
cursor = conn.cursor()

# Get product ID for PROD-009
cursor.execute("SELECT id, name, sku FROM products WHERE sku = 'PROD-009'")
product = cursor.fetchone()

if product:
    pid, name, sku = product
    print(f"Product: {name} ({sku}), ID: {pid}")
    
    # Count sales records
    cursor.execute("SELECT COUNT(*) FROM sales_data WHERE product_id = ?", (pid,))
    count = cursor.fetchone()[0]
    print(f"Sales records count: {count}")
    
    if count > 0:
        cursor.execute("SELECT date, quantity_sold FROM sales_data WHERE product_id = ? ORDER BY date", (pid,))
        records = cursor.fetchall()
        for r in records:
            print(f"  {r[0]}: {r[1]}")
else:
    print("Product PROD-009 not found.")

conn.close()
