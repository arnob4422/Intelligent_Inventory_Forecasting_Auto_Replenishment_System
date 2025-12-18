from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from database import get_db
from auth import get_current_user, require_role
import models
import schemas
import pandas as pd
import json
from ml_engine import SimulationEngine

router = APIRouter(prefix="/api/simulations", tags=["Simulations"])
engine = SimulationEngine()

@router.post("/run", response_model=schemas.SimulationResponse)
def run_simulation(
    simulation: schemas.SimulationCreate,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("manager"))
):
    """
    Run inventory strategy simulation using ML
    """
    # 1. Parse simulation parameters from JSON string
    try:
        params = json.loads(simulation.parameters)
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON in parameters")
        
    product_id = params.get("product_id")
    if not product_id:
        raise HTTPException(status_code=400, detail="product_id is required in simulation parameters")
        
    # 2. Fetch sales data for historical context
    sales_records = db.query(models.SalesData).filter(
        models.SalesData.product_id == product_id
    ).order_by(models.SalesData.date.asc()).all()
    
    if len(sales_records) < 10:
        raise HTTPException(
            status_code=400,
            detail=f"Insufficient sales data for simulation. Need at least 10 records, found {len(sales_records)}."
        )
        
    sales_df = pd.DataFrame([{
        'date': s.date,
        'quantity_sold': s.quantity_sold
    } for s in sales_records])
    
    # 3. Run simulation
    try:
        results = engine.run_simulation(
            sales_df=sales_df,
            initial_stock=params.get("initial_stock", 100),
            reorder_point=params.get("reorder_point", 50),
            reorder_quantity=params.get("reorder_quantity", 100),
            lead_time_days=params.get("lead_time_days", 7),
            simulation_days=params.get("simulation_days", 90)
        )
        
        # 4. Save to database
        db_simulation = models.SimulationRun(
            name=simulation.name,
            description=simulation.description,
            parameters=simulation.parameters,
            start_date=simulation.start_date,
            end_date=simulation.end_date,
            results=json.dumps(results),
            created_by=current_user.get("email", "unknown")
        )
        
        db.add(db_simulation)
        db.commit()
        db.refresh(db_simulation)
        
        return db_simulation
        
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Simulation failed: {str(e)}")

@router.get("/", response_model=List[schemas.SimulationResponse])
def get_simulations(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get all simulations"""
    simulations = db.query(models.SimulationRun).order_by(
        models.SimulationRun.created_at.desc()
    ).offset(skip).limit(limit).all()
    
    return simulations

@router.get("/{simulation_id}", response_model=schemas.SimulationResponse)
def get_simulation(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(get_current_user)
):
    """Get specific simulation"""
    simulation = db.query(models.SimulationRun).filter(
        models.SimulationRun.id == simulation_id
    ).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    return simulation

@router.delete("/{simulation_id}")
def delete_simulation(
    simulation_id: int,
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_role("admin"))
):
    """Delete simulation (requires admin role)"""
    simulation = db.query(models.SimulationRun).filter(
        models.SimulationRun.id == simulation_id
    ).first()
    
    if not simulation:
        raise HTTPException(status_code=404, detail="Simulation not found")
    
    db.delete(simulation)
    db.commit()
    
    return {"message": "Simulation deleted successfully"}
