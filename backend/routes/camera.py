from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from pydantic import BaseModel
import models
from datetime import datetime
import os
import shutil
import uuid
from ml_engine import VisionEngine

vision_engine = VisionEngine()

router = APIRouter(prefix="/api/camera", tags=["Camera"])

class DetectionRequest(BaseModel):
    label: str
    confidence: float
    location_id: int

@router.post("/detect")
def handle_detection(
    request: DetectionRequest,
    db: Session = Depends(get_db)
):
    """
    Handle product detection from camera.
    - If product exists: Increment stock.
    - If product doesn't exist: Create it + add stock.
    """
    try:
        # 1. Check for AI Label Mapping
        mapping = db.query(models.AILabelMapping).filter(models.AILabelMapping.ai_label == request.label.lower()).first()
        
        if mapping:
            product = db.query(models.Product).filter(models.Product.id == mapping.product_id).first()
            product_name = product.name
        else:
            # Normalize name
            product_name = request.label.title()
            product = db.query(models.Product).filter(models.Product.name == product_name).first()
        
        # 2. Skip unwanted labels (like "person")
        unwanted_labels = ['person', 'human', 'face', 'background']
        if request.label.lower() in unwanted_labels:
            return {"status": "skipped", "message": f"Label '{request.label}' is ignored for product creation"}

        if not product:
            # Check for existing product names case-insensitively before creating
            count = db.query(models.Product).count()
            sku = f"PROD-{count + 1:03d}"
            product = models.Product(
                sku=sku,
                name=product_name,
                category="Detected Items",
                unit_cost=0.0
            )
            db.add(product)
            db.commit()
            db.refresh(product)
            action = "created"
        else:
            action = "updated"
            
        # 3. Update Inventory
        inventory = db.query(models.Inventory).filter(
            models.Inventory.product_id == product.id,
            models.Inventory.location_id == request.location_id
        ).first()
        
        if inventory:
            inventory.current_stock += 1
            inventory.available_stock += 1
        else:
            inventory = models.Inventory(
                product_id=product.id,
                location_id=request.location_id,
                current_stock=1,
                available_stock=1,
                reserved_stock=0
            )
            db.add(inventory)
            
        db.commit()
        
        return {
            "status": "success",
            "action": action,
            "product": {
                "id": product.id,
                "name": product.name,
                "current_stock": inventory.current_stock
            }
        }
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

from fastapi import UploadFile, File
import shutil
import os
import uuid

