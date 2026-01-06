from database import SessionLocal
import models

def rename_ac():
    db = SessionLocal()
    try:
        # 1. Rename the main product
        ac_product = db.query(models.Product).filter(models.Product.name == "AC").first()
        if ac_product:
            print(f"Renaming product ID {ac_product.id} from 'AC' to 'Air Conditioner'")
            ac_product.name = "Air Conditioner"
            db.commit()
            print("Successfully renamed product.")
        else:
            print("Product 'AC' not found in database (may already be renamed).")
            
        # 2. Update AI Label Mappings that might point to AC
        # (Though usually we'll just let the backend mapping dictionary handle the AI part)
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    rename_ac()
