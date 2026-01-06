from database import SessionLocal
import models

def list_all_products():
    db = SessionLocal()
    try:
        products = db.query(models.Product).all()
        print(f"Total products in 'products' table: {len(products)}")
        for p in products:
            inv_count = db.query(models.Inventory).filter(models.Inventory.product_id == p.id).count()
            print(f"ID: {p.id}, SKU: {p.sku}, Name: {p.name}, Inventory Records: {inv_count}")
    finally:
        db.close()

if __name__ == "__main__":
    list_all_products()
