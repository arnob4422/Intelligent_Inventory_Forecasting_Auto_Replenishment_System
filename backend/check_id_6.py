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
        
        print("\nMAPPINGS for ID 6:")
        cursor.execute("SELECT * FROM ai_label_mappings WHERE product_id = 6")
        print(cursor.fetchall())
        
        print("\nEMBEDDINGS for ID 6:")
        cursor.execute("SELECT * FROM product_embeddings WHERE product_id = 6")
        print(cursor.fetchall())
        
        print("\nANYTHING with 'pen' in ai_label:")
        cursor.execute("SELECT * FROM ai_label_mappings WHERE ai_label LIKE '%pen%'")
        print(cursor.fetchall())

        conn.close()
    except Exception as e:
        print(f"Error: {e}")

check_db("../data/inventory.db")
