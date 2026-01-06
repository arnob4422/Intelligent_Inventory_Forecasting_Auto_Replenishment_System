import sqlite3
import os

def reseed_clocks():
    path = "../data/inventory.db"
    if not os.path.exists(path):
        print("DB not found")
        return
        
    conn = sqlite3.connect(path)
    cursor = conn.cursor()
    
    # 1. Ensure 'Clock' product exists
    cursor.execute("SELECT id FROM products WHERE name = 'Clock' OR sku = 'PROD-031'")
    clock = cursor.fetchone()
    if not clock:
        print("Seeding Clock product...")
        cursor.execute("INSERT INTO products (sku, name, category, unit_cost) VALUES ('PROD-031', 'Clock', 'Office Decor', 15.0)")
        clock_id = cursor.lastrowid
    else:
        clock_id = clock[0]
        print(f"Clock product exists with ID {clock_id}")
        
    # 2. Add explicit mapping
    cursor.execute("INSERT OR IGNORE INTO ai_label_mappings (ai_label, product_id) VALUES ('clock', ?)", (clock_id,))
    cursor.execute("INSERT OR IGNORE INTO ai_label_mappings (ai_label, product_id) VALUES ('alarm clock', ?)", (clock_id,))
    cursor.execute("INSERT OR IGNORE INTO ai_label_mappings (ai_label, product_id) VALUES ('watch', ?)", (clock_id,))
    
    conn.commit()
    conn.close()
    print("Reseed complete")

reseed_clocks()
