
from database import SessionLocal
import models
from sqlalchemy import text

# Create tables if they don't exist (just in case, though app should have done it)
# models.Base.metadata.create_all(bind=engine)

def check_inventory():
    db = SessionLocal()
    try:
        products = db.query(models.Product).all()
        locations = db.query(models.Location).all()
        
        print(f"Found {len(products)} products and {len(locations)} locations.")
        
        for p in products:
            print(f"Checking Product: {p.name} ({p.sku})")
            invs = db.query(models.Inventory).filter(models.Inventory.product_id == p.id).all()
            
            if not invs:
                print(f"  [MISSING] No inventory records found for {p.name}!")
            else:
                found_locs = [i.location_id for i in invs]
                print(f"  Found inventory in locations: {found_locs}")
                
                # Check for missing locations
                missing_locs = [l.id for l in locations if l.id not in found_locs]
                if missing_locs:
                    print(f"  [PARTIAL] Missing inventory for locations: {missing_locs}")

    finally:
        db.close()

if __name__ == "__main__":
    check_inventory()
