import sqlite3
import os
from pathlib import Path

db_path = Path('data/inventory.db')
if not db_path.exists():
    db_path = Path('../data/inventory.db')

conn = sqlite3.connect(db_path)
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

print("=== PRODUCTS ===")
cursor.execute("SELECT id, sku, name, category FROM products")
for row in cursor.fetchall():
    print(dict(row))

print("\n=== AI LABEL MAPPINGS ===")
cursor.execute("SELECT m.id, m.ai_label, p.name as product_name, m.product_id FROM ai_label_mappings m JOIN products p ON m.product_id = p.id")
for row in cursor.fetchall():
    print(dict(row))

print("\n=== PRODUCT EMBEDDINGS (Training) ===")
cursor.execute("SELECT e.id, p.name as product_name, e.label, e.product_id FROM product_embeddings e JOIN products p ON e.product_id = p.id")
for row in cursor.fetchall():
    print(dict(row))

conn.close()
