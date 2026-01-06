from database import SessionLocal
from models import Product
from datetime import datetime

def force_seed():
    db = SessionLocal()
    essentials = [
        {"name": "Coffee Cup", "sku": "MUG-001", "category": "Retail"},
        {"name": "Banana", "sku": "FRU-001", "category": "Fruit"},
        {"name": "Red Apple", "sku": "FRU-002", "category": "Fruit"},
        {"name": "Green Apple", "sku": "FRU-003", "category": "Fruit"},
        {"name": "Orange", "sku": "FRU-004", "category": "Fruit"},
        {"name": "Yellow Lemon", "sku": "FRU-005", "category": "Fruit"},
        {"name": "Produce Basket", "sku": "FIX-001", "category": "Fixture"},
        {"name": "Stool", "sku": "FIX-002", "category": "Fixture"},
        {"name": "Analog Clock", "sku": "CLK-001", "category": "Retail"}
    ]
    
    added = 0
    for item in essentials:
        # Check if exists by name (case-insensitive)
        existing = db.query(Product).filter(Product.name.ilike(item["name"])).first()
        if not existing:
            # Check if SKU exists to avoid IntegrityError
            sku_exists = db.query(Product).filter(Product.sku == item["sku"]).first()
            safe_sku = item["sku"] if not sku_exists else f"{item['sku']}-{datetime.now().strftime('%M%S')}"
            
            new_p = Product(
                sku=safe_sku,
                name=item["name"],
                category=item["category"],
                unit_cost=100.0,
                safety_stock_level=10
            )
            db.add(new_p)
            added += 1
            print(f"Added: {item['name']}")
    
    db.commit()
    print(f"Force seed complete. Added {added} items.")
    db.close()

if __name__ == "__main__":
    force_seed()
