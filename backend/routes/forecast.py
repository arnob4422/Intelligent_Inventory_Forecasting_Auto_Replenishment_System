from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, require_role
import models
import schemas
import pandas as pd
from ml_engine import ForecastingEngine

router = APIRouter(prefix="/api/forecast", tags=["Forecasting"])
engine = ForecastingEngine()

@router.post("/generate", response_model=List[schemas.ForecastResponse])
def generate_forecast(
    request: schemas.ForecastRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """
    Generate demand forecast for a product using ML
    """
    # 1. Fetch historical sales data
    query = db.query(models.SalesData).filter(models.SalesData.product_id == request.product_id)
    if request.location_id:
        query = query.filter(models.SalesData.location_id == request.location_id)
    
    sales_records = query.order_by(models.SalesData.date.asc()).all()
    
    # 2. Convert to DataFrame for ML engine
    sales_df = pd.DataFrame([{
        'date': s.date,
        'quantity_sold': s.quantity_sold,
        'product_id': s.product_id,
        'location_id': s.location_id
    } for s in sales_records])
    
    # 3. Predict using ML Engine
    try:
        # Train first
        train_result = engine.train(sales_df)
        if "error" in train_result or (train_result.get("status") == "error" and train_result.get("message") != "Insufficient data"):
             # Use a generic message if "error" key is missing but status is error
            detail = train_result.get("message", "Forecasting engine error")
            raise HTTPException(status_code=400, detail=detail)
        
        # Note: If status is "cold_start", we proceed to predict() which now handles it.
            
        # Predict
        predictions = engine.predict(sales_df, days_ahead=request.days_ahead)
        
        # 4. Save forecasts to database
        forecasts = []
        # Clear old forecasts for this product/location combination
        delete_query = db.query(models.Forecast).filter(models.Forecast.product_id == request.product_id)
        if request.location_id:
            delete_query = delete_query.filter(models.Forecast.location_id == request.location_id)
        delete_query.delete()
        
        for p in predictions:
            db_forecast = models.Forecast(
                product_id=request.product_id,
                location_id=request.location_id,
                forecast_date=p['forecast_date'],
                predicted_quantity=p['predicted_quantity'],
                lower_bound=p['lower_bound'],
                upper_bound=p['upper_bound'],
                confidence_score=p['confidence_score'],
                model_version="random_forest_v1"
            )
            db.add(db_forecast)
            forecasts.append(db_forecast)
            
        db.commit()
        for f in forecasts:
            db.refresh(f)
            
        return forecasts
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Forecasting failed: {str(e)}")

@router.get("/", response_model=List[schemas.ForecastResponse])
def get_forecasts(
    product_id: int = None,
    location_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get forecasts with optional filters"""
    query = db.query(models.Forecast)
    
    if product_id:
        query = query.filter(models.Forecast.product_id == product_id)
    if location_id:
        query = query.filter(models.Forecast.location_id == location_id)
    
    forecasts = query.order_by(models.Forecast.forecast_date.desc()).offset(skip).limit(limit).all()
    return forecasts

@router.get("/{forecast_id}", response_model=schemas.ForecastResponse)
def get_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific forecast"""
    forecast = db.query(models.Forecast).filter(models.Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    return forecast

@router.delete("/{forecast_id}")
def delete_forecast(
    forecast_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Delete forecast (requires admin role)"""
    forecast = db.query(models.Forecast).filter(models.Forecast.id == forecast_id).first()
    if not forecast:
        raise HTTPException(status_code=404, detail="Forecast not found")
    
    db.delete(forecast)
    db.commit()
    return {"message": "Forecast deleted successfully"}
