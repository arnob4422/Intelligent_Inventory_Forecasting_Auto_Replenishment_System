from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user
import models
import schemas

router = APIRouter(prefix="/api/locations", tags=["Locations"])

@router.get("/", response_model=List[schemas.LocationResponse])
def get_locations(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all locations"""
    locations = db.query(models.Location).offset(skip).limit(limit).all()
    return locations

@router.get("/{location_id}", response_model=schemas.LocationResponse)
def get_location(
    location_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get location by ID"""
    location = db.query(models.Location).filter(models.Location.id == location_id).first()
    if not location:
        raise HTTPException(status_code=404, detail="Location not found")
    return location

@router.post("/", response_model=schemas.LocationResponse)
def create_location(
    location: schemas.LocationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Create new location"""
    # Check if code already exists
    existing = db.query(models.Location).filter(models.Location.code == location.code).first()
    if existing:
        raise HTTPException(status_code=400, detail="Location with this code already exists")
    
    db_location = models.Location(**location.model_dump())
    db.add(db_location)
    db.commit()
    db.refresh(db_location)
    return db_location
