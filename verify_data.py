import sqlite3
import os

db_path = "data/inventory.db"
if os.path.exists(db_path):
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        # Check products
        cursor.execute("SELECT count(*) FROM products")
        product_count = cursor.fetchone()[0]
        
        # Check sales
        cursor.execute("SELECT count(*) FROM sales_data")
        sales_count = cursor.fetchone()[0]
        
        print(f"Products: {product_count}")
        print(f"Sales Records: {sales_count}")
        
        conn.close()
    except Exception as e:
        print(f"Error reading database: {e}")
else:
    print(f"Database not found at {db_path}")
