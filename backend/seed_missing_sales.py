import sys
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent.parent if "backend" in str(Path(__file__)) else Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

from database import SessionLocal
import models
from datetime import datetime, timedelta
import random

def seed_missing_sales():
    print("🌱 Seeding missing sales data...")
    db = SessionLocal()
    try:
        # Get products with 0 sales
        products_with_no_sales = db.query(models.Product).outerjoin(models.SalesData).filter(models.SalesData.id == None).all()
        
        if not products_with_no_sales:
            print("✅ All products already have sales data.")
            return

        print(f"Found {len(products_with_no_sales)} products with no sales data.")
        
        locations = db.query(models.Location).all()
        if not locations:
            print("❌ No locations found. Cannot seed sales.")
            return

        start_date = datetime.now() - timedelta(days=90)
        sales_records = []

        for product in products_with_no_sales:
            print(f"  - Seeding data for: {product.name} ({product.sku})")
            for location in locations:
                base_demand = random.randint(5, 25)
                for day in range(90):
                    current_date = start_date + timedelta(days=day)
                    weekday_multiplier = 1.3 if current_date.weekday() < 5 else 0.7
                    daily_demand = int(base_demand * weekday_multiplier * random.uniform(0.7, 1.3))
                    
                    if random.random() < 0.05:
                        daily_demand = int(daily_demand * random.uniform(2, 3))
                    
                    revenue = daily_demand * product.unit_cost * random.uniform(1.2, 1.5)
                    
                    sales_records.append(
                        models.SalesData(
                            product_id=product.id,
                            location_id=location.id,
                            date=current_date,
                            quantity_sold=daily_demand,
                            revenue=revenue
                        )
                    )
        
        db.add_all(sales_records)
        db.commit()
        print(f"✅ Successfully seeded {len(sales_records)} sales records.")
        
    except Exception as e:
        print(f"❌ Error seeding missing sales: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    seed_missing_sales()
