from database import SessionLocal
from models import Product, Inventory
from datetime import datetime

def add_vaseline():
    db = SessionLocal()
    try:
        # Check if product already exists
        vaseline = db.query(Product).filter(Product.name == "Vaseline").first()
        if vaseline:
            print(f"Product 'Vaseline' already exists with SKU: {vaseline.sku}")
            return

        # Create product
        new_product = Product(
            sku="PROD-023",
            name="Vaseline",
            category="Personal Care",
            lead_time_days=5,
            safety_stock_level=10,
            unit_cost=3.50
        )
        db.add(new_product)
        db.flush() # Get the ID

        # Initialize inventory
        new_inventory = Inventory(
            product_id=new_product.id,
            location_id=1, # Default warehouse
            current_stock=25,
            available_stock=25
        )
        db.add(new_inventory)
        
        db.commit()
        print(f"Successfully added 'Vaseline' (SKU: PROD-023) to database.")
        
    except Exception as e:
        db.rollback()
        print(f"Error adding Vaseline: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    add_vaseline()
