from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, require_role
import models
import schemas

router = APIRouter(prefix="/api/inventory", tags=["Inventory"])

@router.get("/", response_model=List[schemas.InventoryResponse])
def get_inventory(
    product_id: int = None,
    location_id: int = None,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get inventory records with optional filters"""
    query = db.query(models.Inventory)
    
    if product_id:
        query = query.filter(models.Inventory.product_id == product_id)
    if location_id:
        query = query.filter(models.Inventory.location_id == location_id)
    
    inventory = query.offset(skip).limit(limit).all()
    return inventory

@router.get("/{inventory_id}", response_model=schemas.InventoryResponse)
def get_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific inventory record"""
    inventory = db.query(models.Inventory).filter(models.Inventory.id == inventory_id).first()
    if not inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    return inventory

@router.post("/", response_model=schemas.InventoryResponse)
def create_inventory(
    inventory: schemas.InventoryBase,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """Create inventory record (requires manager role)"""
    # Check if inventory already exists for this product-location combination
    existing = db.query(models.Inventory).filter(
        models.Inventory.product_id == inventory.product_id,
        models.Inventory.location_id == inventory.location_id
    ).first()
    
    if existing:
        raise HTTPException(status_code=400, detail="Inventory record already exists for this product-location")
    
    # Calculate available stock
    available = inventory.current_stock - inventory.reserved_stock
    
    db_inventory = models.Inventory(
        **inventory.model_dump(),
        available_stock=available
    )
    db.add(db_inventory)
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@router.put("/{inventory_id}", response_model=schemas.InventoryResponse)
def update_inventory(
    inventory_id: int,
    inventory_update: schemas.InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """Update inventory levels (requires manager role)"""
    db_inventory = db.query(models.Inventory).filter(models.Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    # Update fields
    if inventory_update.current_stock is not None:
        db_inventory.current_stock = inventory_update.current_stock
    if inventory_update.reserved_stock is not None:
        db_inventory.reserved_stock = inventory_update.reserved_stock
    
    # Recalculate available stock
    db_inventory.available_stock = db_inventory.current_stock - db_inventory.reserved_stock
    
    db.commit()
    db.refresh(db_inventory)
    return db_inventory

@router.delete("/{inventory_id}")
def delete_inventory(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Delete inventory record (requires admin role)"""
    db_inventory = db.query(models.Inventory).filter(models.Inventory.id == inventory_id).first()
    if not db_inventory:
        raise HTTPException(status_code=404, detail="Inventory record not found")
    
    product_id = db_inventory.product_id
    
    db.delete(db_inventory)
    db.commit()

    # Check if this was the last inventory record for this product
    remaining = db.query(models.Inventory).filter(models.Inventory.product_id == product_id).count()
    if remaining == 0:
        # Delete orphan product and related forecasts/sales
        db.query(models.Forecast).filter(models.Forecast.product_id == product_id).delete()
        db.query(models.SalesData).filter(models.SalesData.product_id == product_id).delete()
        db.query(models.Product).filter(models.Product.id == product_id).delete()
        db.commit()

    return {"message": "Inventory record deleted successfully"}

@router.get("/low-stock/", response_model=List[schemas.InventoryResponse])
def get_low_stock_items(
    threshold: int = None,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get items with low stock levels"""
    query = db.query(models.Inventory).join(models.Product)
    
    if threshold:
        query = query.filter(models.Inventory.current_stock <= threshold)
    else:
        # Use product's safety stock level as threshold
        query = query.filter(models.Inventory.current_stock <= models.Product.safety_stock_level)
    
    low_stock = query.all()
    return low_stock
