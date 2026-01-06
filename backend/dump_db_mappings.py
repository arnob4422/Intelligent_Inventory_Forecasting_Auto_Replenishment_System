from database import SessionLocal
import models
import json

def dump_db():
    db = SessionLocal()
    try:
        products = db.query(models.Product).all()
        mappings = db.query(models.AILabelMapping).all()
        
        print("=== PRODUCTS ===")
        for p in products:
            print(f"ID: {p.id}, SKU: {p.sku}, Name: {p.name}, Category: {p.category}")
            
        print("\n=== AI LABEL MAPPINGS ===")
        for m in mappings:
            p = db.query(models.Product).filter(models.Product.id == m.product_id).first()
            p_name = p.name if p else "N/A"
            print(f"AI Label: '{m.ai_label}' -> Product: '{p_name}' (ID: {m.product_id})")
            
    finally:
        db.close()

if __name__ == "__main__":
    dump_db()
