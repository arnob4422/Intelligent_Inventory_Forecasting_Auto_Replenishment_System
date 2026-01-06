from database import SessionLocal
import models

def dump_inventory():
    db = SessionLocal()
    try:
        items = db.query(models.Inventory).all()
        print(f"Total rows in Inventory table: {len(items)}")
        pids = sorted(list(set(i.product_id for i in items)))
        print(f"Unique product IDs in Inventory: {len(pids)}")
        print(f"Product IDs: {pids}")
        
        # Check counts per product
        for pid in pids:
            count = db.query(models.Inventory).filter(models.Inventory.product_id == pid).count()
            print(f" - Product ID {pid}: {count} records")
            
    finally:
        db.close()

if __name__ == "__main__":
    dump_inventory()
