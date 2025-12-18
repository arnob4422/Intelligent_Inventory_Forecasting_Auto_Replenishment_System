from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime
from database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    firebase_uid = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    role = Column(String, default="viewer")  # admin, manager, viewer
    created_at = Column(DateTime, default=datetime.utcnow)
    
class Product(Base):
    __tablename__ = "products"
    
    id = Column(Integer, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    category = Column(String, index=True)
    lead_time_days = Column(Integer, default=7)  # Days to restock
    safety_stock_level = Column(Integer, default=50)  # Minimum stock
    unit_cost = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sales = relationship("SalesData", back_populates="product")
    forecasts = relationship("Forecast", back_populates="product")
    anomalies = relationship("Anomaly", back_populates="product")
    inventory = relationship("Inventory", back_populates="product")

class Location(Base):
    __tablename__ = "locations"
    
    id = Column(Integer, primary_key=True, index=True)
    code = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    type = Column(String)  # warehouse, store, distribution_center
    address = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    sales = relationship("SalesData", back_populates="location")
    inventory = relationship("Inventory", back_populates="location")

class SalesData(Base):
    __tablename__ = "sales_data"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    date = Column(DateTime, index=True, nullable=False)
    quantity_sold = Column(Integer, nullable=False)
    revenue = Column(Float, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="sales")
    location = relationship("Location", back_populates="sales")

class Inventory(Base):
    __tablename__ = "inventory"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=False)
    current_stock = Column(Integer, default=0)
    reserved_stock = Column(Integer, default=0)  # Allocated but not shipped
    available_stock = Column(Integer, default=0)  # current - reserved
    last_updated = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="inventory")
    location = relationship("Location", back_populates="inventory")

class Forecast(Base):
    __tablename__ = "forecasts"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    forecast_date = Column(DateTime, index=True, nullable=False)
    predicted_quantity = Column(Float, nullable=False)
    lower_bound = Column(Float)  # Confidence interval
    upper_bound = Column(Float)
    confidence_score = Column(Float)  # 0-1
    model_version = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="forecasts")

class Anomaly(Base):
    __tablename__ = "anomalies"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    detected_date = Column(DateTime, index=True, nullable=False)
    anomaly_type = Column(String)  # spike, drop, trend_change
    severity = Column(String)  # low, medium, high, critical
    actual_value = Column(Float)
    expected_value = Column(Float)
    deviation_score = Column(Float)  # How far from normal
    description = Column(Text)
    resolved = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    product = relationship("Product", back_populates="anomalies")

class ReplenishmentRecommendation(Base):
    __tablename__ = "replenishment_recommendations"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=False)
    location_id = Column(Integer, ForeignKey("locations.id"), nullable=True)
    recommendation_date = Column(DateTime, default=datetime.utcnow)
    reorder_quantity = Column(Integer, nullable=False)
    reorder_point = Column(Integer)  # When to reorder
    current_stock_level = Column(Integer)
    forecasted_demand = Column(Float)
    lead_time_demand = Column(Float)
    safety_stock = Column(Integer)
    priority = Column(String)  # urgent, high, medium, low
    status = Column(String, default="pending")  # pending, approved, ordered, cancelled
    notes = Column(Text)
    created_at = Column(DateTime, default=datetime.utcnow)

class SimulationRun(Base):
    __tablename__ = "simulation_runs"
    
    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, nullable=False)
    description = Column(Text)
    parameters = Column(Text)  # JSON string of simulation parameters
    start_date = Column(DateTime)
    end_date = Column(DateTime)
    results = Column(Text)  # JSON string of results
    created_by = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
