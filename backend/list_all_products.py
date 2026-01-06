"""
List all products in the database to see what SKUs are already in use.
"""

if __name__ == "__main__":
    from database import SessionLocal
    from models import Product
    
    db = SessionLocal()
    
    try:
        products = db.query(Product).order_by(Product.sku).all()
        
        print(f"Total products in database: {len(products)}\n")
        print("Existing products:")
        print("-" * 60)
        
        for product in products:
            print(f"SKU: {product.sku:15} | Name: {product.name:30} | Category: {product.category or 'N/A'}")
        
        print("-" * 60)
        
        # Suggest next available SKU
        existing_numbers = []
        for p in products:
            if p.sku.startswith('PROD-'):
                try:
                    num = int(p.sku.split('-')[1])
                    existing_numbers.append(num)
                except:
                    pass
        
        if existing_numbers:
            next_num = max(existing_numbers) + 1
            print(f"\n✅ Next available SKU: PROD-{next_num:03d}")
        
    except Exception as e:
        print(f"Error: {e}")
    finally:
        db.close()
