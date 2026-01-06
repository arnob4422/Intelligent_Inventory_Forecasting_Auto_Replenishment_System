from database import SessionLocal
import models

def delete_prod16():
    db = SessionLocal()
    try:
        p = db.query(models.Product).filter(models.Product.id == 16).first()
        if not p:
            print("Product 16 not found.")
            return

        print(f"Deleting: {p.name} ({p.sku})")
        
        # Cascades for safety 
        db.query(models.Inventory).filter(models.Inventory.product_id == p.id).delete()
        db.query(models.SalesData).filter(models.SalesData.product_id == p.id).delete()
        db.query(models.Forecast).filter(models.Forecast.product_id == p.id).delete()
        db.query(models.Anomaly).filter(models.Anomaly.product_id == p.id).delete()
        db.query(models.ReplenishmentRecommendation).filter(models.ReplenishmentRecommendation.product_id == p.id).delete()
        
        db.delete(p)
        db.commit()
        print("Product 16 deleted.")
        
    except Exception as e:
        print(f"Error: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_prod16()
