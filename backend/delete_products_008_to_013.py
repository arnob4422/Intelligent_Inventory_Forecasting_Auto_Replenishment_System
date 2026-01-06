"""
Delete products PROD-008 through PROD-013 from the database.
Run with virtual environment activated: python delete_products_008_to_013.py
"""

if __name__ == "__main__":
    from database import SessionLocal
    from models import Product, Inventory, SalesData, Forecast
    
    db = SessionLocal()
    
    # Products to delete (PROD-008 to PROD-013)
    skus_to_delete = ['PROD-008', 'PROD-009', 'PROD-010', 'PROD-011', 'PROD-012', 'PROD-013']
    
    try:
        deleted_count = 0
        
        for sku in skus_to_delete:
            product = db.query(Product).filter(Product.sku == sku).first()
            
            if product:
                product_id = product.id
                product_name = product.name
                
                print(f"\nDeleting: {product_name} ({sku})")
                
                # Delete related records first (foreign key constraints)
                forecast_count = db.query(Forecast).filter(Forecast.product_id == product_id).delete()
                inventory_count = db.query(Inventory).filter(Inventory.product_id == product_id).delete()
                sales_count = db.query(SalesData).filter(SalesData.product_id == product_id).delete()
                
                print(f"  - Deleted {forecast_count} forecast(s), {inventory_count} inventory record(s), {sales_count} sales record(s)")
                
                # Delete the product
                db.delete(product)
                deleted_count += 1
            else:
                print(f"\n⚠️  {sku} not found (skipping)")
        
        # Commit all deletions
        db.commit()
        
        print(f"\n✅ Successfully deleted {deleted_count} product(s)")
        print("You can add them back later through the UI if needed.")
        
    except Exception as e:
        print(f"\n❌ Error: {e}")
        db.rollback()
    finally:
        db.close()
