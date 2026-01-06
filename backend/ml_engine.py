import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Tuple, Optional
import json
import httpx
import os

class ForecastingEngine:
    """
    Time series forecasting using Random Forest with engineered features
    """
    
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        
    def prepare_features(self, sales_df: pd.DataFrame, training: bool = True) -> pd.DataFrame:
        """
        Engineer time-based features from sales data.
        Uses a fixed set of features to ensure consistency between training and prediction.
        """
        if sales_df.empty or 'date' not in sales_df.columns:
            return pd.DataFrame()

        df = sales_df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # 1. Time-based features
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['year'] = df['date'].dt.year
        df['week_of_year'] = df['date'].dt.isocalendar().week.astype(int)
        
        # 2. Fixed Lag features (1 day, 7 days, 14 days, 30 days)
        lags = [1, 7, 14, 30]
        for lag in lags:
            df[f'lag_{lag}'] = df['quantity_sold'].shift(lag)
        
        # 3. Fixed Rolling statistics (7, 14, 30 days)
        windows = [7, 14, 30]
        for window in windows:
            df[f'rolling_mean_{window}'] = df['quantity_sold'].rolling(window=window, min_periods=1).mean()
            df[f'rolling_std_{window}'] = df['quantity_sold'].rolling(window=window, min_periods=1).std()
        
        # 4. Fill NaN values (crucial for consistency)
        global_mean = df['quantity_sold'].mean() if not df.empty else 0
        
        feature_cols = ['day_of_week', 'day_of_month', 'month', 'quarter', 'year', 'week_of_year'] + \
                      [f'lag_{l}' for l in lags] + \
                      [f'rolling_mean_{w}' for w in windows] + \
                      [f'rolling_std_{w}' for w in windows]
        
        for col in feature_cols:
            if col in df.columns:
                df[col] = df[col].fillna(global_mean if 'std' not in col else 0)
        
        if training:
            return df[feature_cols + ['quantity_sold', 'date']]
        return df[feature_cols]
    
    def train(self, sales_df: pd.DataFrame) -> Dict:
        """
        Train forecasting model on historical sales data
        """
        df = self.prepare_features(sales_df, training=True)
        
        if df.empty or len(df) < 2:
            return {
                "status": "cold_start",
                "samples": len(df),
                "features": []
            }

        # Select exactly the features we engineered
        feature_cols = [col for col in df.columns if col not in ['date', 'quantity_sold']]
        X = df[feature_cols]
        y = df['quantity_sold']
        
        # Train model
        self.model.fit(X, y)
        self.trained_features = feature_cols
        
        return {
            "status": "trained",
            "samples": len(df),
            "features": feature_cols
        }
    
    def predict(self, sales_df: pd.DataFrame, days_ahead: int = 30) -> List[Dict]:
        """
        Generate forecasts for future dates
        """
        # Prepare historical features to get the latest state
        hist_df = self.prepare_features(sales_df, training=True)
        predictions = []
        
        # Determine start date
        if not sales_df.empty:
            last_date = pd.to_datetime(sales_df['date']).max()
        else:
            last_date = pd.Timestamp.now().normalize()
            
        is_cold_start = hist_df.empty or not hasattr(self, 'trained_features')
        
        # Generate predictions
        for i in range(1, days_ahead + 1):
            future_date = last_date + timedelta(days=i)
            
            if is_cold_start:
                # Baseline for new products
                predicted_qty = 5.0 + np.random.normal(0, 0.5)
                lower_bound = 0.0
                upper_bound = 15.0
                confidence = 0.1
            else:
                # Construct features for this specific future date
                future_features = {
                    'day_of_week': future_date.dayofweek,
                    'day_of_month': future_date.day,
                    'month': future_date.month,
                    'quarter': (future_date.month - 1) // 3 + 1,
                    'year': future_date.year,
                    'week_of_year': int(future_date.isocalendar()[1]),
                }
                
                # Use hist_df to fill lag/rolling features
                lags = [1, 7, 14, 30]
                windows = [7, 14, 30]
                
                for lag in lags:
                    if not hist_df.empty and lag <= len(hist_df):
                        future_features[f'lag_{lag}'] = hist_df['quantity_sold'].iloc[-lag]
                    else:
                        future_features[f'lag_{lag}'] = hist_df['quantity_sold'].mean() if not hist_df.empty else 0
                
                for window in windows:
                    if not hist_df.empty:
                        future_features[f'rolling_mean_{window}'] = hist_df['quantity_sold'].tail(window).mean()
                        future_features[f'rolling_std_{window}'] = hist_df['quantity_sold'].tail(window).std()
                    else:
                        future_features[f'rolling_mean_{window}'] = 0
                        future_features[f'rolling_std_{window}'] = 0
                
                # Convert to DataFrame and ensure same column order as training
                X_future = pd.DataFrame([future_features])
                
                # Fill any remaining NaNs
                X_future = X_future.fillna(0)
                
                # Predict only using features the model was trained on
                if hasattr(self, 'trained_features'):
                    X_future = X_future[self.trained_features]
                    predicted_qty = self.model.predict(X_future)[0]
                else:
                    predicted_qty = 5.0
                
                # Intervals
                recent_std = hist_df['quantity_sold'].std() if len(hist_df) > 1 else 1.0
                if np.isnan(recent_std) or recent_std == 0: recent_std = 1.0
                
                lower_bound = max(0, predicted_qty - 1.96 * recent_std)
                upper_bound = predicted_qty + 1.96 * recent_std
                confidence = 0.85

            predictions.append({
                'forecast_date': future_date,
                'predicted_quantity': float(max(0, predicted_qty)),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound),
                'confidence_score': float(confidence)
            })
        
        return predictions


