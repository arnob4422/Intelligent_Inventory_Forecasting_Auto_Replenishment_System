from database import SessionLocal
import models

def list_products():
    db = SessionLocal()
    try:
        products = db.query(models.Product).all()
        print(f"Total Products: {len(products)}")
        print("-" * 30)
        for p in products:
            print(f"ID: {p.id} | SKU: {p.sku} | Name: {p.name}")
    finally:
        db.close()

if __name__ == "__main__":
    list_products()
