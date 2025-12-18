import sys
import os
from pathlib import Path

# Add backend directory to path
backend_dir = Path(__file__).parent
sys.path.insert(0, str(backend_dir))

from database import engine, Base, SessionLocal
import models
from datetime import datetime, timedelta
import random

def seed_database():
    """Seed database with sample data"""
    print("🌱 Seeding database with sample data...")
    
    # Create tables
    Base.metadata.create_all(bind=engine)
    
    db = SessionLocal()
    
    try:
        # Check if data already exists
        if db.query(models.Product).count() > 0:
            print("⚠️  Database already has data. Skipping seed.")
            return
        
        # Create locations
        locations = [
            models.Location(code="WH-001", name="Main Warehouse", type="warehouse", address="123 Main St"),
            models.Location(code="WH-002", name="East Warehouse", type="warehouse", address="456 East Ave"),
            models.Location(code="ST-001", name="Downtown Store", type="store", address="789 Downtown Blvd"),
            models.Location(code="ST-002", name="Mall Store", type="store", address="321 Mall Rd"),
        ]
        db.add_all(locations)
        db.commit()
        print(f"✅ Created {len(locations)} locations")
        
        # Create products
        products = [
            models.Product(sku="PROD-001", name="Laptop Computer", category="Electronics", lead_time_days=7, safety_stock_level=50, unit_cost=800),
            models.Product(sku="PROD-002", name="Wireless Mouse", category="Electronics", lead_time_days=3, safety_stock_level=100, unit_cost=25),
            models.Product(sku="PROD-003", name="Office Chair", category="Furniture", lead_time_days=14, safety_stock_level=20, unit_cost=150),
            models.Product(sku="PROD-004", name="Desk Lamp", category="Furniture", lead_time_days=5, safety_stock_level=30, unit_cost=40),
            models.Product(sku="PROD-005", name="Notebook Pack", category="Stationery", lead_time_days=2, safety_stock_level=200, unit_cost=5),
            models.Product(sku="PROD-006", name="Pen Set", category="Stationery", lead_time_days=2, safety_stock_level=150, unit_cost=3),
        ]
        db.add_all(products)
        db.commit()
        print(f"✅ Created {len(products)} products")
        
        # Create inventory for each product-location combination
        inventory_records = []
        for product in products:
            for location in locations:
                initial_stock = random.randint(50, 300)
                reserved = random.randint(0, 20)
                inventory_records.append(
                    models.Inventory(
                        product_id=product.id,
                        location_id=location.id,
                        current_stock=initial_stock,
                        reserved_stock=reserved,
                        available_stock=initial_stock - reserved
                    )
                )
        db.add_all(inventory_records)
        db.commit()
        print(f"✅ Created {len(inventory_records)} inventory records")
        
        # Create historical sales data (90 days)
        sales_records = []
        start_date = datetime.now() - timedelta(days=90)
        
        for product in products:
            for location in locations:
                # Base demand varies by product
                base_demand = {
                    "PROD-001": 5,   # Laptops - low volume
                    "PROD-002": 20,  # Mouse - medium volume
                    "PROD-003": 3,   # Chairs - low volume
                    "PROD-004": 8,   # Lamps - medium volume
                    "PROD-005": 50,  # Notebooks - high volume
                    "PROD-006": 40,  # Pens - high volume
                }.get(product.sku, 10)
                
                for day in range(90):
                    current_date = start_date + timedelta(days=day)
                    
                    # Add seasonality (higher on weekdays)
                    weekday_multiplier = 1.3 if current_date.weekday() < 5 else 0.7
                    
                    # Add some randomness
                    daily_demand = int(base_demand * weekday_multiplier * random.uniform(0.7, 1.3))
                    
                    # Occasional spikes (5% chance)
                    if random.random() < 0.05:
                        daily_demand = int(daily_demand * random.uniform(2, 3))
                    
                    revenue = daily_demand * product.unit_cost * random.uniform(1.2, 1.5)  # Markup
                    
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
        print(f"✅ Created {len(sales_records)} sales records")
        
        print("🎉 Database seeding completed successfully!")
        
    except Exception as e:
        print(f"❌ Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()


if __name__ == "__main__":
    seed_database()
