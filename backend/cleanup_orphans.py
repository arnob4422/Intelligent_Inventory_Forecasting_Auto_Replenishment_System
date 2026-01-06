from database import SessionLocal
import models

def cleanup_orphans():
    db = SessionLocal()
    try:
        # 1. Identify Products without any Inventory Records
        inventory_product_ids = {item.product_id for item in db.query(models.Inventory.product_id).all()}
        orphan_products = db.query(models.Product).filter(~models.Product.id.in_(inventory_product_ids)).all()
        
        if not orphan_products:
            print("No orphan products found.")
            return

        print(f"Found {len(orphan_products)} orphan products. Cleaning up...")
        
        deleted_count = 0
        for p in orphan_products:
            print(f"Deleting Orphan: ID {p.id}, SKU {p.sku}, Name {p.name}")
            
            # Delete related data to satisfy foreign keys (though orphans shouldn't have much)
            db.query(models.Forecast).filter(models.Forecast.product_id == p.id).delete()
            db.query(models.SalesData).filter(models.SalesData.product_id == p.id).delete()
            db.query(models.Anomaly).filter(models.Anomaly.product_id == p.id).delete()
            db.query(models.ReplenishmentRecommendation).filter(models.ReplenishmentRecommendation.product_id == p.id).delete()
            db.query(models.AILabelMapping).filter(models.AILabelMapping.product_id == p.id).delete()
            db.query(models.ProductEmbedding).filter(models.ProductEmbedding.product_id == p.id).delete()
            
            # Finally delete the product
            db.delete(p)
            deleted_count += 1
            
        db.commit()
        print(f"Successfully deleted {deleted_count} orphan product(s).")
        
    except Exception as e:
        print(f"Error during cleanup: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    cleanup_orphans()
