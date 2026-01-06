from database import SessionLocal
import models

def check_id_14():
    db = SessionLocal()
    try:
        count = db.query(models.Inventory).filter(models.Inventory.product_id == 14).count()
        print(f"Inventory records for Product ID 14: {count}")
    finally:
        db.close()

if __name__ == "__main__":
    check_id_14()
