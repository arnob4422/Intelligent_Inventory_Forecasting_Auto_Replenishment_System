from database import SessionLocal
from models import Product, Inventory, SalesData

db = SessionLocal()

try:
    # Find the Fan product
    product = db.query(Product).filter(Product.sku == 'PROD-13').first()
    
    if product:
        print(f"Found product: {product.name} (SKU: {product.sku})")
        
        # Delete related inventory records
        inventory_count = db.query(Inventory).filter(Inventory.product_id == product.id).delete()
        print(f"Deleted {inventory_count} inventory record(s)")
        
        # Delete related sales data
        sales_count = db.query(SalesData).filter(SalesData.product_id == product.id).delete()
        print(f"Deleted {sales_count} sales record(s)")
        
        # Delete the product
        db.delete(product)
        db.commit()
        print(f"Successfully deleted product: {product.name}")
    else:
        print("Product PROD-13 not found")
        
except Exception as e:
    print(f"Error: {e}")
    db.rollback()
finally:
    db.close()

