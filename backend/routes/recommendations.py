from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional
from database import get_db
from auth import get_current_user, require_role
import models
import schemas

router = APIRouter(prefix="/api/recommendations", tags=["Recommendations"])

@router.post("/generate", response_model=List[schemas.RecommendationResponse])
def generate_recommendations(
    product_id: Optional[int] = None,
    location_id: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """
    Generate replenishment recommendations using forecast data and current inventory levels
    """
    from datetime import datetime
    
    # 1. Get inventory items to analyze
    query = db.query(models.Inventory)
    if product_id:
        query = query.filter(models.Inventory.product_id == product_id)
    if location_id:
        query = query.filter(models.Inventory.location_id == location_id)
        
    inventory_items = query.all()
    recommendations = []
    
    for inv in inventory_items:
        # 2. Get latest product info for safety stock
        product = db.query(models.Product).filter(models.Product.id == inv.product_id).first()
        if not product:
            continue
            
        # 3. Get latest forecast
        latest_forecast = db.query(models.Forecast)\
            .filter(models.Forecast.product_id == inv.product_id)\
            .filter(models.Forecast.location_id == inv.location_id)\
            .order_by(models.Forecast.forecast_date.desc())\
            .first()
            
        # 4. Calculate reorder quantity
        predicted_demand = latest_forecast.predicted_quantity if latest_forecast else (product.safety_stock_level * 0.5)
        # Goal: Cover demand + safety stock
        target_stock = predicted_demand + product.safety_stock_level
        reorder_qty = max(0, target_stock - inv.current_stock)
        
        if reorder_qty > 0:
            # Determine priority
            stock_ratio = inv.current_stock / (product.safety_stock_level or 1)
            priority = "urgent" if stock_ratio < 0.5 else "high" if stock_ratio < 1.0 else "medium"
            
            # 5. Check for existing pending recommendation
            existing = db.query(models.ReplenishmentRecommendation).filter(
                models.ReplenishmentRecommendation.product_id == inv.product_id,
                models.ReplenishmentRecommendation.location_id == inv.location_id,
                models.ReplenishmentRecommendation.status == "pending"
            ).first()
            
            if not existing:
                recommendation = models.ReplenishmentRecommendation(
                    product_id=inv.product_id,
                    location_id=inv.location_id,
                    reorder_quantity=int(reorder_qty),
                    reorder_point=product.safety_stock_level,
                    current_stock_level=inv.current_stock,
                    safety_stock=product.safety_stock_level,
                    priority=priority,
                    status="pending",
                    notes=f"Generated using {'ML Forecast' if latest_forecast else 'Safety Stock fallback'}"
                )
                db.add(recommendation)
                recommendations.append(recommendation)
            else:
                # Update existing
                existing.reorder_quantity = int(reorder_qty)
                existing.priority = priority
                existing.notes = f"Updated using {'ML Forecast' if latest_forecast else 'Safety Stock'}"
                recommendations.append(existing)
                
    if recommendations:
        db.commit()
        for rec in recommendations:
            db.refresh(rec)
            
    return recommendations

@router.get("/", response_model=List[schemas.RecommendationResponse])
def get_recommendations(
    product_id: int = None,
    location_id: int = None,
    status: str = None,
    priority: str = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get recommendations with optional filters"""
    query = db.query(models.ReplenishmentRecommendation)
    
    if product_id:
        query = query.filter(models.ReplenishmentRecommendation.product_id == product_id)
    if location_id:
        query = query.filter(models.ReplenishmentRecommendation.location_id == location_id)
    if status:
        query = query.filter(models.ReplenishmentRecommendation.status == status)
    if priority:
        query = query.filter(models.ReplenishmentRecommendation.priority == priority)
    
    recommendations = query.order_by(
        models.ReplenishmentRecommendation.recommendation_date.desc()
    ).offset(skip).limit(limit).all()
    
    return recommendations

@router.put("/{recommendation_id}/status")
def update_recommendation_status(
    recommendation_id: int,
    status: str,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """Update recommendation status (requires manager role)"""
    valid_statuses = ["pending", "approved", "ordered", "cancelled"]
    if status not in valid_statuses:
        raise HTTPException(status_code=400, detail=f"Invalid status. Must be one of: {valid_statuses}")
    
    recommendation = db.query(models.ReplenishmentRecommendation).filter(
        models.ReplenishmentRecommendation.id == recommendation_id
    ).first()
    
    if not recommendation:
        raise HTTPException(status_code=404, detail="Recommendation not found")
    
    recommendation.status = status
    db.commit()
    db.refresh(recommendation)
    
    return {"message": "Status updated successfully", "recommendation": recommendation}