@router.post("/snapshot")
def upload_snapshot(
    location_id: int,
    camera_id: int = 1, # Default to 1 for now if not specified
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Upload a camera snapshot and record it as footage.
    """
    try:
        # Create directory if not exists
        upload_dir = "static/footages"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
            
        # Generate unique filename
        file_ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = f"{upload_dir}/{filename}"
        
        # Save file
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Create DB record
        timestamp = datetime.utcnow()
        footage = models.CameraFootage(
            camera_id=camera_id,
            timestamp=timestamp,
            duration=0,
            file_path=file_path, # e.g. "static/footages/uuid.jpg"
            file_size=0.1, # Mock size or calculate real size
            footage_type="live_snapshot"
        )
        db.add(footage)
        db.commit()
        db.refresh(footage)
        
        return {
            "status": "success",
            "footage_id": footage.id,
            "url": f"/static/footages/{filename}"
        }
        
    except Exception as e:
        print(f"Snapshot upload failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to save snapshot: {str(e)}")

# Remove duplicate imports that were accidentally pasted here
# from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form 

# ... existing imports ...


@router.post("/detect-snapshot")
def handle_detection_with_snapshot(
    location_id: int = Form(...),
    label: str = Form(...),
    confidence: float = Form(...),
    camera_id: int = Form(1),
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    Handle detection with a live snapshot.
    1. Save snapshot to static/footages.
    2. Create CameraFootage record.
    3. Update Product Inventory (create/increment).
    """
    try:
        # --- Step 1: Save Snapshot ---
        upload_dir = "static/footages"
        if not os.path.exists(upload_dir):
            os.makedirs(upload_dir)
            
        file_ext = file.filename.split(".")[-1]
        filename = f"{uuid.uuid4()}.{file_ext}"
        file_path = f"{upload_dir}/{filename}"
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Create Footage Record
        footage = models.CameraFootage(
            camera_id=camera_id,
            timestamp=datetime.utcnow(),
            duration=0,
            file_path=file_path,
            file_size=0.1, # Mock size
            footage_type="ai_detection"
        )
        db.add(footage)
        # We don't commit yet, we want to do it all together if possible, 
        # but for file consistency, maybe commit footage first? 
        # Let's trust the transaction.
        
        # --- Step 2: Product & Inventory Logic (Same as /detect) ---
        mapping = db.query(models.AILabelMapping).filter(models.AILabelMapping.ai_label == label.lower()).first()
        
        if mapping:
            product = db.query(models.Product).filter(models.Product.id == mapping.product_id).first()
            product_name = product.name
        else:
            product_name = label.title()
            product = db.query(models.Product).filter(models.Product.name == product_name).first()
        
        # Skip unwanted labels (like "person")
        unwanted_labels = ['person', 'human', 'face', 'background']
        if label.lower() in unwanted_labels:
             # Footages are still saved for security/monitoring even if it's just a person
             db.commit() # Save the footage record at least
             return {"status": "skipped", "message": f"Label '{label}' is ignored for product creation", "footage": {"id": footage.id, "url": f"/static/footages/{filename}"}}

        action = "updated"
        if not product:
            count = db.query(models.Product).count()
            sku = f"PROD-{count + 1:03d}"
            product = models.Product(
                sku=sku,
                name=product_name,
                category="Detected Items",
                unit_cost=0.0
            )
            db.add(product)
            db.flush() # Get ID
            action = "created"
            
        inventory = db.query(models.Inventory).filter(
            models.Inventory.product_id == product.id,
            models.Inventory.location_id == location_id
        ).first()
        
        if inventory:
            inventory.current_stock += 1
            inventory.available_stock += 1
        else:
            inventory = models.Inventory(
                product_id=product.id,
                location_id=location_id,
                current_stock=1,
                available_stock=1,
                reserved_stock=0
            )
            db.add(inventory)
            
        db.commit()
        db.refresh(footage)
        
        return {
            "status": "success",
            "action": action,
            "footage": {
                "id": footage.id,
                "url": f"/static/footages/{filename}"
            },
            "product": {
                "name": product.name,
                "current_stock": inventory.current_stock
            }
        }

    except Exception as e:
        print(f"Detection with snapshot failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=str(e))

# Mapping Management
class MappingCreate(BaseModel):
    ai_label: str
    product_id: int

@router.post("/mappings")
def create_mapping(mapping: MappingCreate, db: Session = Depends(get_db)):
    """
    Create or update an AI label to Product mapping.
    """
    db_mapping = db.query(models.AILabelMapping).filter(models.AILabelMapping.ai_label == mapping.ai_label.lower()).first()
    
    if db_mapping:
        db_mapping.product_id = mapping.product_id
    else:
        db_mapping = models.AILabelMapping(
            ai_label=mapping.ai_label.lower(),
            product_id=mapping.product_id
        )
        db.add(db_mapping)
    
    db.commit()
    db.refresh(db_mapping)
    return {"status": "success", "mapping": {"ai_label": db_mapping.ai_label, "product_id": db_mapping.product_id}}

@router.get("/mappings")
def get_mappings(db: Session = Depends(get_db)):
    """
    Get all AI label mappings.
    """
    mappings = db.query(models.AILabelMapping).all()
    return mappings

# AI Training (One-Shot Learning)
class EmbeddingCreate(BaseModel):
    product_id: int
    embedding: str  # JSON stringified list
    label: str

@router.post("/train")
def train_product(data: EmbeddingCreate, db: Session = Depends(get_db)):
    """
    Save a visual embedding (fingerprint) for a product.
    """
    db_embedding = models.ProductEmbedding(
        product_id=data.product_id,
        embedding=data.embedding,
        label=data.label
    )
    db.add(db_embedding)
    db.commit()
    db.refresh(db_embedding)
    return {"status": "success", "id": db_embedding.id}

@router.get("/embeddings")
def get_embeddings(db: Session = Depends(get_db)):
    """
    Get all product visual fingerprints.
    """
    embeddings = db.query(models.ProductEmbedding).all()
    return [{
        "product_id": e.product_id,
        "embedding": e.embedding,
        "label": e.label,
        "product_name": db.query(models.Product).filter(models.Product.id == e.product_id).first().name
    } for e in embeddings]

@router.post("/analyze-upload")
def analyze_uploaded_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    """
    High-precision analysis of an uploaded image/video frame.
    Uses the Server-Side Vision Engine.
    """
    try:
        # Save temp file for analysis
        temp_dir = "static/temp_analysis"
        if not os.path.exists(temp_dir):
            os.makedirs(temp_dir)
            
        file_ext = file.filename.split(".")[-1]
        temp_path = f"{temp_dir}/{uuid.uuid4()}.{file_ext}"
        
        with open(temp_path, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
            
        # Run Vision Engine
        vision_results = vision_engine.predict_image(temp_path)
        
        # Clean up temp file
        # os.remove(temp_path) # Optionally keep for debugging or records
        
        if vision_results is None:
            msg = "AI analysis failed."
            if not vision_engine.is_ready:
                msg = f"High-Precision Engine is not ready: {vision_engine.error_message}. Please use 'Quick AI' or fix the Python environment."
            return {"status": "error", "message": msg}

        # Sort results by confidence (highest first)
        vision_results.sort(key=lambda x: x.get('confidence', 0), reverse=True)
        
        # Format results for the frontend
        processed_results = []
        for match in vision_results:
            # Match product by label (case-insensitive)
            product = db.query(models.Product).filter(models.Product.name.ilike(match['label'])).first()
            if not product:
                # Fallback: check if the label itself is a SKU
                product = db.query(models.Product).filter(models.Product.sku == match['label']).first()
            
            processed_results.append({
                "label": match['label'],
                "confidence": match['confidence'],
                "similarity": match['confidence'], # Fix for NaN% in frontend
                "identifiedProduct": {
                    "id": product.id,
                    "product_name": product.name,
                    "label": match['label']
                } if product else None,
                "bbox": match.get("bbox", [0, 0, 0, 0])
            })
        
        return {
            "status": "success",
            "results": processed_results
        }
        
    except Exception as e:
        print(f"Server-side analysis failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
