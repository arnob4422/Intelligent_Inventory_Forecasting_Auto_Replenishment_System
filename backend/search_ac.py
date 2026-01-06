from database import SessionLocal
import models

def search_ac():
    db = SessionLocal()
    try:
        ac_prod = db.query(models.Product).filter(models.Product.name.ilike('%AC%')).all()
        print("=== AC PRODUCTS ===")
        for p in ac_prod:
            print(f"ID: {p.id}, Name: {p.name}, Category: {p.category}")
            
        ac_mappings = db.query(models.AILabelMapping).all()
        print("\n=== AC MAPPINGS ===")
        for m in ac_mappings:
            p = db.query(models.Product).filter(models.Product.id == m.product_id).first()
            if p and ('AC' in p.name.upper() or 'AC' in m.ai_label.upper()):
                print(f"AI Label: '{m.ai_label}' -> Product: '{p.name}'")
                
    finally:
        db.close()

if __name__ == "__main__":
    search_ac()
