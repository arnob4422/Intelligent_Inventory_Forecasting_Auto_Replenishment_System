from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List
from datetime import datetime
from database import get_db
from auth import get_current_user, require_role
import models
import schemas

router = APIRouter(prefix="/api/sales", tags=["Sales Data"])

@router.get("/", response_model=List[schemas.SalesDataResponse])
def get_sales_data(
    product_id: int = None,
    location_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get sales data with optional filters"""
    query = db.query(models.SalesData)
    
    if product_id:
        query = query.filter(models.SalesData.product_id == product_id)
    if location_id:
        query = query.filter(models.SalesData.location_id == location_id)
    
    sales = query.order_by(models.SalesData.date.desc()).offset(skip).limit(limit).all()
    return sales

@router.post("/", response_model=schemas.SalesDataResponse)
def create_sales_record(
    sales: schemas.SalesDataCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """Create sales record (requires manager role)"""
    db_sales = models.SalesData(**sales.model_dump())
    db.add(db_sales)
    db.commit()
    db.refresh(db_sales)
    return db_sales

import pandas as pd
import io

@router.post("/bulk-upload")
def bulk_upload_sales(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """
    Bulk upload sales data from CSV
    Expected columns: product_sku, location_code, date, quantity_sold, revenue
    """
    try:
        # 1. Read the uploaded file synchronously
        content = file.file.read()
        df = pd.read_csv(io.BytesIO(content))
        
        required_cols = ['product_sku', 'location_code', 'date', 'quantity_sold']
        for col in required_cols:
            if col not in df.columns:
                raise HTTPException(status_code=400, detail=f"Missing required column: {col}")
        
        # 2. Process rows
        records_added = 0
        for _, row in df.iterrows():
            # Find product
            product = db.query(models.Product).filter(models.Product.sku == str(row['product_sku'])).first()
            if not product:
                continue
                
            # Find location
            location = db.query(models.Location).filter(models.Location.code == str(row['location_code'])).first()
            if not location:
                continue
            
            # Create sales record
            db_sales = models.SalesData(
                product_id=product.id,
                location_id=location.id,
                date=pd.to_datetime(row['date']),
                quantity_sold=int(row['quantity_sold']),
                revenue=float(row.get('revenue', 0.0))
            )
            db.add(db_sales)
            records_added += 1
            
        db.commit()
        return {"message": f"Successfully uploaded {records_added} sales records", "total_processed": len(df)}
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Bulk upload failed: {str(e)}")

@router.get("/analytics/summary")
def get_sales_summary(
    product_id: int = None,
    location_id: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get sales analytics summary"""
    query = db.query(models.SalesData)
    
    if product_id:
        query = query.filter(models.SalesData.product_id == product_id)
    if location_id:
        query = query.filter(models.SalesData.location_id == location_id)
    
    sales_data = query.all()
    
    if not sales_data:
        return {
            "total_sales": 0,
            "total_revenue": 0,
            "avg_daily_sales": 0,
            "records_count": 0
        }
    
    total_quantity = sum(s.quantity_sold for s in sales_data)
    total_revenue = sum(s.revenue for s in sales_data)
    
    # Calculate date range
    dates = [s.date for s in sales_data]
    date_range = (max(dates) - min(dates)).days + 1
    avg_daily_sales = total_quantity / date_range if date_range > 0 else 0
    
    return {
        "total_sales": total_quantity,
        "total_revenue": total_revenue,
        "avg_daily_sales": avg_daily_sales,
        "records_count": len(sales_data),
        "date_range_days": date_range
    }
