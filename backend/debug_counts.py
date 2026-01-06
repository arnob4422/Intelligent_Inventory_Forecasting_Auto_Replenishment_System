from database import SessionLocal
import models
from sqlalchemy import func

def count_inventory_products():
    db = SessionLocal()
    try:
        unique_ids = db.query(models.Inventory.product_id).distinct().all()
        ids = [i[0] for i in unique_ids]
        print(f"Unique product IDs in Inventory: {len(ids)}")
        print(f"IDs: {ids}")
        
        for pid in ids:
            p = db.query(models.Product).filter(models.Product.id == pid).first()
            if p:
                print(f" - ID: {pid}, Name: {p.name}")
            else:
                print(f" - ID: {pid}, Name: NOT FOUND IN PRODUCTS TABLE")
                
    finally:
        db.close()

if __name__ == "__main__":
    count_inventory_products()