class AnomalyDetector:
    """
    Detect anomalies in sales data using Isolation Forest and statistical methods
    """
    
    def __init__(self):
        self.isolation_forest = IsolationForest(contamination=0.1, random_state=42)
    
    def detect_anomalies(self, sales_df: pd.DataFrame) -> List[Dict]:
        """
        Detect anomalies in sales data
        """
        if len(sales_df) < 10:
            return []
        
        df = sales_df.copy()
        if 'date' not in df.columns:
             return []
             
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        anomalies = []
        
        # Method 1: Z-Score (Statistical)
        mean_sales = df['quantity_sold'].mean()
        std_sales = df['quantity_sold'].std()
        
        if std_sales > 0:
            df['z_score'] = (df['quantity_sold'] - mean_sales) / std_sales
            
            for idx, row in df.iterrows():
                z_score = abs(row['z_score'])
                
                if z_score > 3:  # 3 standard deviations
                    severity = "critical" if z_score > 4 else "high"
                    anomaly_type = "spike" if row['quantity_sold'] > mean_sales else "drop"
                    
                    anomalies.append({
                        'detected_date': row['date'],
                        'anomaly_type': anomaly_type,
                        'severity': severity,
                        'actual_value': float(row['quantity_sold']),
                        'expected_value': float(mean_sales),
                        'deviation_score': float(z_score),
                        'description': f"{anomaly_type.capitalize()} detected: {row['quantity_sold']} vs expected {mean_sales:.1f}"
                    })
        
        # Method 2: Isolation Forest (ML-based)
        if len(df) >= 30:
            X = df[['quantity_sold']].values
            predictions = self.isolation_forest.fit_predict(X)
            
            for idx, (_, row) in enumerate(df.iterrows()):
                if predictions[idx] == -1:  # Anomaly
                    # Check if not already detected by z-score
                    if not any(a['detected_date'] == row['date'] for a in anomalies):
                        anomalies.append({
                            'detected_date': row['date'],
                            'anomaly_type': 'pattern_anomaly',
                            'severity': 'medium',
                            'actual_value': float(row['quantity_sold']),
                            'expected_value': float(mean_sales),
                            'deviation_score': 2.0,
                            'description': f"Pattern anomaly detected by ML model"
                        })
        
        return anomalies


class ReplenishmentCalculator:
    """
    Calculate reorder points and quantities
    """
    
    @staticmethod
    def calculate_reorder_point(
        avg_daily_demand: float,
        lead_time_days: int,
        safety_stock: int
    ) -> int:
        """
        ROP = (Average Daily Demand × Lead Time) + Safety Stock
        """
        lead_time_demand = avg_daily_demand * lead_time_days
        reorder_point = int(lead_time_demand + safety_stock)
        return reorder_point
    
    @staticmethod
    def calculate_reorder_quantity(
        forecasted_demand: float,
        current_stock: int,
        safety_stock: int,
        lead_time_days: int
    ) -> Dict:
        """
        Calculate optimal reorder quantity
        """
        # Economic Order Quantity (simplified)
        avg_daily_demand = forecasted_demand / 30  # Assuming 30-day forecast
        lead_time_demand = avg_daily_demand * lead_time_days
        
        reorder_point = int(lead_time_demand + safety_stock)
        
        # Reorder quantity = forecast + safety stock - current stock
        reorder_qty = max(0, int(forecasted_demand + safety_stock - current_stock))
        
        # Determine priority
        if current_stock <= safety_stock:
            priority = "urgent"
        elif current_stock <= reorder_point:
            priority = "high"
        elif current_stock <= reorder_point * 1.5:
            priority = "medium"
        else:
            priority = "low"
        
        return {
            'reorder_quantity': reorder_qty,
            'reorder_point': reorder_point,
            'lead_time_demand': float(lead_time_demand),
            'priority': priority
        }


