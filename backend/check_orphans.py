from database import SessionLocal
import models

def check_orphans():
    db = SessionLocal()
    try:
        products = db.query(models.Product).all()
        inventory_items = db.query(models.Inventory).all()
        
        print(f"Total Products: {len(products)}")
        print(f"Total Inventory Records: {len(inventory_items)}")
        
        inv_product_ids = set(item.product_id for item in inventory_items)
        
        print("\n--- Products without Inventory Records (Orphans) ---")
        orphans = []
        for p in products:
            if p.id not in inv_product_ids:
                print(f"ID: {p.id}, SKU: {p.sku}, Name: {p.name}")
                orphans.append(p)
                
        if not orphans:
            print("None found.")
            
    finally:
        db.close()

if __name__ == "__main__":
    check_orphans()
