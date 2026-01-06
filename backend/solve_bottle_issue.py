from sqlalchemy.orm import Session
from database import SessionLocal, engine
import models

# Create tables if they don't exist
models.Base.metadata.create_all(bind=engine)

def solve_bottle_detection():
    """
    Add Water Bottle product and create AI label mapping for 'bottle'
    """
    db = SessionLocal()
    
    try:
        # Check if Water Bottle product already exists
        water_bottle = db.query(models.Product).filter(models.Product.name == "Water Bottle").first()
        
        if not water_bottle:
            # Get next SKU number
            count = db.query(models.Product).count()
            sku = f"PROD-{count + 1:03d}"
            
            # Create Water Bottle product
            water_bottle = models.Product(
                sku=sku,
                name="Water Bottle",
                category="Beverages",
                unit_cost=1.50,
                lead_time_days=3,
                safety_stock_level=20
            )
            db.add(water_bottle)
            db.commit()
            db.refresh(water_bottle)
            print(f"✅ Created product: Water Bottle (SKU: {sku}, ID: {water_bottle.id})")
        else:
            print(f"ℹ️  Water Bottle product already exists (ID: {water_bottle.id})")
        
        # Check if mapping already exists
        existing_mapping = db.query(models.AILabelMapping).filter(
            models.AILabelMapping.ai_label == "bottle"
        ).first()
        
        if not existing_mapping:
            # Create AI label mapping
            mapping = models.AILabelMapping(
                ai_label="bottle",
                product_id=water_bottle.id
            )
            db.add(mapping)
            db.commit()
            print(f"✅ Created AI label mapping: 'bottle' -> 'Water Bottle' (Product ID: {water_bottle.id})")
        else:
            print(f"ℹ️  AI label mapping for 'bottle' already exists (maps to Product ID: {existing_mapping.product_id})")
        
        # Verify the mapping
        verify_mapping = db.query(models.AILabelMapping).filter(
            models.AILabelMapping.ai_label == "bottle"
        ).first()
        
        if verify_mapping:
            product = db.query(models.Product).filter(models.Product.id == verify_mapping.product_id).first()
            print(f"\n🔍 Verification:")
            print(f"   AI Label: 'bottle' -> Product: '{product.name}' (ID: {product.id})")
            print(f"\n✨ Water bottle detection is now configured!")
            print(f"   The camera will now identify bottles as 'Water Bottle'")
        
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    print("🔧 Solving water bottle detection issue...\n")
    solve_bottle_detection()
