from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

def add_water_bottle_inventory():
    """
    Add inventory records for Water Bottle (Product ID 15) across all locations
    """
    db = SessionLocal()
    
    try:
        # Get Water Bottle product
        water_bottle = db.query(models.Product).filter(models.Product.id == 15).first()
        
        if not water_bottle:
            print("❌ Water Bottle product not found (ID: 15)")
            return
        
        print(f"✅ Found product: {water_bottle.name} (SKU: {water_bottle.sku}, ID: {water_bottle.id})")
        
        # Get all locations
        locations = db.query(models.Location).all()
        print(f"\n📍 Found {len(locations)} locations")
        
        # Check existing inventory records
        existing_inv = db.query(models.Inventory).filter(
            models.Inventory.product_id == 15
        ).all()
        
        existing_location_ids = {inv.location_id for inv in existing_inv}
        print(f"   Existing inventory records: {len(existing_inv)}")
        
        # Add inventory for each location
        added_count = 0
        for location in locations:
            if location.id not in existing_location_ids:
                inventory = models.Inventory(
                    product_id=water_bottle.id,
                    location_id=location.id,
                    current_stock=50,  # Starting stock
                    available_stock=50,
                    reserved_stock=0
                )
                db.add(inventory)
                added_count += 1
                print(f"   ✅ Added inventory for {location.name} (Location ID: {location.id})")
            else:
                print(f"   ℹ️  Inventory already exists for {location.name} (Location ID: {location.id})")
        
        if added_count > 0:
            db.commit()
            print(f"\n✨ Successfully added {added_count} inventory record(s)")
        else:
            print(f"\nℹ️  No new inventory records needed")
        
        # Verify final state
        final_inv = db.query(models.Inventory).filter(
            models.Inventory.product_id == 15
        ).all()
        
        print(f"\n🔍 Verification:")
        print(f"   Total inventory records for Water Bottle: {len(final_inv)}")
        for inv in final_inv:
            loc = db.query(models.Location).filter(models.Location.id == inv.location_id).first()
            print(f"   - {loc.name}: {inv.current_stock} units (Available: {inv.available_stock})")
        
        print(f"\n✅ Water Bottle should now appear in Dashboard and Inventory Management!")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Adding Water Bottle inventory records...\n")
    add_water_bottle_inventory()
