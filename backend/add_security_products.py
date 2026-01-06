from database import SessionLocal
import models

def add_security_products():
    db = SessionLocal()
    try:
        products = [
            {"sku": "PROD-024", "name": "CC Camera", "category": "Security", "unit_cost": 4500.0},
            {"sku": "PROD-025", "name": "Fluorescent Light", "category": "Lighting", "unit_cost": 500.0},
            {"sku": "PROD-026", "name": "Office Desk", "category": "Furniture", "unit_cost": 12000.0}
        ]
        
        for p_data in products:
            existing = db.query(models.Product).filter(models.Product.sku == p_data["sku"]).first()
            if not existing:
                new_product = models.Product(**p_data)
                db.add(new_product)
                print(f"Added {p_data['name']} ({p_data['sku']})")
            else:
                print(f"{p_data['name']} ({p_data['sku']}) already exists.")
        
        db.commit()
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_security_products()
