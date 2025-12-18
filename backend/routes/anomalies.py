from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, require_role
import models
import schemas
import pandas as pd
from ml_engine import AnomalyDetector

router = APIRouter(prefix="/api/anomalies", tags=["Anomalies"])
detector = AnomalyDetector()

@router.post("/detect", response_model=List[schemas.AnomalyResponse])
def detect_anomalies(
    request: schemas.AnomalyDetectionRequest,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """
    Detect anomalies in sales data using ML (grouped by product/location)
    """
    # 1. Fetch relevant sales data
    query = db.query(models.SalesData)
    if request.product_id:
        query = query.filter(models.SalesData.product_id == request.product_id)
    if request.location_id:
        query = query.filter(models.SalesData.location_id == request.location_id)
    if request.start_date:
        query = query.filter(models.SalesData.date >= request.start_date)
    if request.end_date:
        query = query.filter(models.SalesData.date <= request.end_date)
        
    all_sales = query.order_by(models.SalesData.date.asc()).all()
    
    if len(all_sales) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient total sales data for anomaly detection. Need at least 10 records, found {len(all_sales)}."
        )
        
    # 2. Group sales by product/location
    groups = {}
    for s in all_sales:
        key = (s.product_id, s.location_id)
        if key not in groups:
            groups[key] = []
        groups[key].append(s)
        
    # 3. Detect anomalies for each group
    db_anomalies = []
    try:
        for (prod_id, loc_id), sales_records in groups.items():
            if len(sales_records) < 10:
                continue # Skip small samples for now
                
            sales_df = pd.DataFrame([{
                'date': s.date,
                'quantity_sold': s.quantity_sold
            } for s in sales_records])
            
            found_anomalies = detector.detect_anomalies(sales_df)
            
            for a in found_anomalies:
                # Check for existing to avoid duplicates
                existing = db.query(models.Anomaly).filter(
                    models.Anomaly.product_id == prod_id,
                    models.Anomaly.location_id == loc_id,
                    models.Anomaly.detected_date == a['detected_date'],
                    models.Anomaly.anomaly_type == a['anomaly_type']
                ).first()
                
                if not existing:
                    db_anomaly = models.Anomaly(
                        product_id=prod_id,
                        location_id=loc_id,
                        detected_date=a['detected_date'],
                        anomaly_type=a['anomaly_type'],
                        severity=a['severity'],
                        actual_value=a['actual_value'],
                        expected_value=a['expected_value'],
                        deviation_score=a['deviation_score'],
                        description=a['description'],
                        resolved=False
                    )
                    db.add(db_anomaly)
                    db_anomalies.append(db_anomaly)
                else:
                    db_anomalies.append(existing)
                    
        db.commit()
        for a in db_anomalies:
            db.refresh(a)
            
        return db_anomalies
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Anomaly detection failed: {str(e)}")

@router.get("/", response_model=List[schemas.AnomalyResponse])
def get_anomalies(
    product_id: int = None,
    location_id: int = None,
    resolved: bool = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get anomalies with optional filters"""
    query = db.query(models.Anomaly)
    
    if product_id:
        query = query.filter(models.Anomaly.product_id == product_id)
    if location_id:
        query = query.filter(models.Anomaly.location_id == location_id)
    if resolved is not None:
        query = query.filter(models.Anomaly.resolved == resolved)
    
    anomalies = query.order_by(models.Anomaly.detected_date.desc()).offset(skip).limit(limit).all()
    return anomalies

@router.put("/{anomaly_id}/resolve")
def resolve_anomaly(
    anomaly_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """Mark anomaly as resolved (requires manager role)"""
    anomaly = db.query(models.Anomaly).filter(models.Anomaly.id == anomaly_id).first()
    if not anomaly:
        raise HTTPException(status_code=404, detail="Anomaly not found")
    
    anomaly.resolved = True
    db.commit()
    db.refresh(anomaly)
    
    return {"message": "Anomaly marked as resolved", "anomaly": anomaly}
