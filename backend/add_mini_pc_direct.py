import sqlite3
import os

def add_mini_pc_direct():
    db_path = "data/inventory.db"
    if not os.path.exists(db_path):
        db_path = "../data/inventory.db" # try relative if in backend
    
    print(f"Connecting to {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check if exists
        cursor.execute("SELECT * FROM products WHERE name = 'Mini PC'")
        if cursor.fetchone():
            print("'Mini PC' already exists.")
        else:
            cursor.execute("""
                INSERT INTO products (sku, name, category, lead_time_days, safety_stock_level, unit_cost, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """, ("PROD-027", "Mini PC", "Electronics", 7, 5, 25000.0))
            conn.commit()
            print("Successfully added 'Mini PC' (SKU: PROD-027)")
        
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    add_mini_pc_direct()