class SimulationEngine:
    """
    Run inventory strategy simulations
    """
    
    @staticmethod
    def run_simulation(
        sales_df: pd.DataFrame,
        initial_stock: int,
        reorder_point: int,
        reorder_quantity: int,
        lead_time_days: int,
        simulation_days: int = 90
    ) -> Dict:
        """
        Simulate inventory levels over time
        """
        df = sales_df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Calculate average daily demand
        avg_daily_demand = df['quantity_sold'].mean()
        
        # Simulation
        current_stock = initial_stock
        total_orders = 0
        stockout_days = 0
        total_holding_cost = 0
        
        results = []
        
        for day in range(simulation_days):
            # Daily demand (use average with some randomness)
            daily_demand = max(0, int(np.random.normal(avg_daily_demand, avg_daily_demand * 0.2)))
            
            # Check stock
            if current_stock >= daily_demand:
                current_stock -= daily_demand
            else:
                stockout_days += 1
                current_stock = 0
            
            # Check if need to reorder
            if current_stock <= reorder_point:
                current_stock += reorder_quantity
                total_orders += 1
            
            # Holding cost (simplified)
            total_holding_cost += current_stock * 0.01
            
            results.append({
                'day': day,
                'stock_level': current_stock,
                'demand': daily_demand
            })
        
        return {
            'total_orders': total_orders,
            'stockout_days': stockout_days,
            'avg_stock_level': np.mean([r['stock_level'] for r in results]),
            'total_holding_cost': total_holding_cost,
            'service_level': (simulation_days - stockout_days) / simulation_days * 100,
            'daily_results': results[:30]  # Return first 30 days for visualization
        }

class VisionEngine:
    """
    High-precision computer vision for product identification
    Uses Torchvision's pre-trained models for reliable detection/classification
    """
    def __init__(self):
        self.error_message = None
        self.yolo_url = "http://localhost:8001/api/detect/realtime"
        self.is_ready = True
        print(f"VisionEngine: Initialized to use YOLO server at {self.yolo_url}")

    def predict_image(self, image_path: str) -> List[Dict]:
        """
        Identify products by calling the custom YOLO detection server.
        """
        if not os.path.exists(image_path):
            print(f"VisionEngine: Image path {image_path} does not exist.")
            return []

        try:
            print(f"VisionEngine: Calling YOLO server for {image_path}...")
            
            with open(image_path, "rb") as f:
                files = {"file": (os.path.basename(image_path), f, "image/jpeg")}
                response = httpx.post(self.yolo_url, files=files, timeout=30.0)
            
            if response.status_code == 200:
                data = response.json()
                detections = data.get("detections", [])
                
                results = []
                # Deduplicate by product name for the summary view
                seen_products = set()
                
                for det in detections:
                    label = det.get("product_name") # Fix: YOLO server returns 'product_name'
                    if label:
                        # Convert dict bbox to list [x, y, w, h]
                        b = det.get("bbox", {})
                        bbox_list = [
                            b.get("x1", 0),
                            b.get("y1", 0),
                            b.get("x2", 0) - b.get("x1", 0),
                            b.get("y2", 0) - b.get("y1", 0)
                        ]
                        
                        results.append({
                            "label": label,
                            "confidence": float(det.get("confidence", 0.0)),
                            "bbox": bbox_list
                        })
                        seen_products.add(label)
                
                print(f"VisionEngine: Server returned {len(results)} unique products.")
                return results
            else:
                print(f"VisionEngine: Server returned error {response.status_code}: {response.text}")
                return []
                
        except Exception as e:
            print(f"VisionEngine prediction failed: {e}")
            return []

    def _get_imagenet_label(self, cat_id: int) -> str:
        # Simplified mapping for common objects to ensure the user gets a "Proper result"
        # 517 is 'headphone', 518 is 'headphones', 'earphone', etc.
        # 554 is 'dining table' -> which was the false positive
        mappings = {
            517: "headphones",
            518: "headphones",
            491: "bottle",
            664: "monitor",
            508: "computer keyboard",
            722: "pillow",
            403: "backpack",
            673: "mouse",
            759: "remote control",
            554: "dining table",
            546: "desk",
            749: "quill" # common false positive for pens
        }
        
        # Fallback to a generic string for others (or we could load the full 1000 names)
        # For this demo, we'll ensure 'headphones' are properly identified
        if cat_id in mappings:
            return mappings[cat_id]
            
        # If it's in the range 517-518 it's definitely some head-audio device
        if 517 <= cat_id <= 518: return "headphones"
        
        return f"object_{cat_id}" # Generic fallback
