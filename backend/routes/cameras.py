from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import SessionLocal
import models, schemas
from typing import List

router = APIRouter(prefix="/api/cameras", tags=["cameras"])

# Dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

@router.get("/", response_model=List[schemas.CameraResponse])
def get_cameras(skip: int = 0, limit: int = 100, location_id: int = None, db: Session = Depends(get_db)):
    query = db.query(models.Camera)
    if location_id:
        query = query.filter(models.Camera.location_id == location_id)
    cameras = query.offset(skip).limit(limit).all()
    return cameras

@router.post("/", response_model=schemas.CameraResponse)
def create_camera(camera: schemas.CameraCreate, db: Session = Depends(get_db)):
    db_camera = models.Camera(**camera.dict())
    db.add(db_camera)
    db.commit()
    db.refresh(db_camera)
    return db_camera

@router.get("/{camera_id}", response_model=schemas.CameraResponse)
def get_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if camera is None:
        raise HTTPException(status_code=44, detail="Camera not found")
    return camera

@router.delete("/{camera_id}")
def delete_camera(camera_id: int, db: Session = Depends(get_db)):
    camera = db.query(models.Camera).filter(models.Camera.id == camera_id).first()
    if camera is None:
        raise HTTPException(status_code=44, detail="Camera not found")
    db.delete(camera)
    db.commit()
    return {"message": "Camera deleted"}
