from sqlalchemy.orm import Session
import models
from database import SessionLocal

def ensure_all_products_have_inventory(db: Session = None):
    """
    Ensures that every product has an inventory record for every location.
    If a record is missing, it is created with 0 stock.
    """
    should_close = False
    if db is None:
        db = SessionLocal()
        should_close = True
        
    try:
        products = db.query(models.Product).all()
        locations = db.query(models.Location).all()
        
        created_count = 0
        
        for product in products:
            for location in locations:
                # Check if inventory exists
                exists = db.query(models.Inventory).filter(
                    models.Inventory.product_id == product.id,
                    models.Inventory.location_id == location.id
                ).first()
                
                if not exists:
                    # Create missing inventory record
                    new_inventory = models.Inventory(
                        product_id=product.id,
                        location_id=location.id,
                        current_stock=0,
                        reserved_stock=0,
                        available_stock=0
                    )
                    db.add(new_inventory)
                    created_count += 1
        
        if created_count > 0:
            db.commit()
            print(f"✅ Created {created_count} missing inventory records.")
        else:
            print("✅ Inventory consistency check passed (no missing records).")
            
    except Exception as e:
        print(f"❌ Error ensuring inventory consistency: {e}")
        db.rollback()
    finally:
        if should_close:
            db.close()

if __name__ == "__main__":
    ensure_all_products_have_inventory()
