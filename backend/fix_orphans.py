from database import SessionLocal
import models

def fix_orphans():
    db = SessionLocal()
    try:
        # Get default location
        default_location = db.query(models.Location).first()
        if not default_location:
            print("Error: No locations found. Cannot create inventory.")
            return

        print(f"Using default location: {default_location.name} (ID: {default_location.id})")

        products = db.query(models.Product).all()
        inventory_items = db.query(models.Inventory).all()
        
        inv_product_ids = set(item.product_id for item in inventory_items)
        
        orphans = []
        for p in products:
            if p.id not in inv_product_ids:
                orphans.append(p)
        
        if not orphans:
            print("No orphans found.")
            return

        print(f"Found {len(orphans)} orphans. Creating default inventory records...")
        
        for p in orphans:
            print(f"Creating inventory for: {p.name} ({p.sku})")
            new_inv = models.Inventory(
                product_id=p.id,
                location_id=default_location.id,
                current_stock=0,
                reserved_stock=0,
                available_stock=0
            )
            db.add(new_inv)
        
        db.commit()
        print("Successfully created missing inventory records.")
            
    finally:
        db.close()

if __name__ == "__main__":
    fix_orphans()
