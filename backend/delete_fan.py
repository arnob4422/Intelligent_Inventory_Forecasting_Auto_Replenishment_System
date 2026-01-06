"""
Simple script to delete Fan (PROD-13) product from the database.
Run this from the backend directory with: python -m delete_fan
"""

if __name__ == "__main__":
    from database import SessionLocal
    from models import Product, Inventory, SalesData, Forecast
    
    db = SessionLocal()
    
    try:
        # Find the Fan product by SKU
        product = db.query(Product).filter(Product.sku == 'PROD-13').first()
        
        if product:
            product_id = product.id
            product_name = product.name
            
            print(f"Found product: {product_name} (SKU: {product.sku}, ID: {product_id})")
            
            # Delete related records first (foreign key constraints)
            
            # Delete forecasts
            forecast_count = db.query(Forecast).filter(Forecast.product_id == product_id).delete()
            print(f"  - Deleted {forecast_count} forecast record(s)")
            
            # Delete inventory records
            inventory_count = db.query(Inventory).filter(Inventory.product_id == product_id).delete()
            print(f"  - Deleted {inventory_count} inventory record(s)")
            
            # Delete sales data
            sales_count = db.query(SalesData).filter(SalesData.product_id == product_id).delete()
            print(f"  - Deleted {sales_count} sales record(s)")
            
            # Finally delete the product
            db.delete(product)
            db.commit()
            
            print(f"\n✅ Successfully deleted product: {product_name}")
            print("You can add it back later through the UI if needed.")
        else:
            print("❌ Product PROD-13 (Fan) not found in database")
            
    except Exception as e:
        print(f"❌ Error: {e}")
        db.rollback()
    finally:
        db.close()
