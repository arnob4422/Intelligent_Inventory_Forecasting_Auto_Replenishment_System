from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models, schemas
from typing import List
from datetime import datetime

router = APIRouter(prefix="/api/footages", tags=["footages"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.CameraFootageResponse])
def get_footages(skip: int = 0, limit: int = 100, camera_id: int = None, location_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.CameraFootage)
    if camera_id:
        query = query.filter(models.CameraFootage.camera_id == camera_id)
    if location_id:
        query = query.join(models.Camera).filter(models.Camera.location_id == location_id)
    footages = query.order_by(models.CameraFootage.timestamp.desc()).offset(skip).limit(limit).all()
    return footages

@router.post("/", response_model=schemas.CameraFootageResponse)
def create_footage(footage: schemas.CameraFootageCreate, db: Session = Depends(get_db)):
    db_footage = models.CameraFootage(**footage.dict())
    db.add(db_footage)
    db.commit()
    db.refresh(db_footage)
    return db_footage

@router.get("/{footage_id}", response_model=schemas.CameraFootageResponse)
def get_footage(footage_id: int, db: Session = Depends(get_db)):
    footage = db.query(models.CameraFootage).filter(models.CameraFootage.id == footage_id).first()
    if footage is None:
        raise HTTPException(status_code=44, detail="Footage not found")
    return footage
