from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn

# Import database and models
from database import engine, Base
import models
from auth import initialize_firebase

# Import routes
from routes import (
    products,
    inventory,
    forecast,
    anomalies,
    recommendations,
    simulations,
    sales,
    locations,
    cameras,
    footages,
    camera # [NEW]
)
from ensure_inventory import ensure_all_products_have_inventory


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    print("Starting Intelligent Inventory Forecasting System...")
    
    # Initialize Firebase
    initialize_firebase()
    
    # Create database tables
    print("Creating database tables...")
    Base.metadata.create_all(bind=engine)
    print("Database initialized")
    
    yield
    
    # Shutdown
    print("Shutting down...")


# Create FastAPI app
app = FastAPI(
    title="Intelligent Inventory Forecasting & Auto-Replenishment System",
    description="AI-powered inventory management with demand forecasting, anomaly detection, and auto-replenishment",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount static files
from fastapi.staticfiles import StaticFiles
import os
if not os.path.exists("static"):
    os.makedirs("static")
app.mount("/static", StaticFiles(directory="static"), name="static")

# Include routers
app.include_router(products.router)
app.include_router(inventory.router)
app.include_router(forecast.router)
app.include_router(anomalies.router)
app.include_router(recommendations.router)
app.include_router(simulations.router)
app.include_router(sales.router)
app.include_router(locations.router)
app.include_router(cameras.router)
app.include_router(footages.router)
app.include_router(camera.router) # [NEW]


@app.get("/")
def root():
    """Root endpoint"""
    return {
        "message": "Intelligent Inventory Forecasting & Auto-Replenishment System API",
        "version": "1.0.0",
        "status": "running",
        "docs": "/docs",
        "redoc": "/redoc"
    }


@app.get("/api/health")
def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "inventory-forecasting-api"
    }


@app.get("/api/stats")
def get_stats():
    """Get system statistics including chart data"""
    from database import SessionLocal
    from datetime import datetime, timedelta
    from sqlalchemy import func
    
    # Nudge: Stats logic updated to strictly count products appearing in Inventory
    db = SessionLocal()
    try:
        # Base counts
        # Only count products that have associated inventory records to match management list
        # Using a join ensures we only count products that actually exist in the inventory table
        inventory_product_count = db.query(models.Product).join(models.Inventory).distinct().count()
        
        counts = {
            "products": inventory_product_count,
            "locations": db.query(models.Location).count(),
            "sales_records": db.query(models.SalesData).count(),
            "forecasts": db.query(models.Forecast).count(),
            "anomalies": db.query(models.Anomaly).count(),
            "recommendations": db.query(models.ReplenishmentRecommendation).count(),
            "simulations": db.query(models.SimulationRun).count()
        }
        
        # Activity Data (Sales by day for last 30 days)
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        daily_sales = db.query(
            func.date(models.SalesData.date).label('day'),
            func.sum(models.SalesData.quantity_sold).label('total_sales')
        ).filter(models.SalesData.date >= thirty_days_ago)\
         .group_by(func.date(models.SalesData.date))\
         .order_by('day').all()
        
        activity_data = [{"name": s.day, "sales": s.total_sales} for s in daily_sales]
        
        # Performance Data (Actual vs Forecasted for last 7 days)
        seven_days_ago = datetime.utcnow() - timedelta(days=7)
        performance_data = []
        for i in range(7):
            date = (seven_days_ago + timedelta(days=i)).date()
            actual = db.query(func.sum(models.SalesData.quantity_sold))\
                       .filter(func.date(models.SalesData.date) == date).scalar() or 0
            forecasted = db.query(func.sum(models.Forecast.predicted_quantity))\
                           .filter(func.date(models.Forecast.forecast_date) == date).scalar() or 0
            performance_data.append({
                "name": date.strftime("%b %d"),
                "actual": actual,
                "forecast": forecasted
            })
            
        return {
            **counts,
            "activity_data": activity_data,
            "performance_data": performance_data
        }
    finally:
        db.close()


if __name__ == "__main__":
    uvicorn.run(
        "main:app",
        host="localhost",  # Changed from 0.0.0.0 to localhost for browser compatibility
        port=8000,
        reload=True
    )
