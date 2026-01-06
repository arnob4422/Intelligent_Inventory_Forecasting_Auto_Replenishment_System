from database import SessionLocal
import models
from sqlalchemy import or_

def delete_range():
    db = SessionLocal()
    try:
        # Define the SKU range or IDs based on user request "007 to 15"
        # Based on previous check, these correspond to IDs 7 to 15
        target_ids = list(range(7, 16)) # 7 to 15 inclusive
        
        print(f"Targeting Product IDs for deletion: {target_ids}")
        
        products = db.query(models.Product).filter(models.Product.id.in_(target_ids)).all()
        
        if not products:
            print("No matching products found to delete.")
            return

        print(f"Found {len(products)} products to delete.")
        for p in products:
            print(f" - Deleting: {p.name} ({p.sku})")
            
            # Delete related records manually to ensure no FK constraint errors
            # 1. Inventory
            db.query(models.Inventory).filter(models.Inventory.product_id == p.id).delete()
            # 2. Sales Data
            db.query(models.SalesData).filter(models.SalesData.product_id == p.id).delete()
            # 3. Forecasts
            db.query(models.Forecast).filter(models.Forecast.product_id == p.id).delete()
            # 4. Anomalies
            db.query(models.Anomaly).filter(models.Anomaly.product_id == p.id).delete()
            # 5. Recommendations
            db.query(models.ReplenishmentRecommendation).filter(models.ReplenishmentRecommendation.product_id == p.id).delete()
            
            # Finally delete the product
            db.delete(p)
            
        db.commit()
        print("Deletion completed successfully.")

    except Exception as e:
        print(f"An error occurred: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    delete_range()
