from database import SessionLocal
import models

def add_mini_pc():
    db = SessionLocal()
    try:
        # Check if Mini PC exists (using SKU PROD-027)
        existing = db.query(models.Product).filter(models.Product.name == "Mini PC").first()
        if not existing:
            new_product = models.Product(
                sku="PROD-027",
                name="Mini PC",
                category="Electronics",
                unit_cost=25000.0
            )
            db.add(new_product)
            db.commit()
            print("Successfully added 'Mini PC' (SKU: PROD-027) to database.")
        else:
            print("'Mini PC' already exists in database.")
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    add_mini_pc()
