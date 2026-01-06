import sqlite3
import os

def check_db(path):
    print(f"\n--- Checking {path} ---")
    if not os.path.exists(path):
        print("Does not exist.")
        return
    try:
        conn = sqlite3.connect(path)
        cursor = conn.cursor()
        
        print("\nALL MAPPINGS:")
        cursor.execute("SELECT m.id, m.ai_label, m.product_id, p.name FROM ai_label_mappings m JOIN products p ON m.product_id = p.id")
        for row in cursor.fetchall():
            print(row)
            
        print("\nALL EMBEDDINGS (Shortened):")
        cursor.execute("SELECT e.id, e.label, e.product_id, p.name FROM product_embeddings e JOIN products p ON e.product_id = p.id")
        for row in cursor.fetchall():
            print(row)
            
        conn.close()
    except Exception as e:
        print(f"Error checking {path}: {e}")

check_db("../data/inventory.db")
