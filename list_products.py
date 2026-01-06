import sqlite3
from pathlib import Path

db_path = Path("data/inventory.db")
if not db_path.exists():
    db_path = Path("backend/data/inventory.db")

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("""
    SELECT p.id, p.sku, p.name, COUNT(s.id) 
    FROM products p 
    LEFT JOIN sales_data s ON p.id = s.product_id 
    GROUP BY p.id
""")
rows = cursor.fetchall()

print(f"{'ID':<5} {'SKU':<15} {'Name':<30} {'Sales'}")
print("-" * 60)
for row in rows:
    print(f"{row[0]:<5} {row[1]:<15} {row[2]:<30} {row[3]}")

conn.close()
