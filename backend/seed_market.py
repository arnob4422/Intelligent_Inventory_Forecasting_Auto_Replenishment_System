from database import SessionLocal
import models

def seed_market():
    db = SessionLocal()
    
    # Check if category exists or create it
    market_cat = "Market & Seafood"
    
    products = [
        {"name": "Fresh Fish", "sku": "SEA-001", "category": market_cat, "unit_cost": 12.00},
        {"name": "Salmon Fillet", "sku": "SEA-002", "category": market_cat, "unit_cost": 25.00},
        {"name": "Price Tag", "sku": "GEN-LBL", "category": "Store Misc", "unit_cost": 0.05},
        {"name": "Seafood Package", "sku": "SEA-PKG", "category": market_cat, "unit_cost": 5.00},
    ]
    
    for p_data in products:
        existing = db.query(models.Product).filter(models.Product.name == p_data["name"]).first()
        if not existing:
            new_p = models.Product(**p_data)
            db.add(new_p)
            db.flush() # Get ID
            
            # Add initial inventory
            new_inv = models.Inventory(
                product_id=new_p.id,
                location_id=1,
                current_stock=100,
                available_stock=100
            )
            db.add(new_inv)
            print(f"✅ Added {p_data['name']}")
        else:
            print(f"ℹ️ {p_data['name']} already exists")
            
    db.commit()
    db.close()

if __name__ == "__main__":
    seed_market()
