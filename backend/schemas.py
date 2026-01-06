from pydantic import BaseModel, EmailStr, Field
from datetime import datetime
from typing import Optional, List

# User Schemas
class UserBase(BaseModel):
    email: EmailStr
    role: str = "viewer"

class UserCreate(UserBase):
    firebase_uid: str

class UserResponse(UserBase):
    id: int
    firebase_uid: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# Product Schemas
class ProductBase(BaseModel):
    sku: str
    name: str
    category: Optional[str] = None
    lead_time_days: int = 7
    safety_stock_level: int = 50
    unit_cost: float = 0.0

class ProductCreate(ProductBase):
    initial_stock: Optional[int] = 0
    location_id: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Location Schemas
class LocationBase(BaseModel):
    code: str
    name: str
    type: Optional[str] = None
    address: Optional[str] = None

class LocationCreate(LocationBase):
    pass

class LocationResponse(LocationBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Sales Data Schemas
class SalesDataBase(BaseModel):
    product_id: int
    location_id: int
    date: datetime
    quantity_sold: int
    revenue: float = 0.0

class SalesDataCreate(SalesDataBase):
    pass

class SalesDataResponse(SalesDataBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Inventory Schemas
class InventoryBase(BaseModel):
    product_id: int
    location_id: int
    current_stock: int
    reserved_stock: int = 0
    available_stock: int = 0

class InventoryUpdate(BaseModel):
    current_stock: Optional[int] = None
    reserved_stock: Optional[int] = None

class InventoryResponse(InventoryBase):
    id: int
    last_updated: datetime
    
    class Config:
        from_attributes = True

# Forecast Schemas
class ForecastBase(BaseModel):
    product_id: int
    location_id: Optional[int] = None
    forecast_date: datetime
    predicted_quantity: float
    lower_bound: Optional[float] = None
    upper_bound: Optional[float] = None
    confidence_score: Optional[float] = None
    model_version: Optional[str] = None
    
    model_config = {"protected_namespaces": ()}

class ForecastCreate(ForecastBase):
    pass

class ForecastResponse(ForecastBase):
    id: int
    created_at: datetime
    
    model_config = {"from_attributes": True, "protected_namespaces": ()}

# Anomaly Schemas
class AnomalyBase(BaseModel):
    product_id: int
    location_id: Optional[int] = None
    detected_date: datetime
    anomaly_type: str
    severity: str
    actual_value: float
    expected_value: float
    deviation_score: float
    description: Optional[str] = None
    resolved: bool = False

class AnomalyCreate(AnomalyBase):
    pass

class AnomalyResponse(AnomalyBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True

# Replenishment Recommendation Schemas
class RecommendationBase(BaseModel):
    product_id: int
    location_id: Optional[int] = None
    reorder_quantity: int
    reorder_point: Optional[int] = None
    current_stock_level: Optional[int] = None
    forecasted_demand: Optional[float] = None
    lead_time_demand: Optional[float] = None
    safety_stock: Optional[int] = None
    priority: str = "medium"
    status: str = "pending"
    notes: Optional[str] = None

class RecommendationCreate(RecommendationBase):
    pass

class RecommendationResponse(RecommendationBase):
    id: int
    recommendation_date: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Simulation Schemas
class SimulationCreate(BaseModel):
    name: str
    description: Optional[str] = None
    parameters: str  # JSON string
    start_date: datetime
    end_date: datetime

class SimulationResponse(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    parameters: str
    start_date: datetime
    end_date: datetime
    results: Optional[str] = None
    created_by: Optional[str] = None
    created_at: datetime
    
    class Config:
        from_attributes = True

# Forecast Request
class ForecastRequest(BaseModel):
    product_id: int
    location_id: Optional[int] = None
    days_ahead: int = 30
    
class AnomalyDetectionRequest(BaseModel):
    product_id: Optional[int] = None
    location_id: Optional[int] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None

# Camera Schemas
class CameraBase(BaseModel):
    name: str
    location_id: Optional[int] = None
    resolution: str = "1920x1080"
    fps: int = 30
    status: str = "active"

class CameraCreate(CameraBase):
    pass

class CameraResponse(CameraBase):
    id: int
    last_active: datetime
    created_at: datetime
    
    class Config:
        from_attributes = True

# Camera Footage Schemas
class CameraFootageBase(BaseModel):
    camera_id: int
    timestamp: datetime
    duration: int
    file_path: str
    file_size: float
    footage_type: str = "recorded"

class CameraFootageCreate(CameraFootageBase):
    pass

class CameraFootageResponse(CameraFootageBase):
    id: int
    created_at: datetime
    
    class Config:
        from_attributes = True
