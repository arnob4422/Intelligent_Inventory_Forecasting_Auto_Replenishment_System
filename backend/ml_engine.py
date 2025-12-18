import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import RandomForestRegressor, IsolationForest
from sklearn.preprocessing import StandardScaler
from typing import List, Dict, Tuple, Optional
import json

class ForecastingEngine:
    """
    Time series forecasting using Random Forest with engineered features
    """
    
    def __init__(self):
        self.model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        
    def prepare_features(self, sales_df: pd.DataFrame) -> pd.DataFrame:
        """
        Engineer time-based features from sales data
        """
        df = sales_df.copy()
        df['date'] = pd.to_datetime(df['date'])
        df = df.sort_values('date')
        
        # Time-based features
        df['day_of_week'] = df['date'].dt.dayofweek
        df['day_of_month'] = df['date'].dt.day
        df['month'] = df['date'].dt.month
        df['quarter'] = df['date'].dt.quarter
        df['year'] = df['date'].dt.year
        df['week_of_year'] = df['date'].dt.isocalendar().week
        
        # Lag features (previous sales)
        for lag in [1, 7, 14, 30]:
            df[f'lag_{lag}'] = df['quantity_sold'].shift(lag)
        
        # Rolling statistics
        for window in [7, 14, 30]:
            df[f'rolling_mean_{window}'] = df['quantity_sold'].rolling(window=window).mean()
            df[f'rolling_std_{window}'] = df['quantity_sold'].rolling(window=window).std()
        
        # Drop rows with NaN (from lag/rolling features)
        df = df.dropna()
        
        return df
    
    def train(self, sales_df: pd.DataFrame) -> Dict:
        """
        Train forecasting model on historical sales data
        """
        df = self.prepare_features(sales_df)
        
        if len(df) < 50:  # Minimum data requirement
            return {"error": "Insufficient data for training (need at least 50 records)"}
        
        # Features and target
        feature_cols = [col for col in df.columns if col not in ['date', 'quantity_sold', 'id', 'product_id', 'location_id', 'revenue', 'created_at']]
        X = df[feature_cols]
        y = df['quantity_sold']
        
        # Train model
        self.model.fit(X, y)
        
        return {
            "status": "trained",
            "samples": len(df),
            "features": feature_cols
        }
    
    def predict(self, sales_df: pd.DataFrame, days_ahead: int = 30) -> List[Dict]:
        """
        Generate forecasts for future dates
        """
        df = self.prepare_features(sales_df)
        
        if len(df) == 0:
            return []
        
        last_date = df['date'].max()
        predictions = []
        
        # Generate predictions for each future day
        for i in range(1, days_ahead + 1):
            future_date = last_date + timedelta(days=i)
            
            # Create feature row for future date
            future_features = {
                'day_of_week': future_date.dayofweek,
                'day_of_month': future_date.day,
                'month': future_date.month,
                'quarter': (future_date.month - 1) // 3 + 1,
                'year': future_date.year,
                'week_of_year': future_date.isocalendar()[1],
            }
            
            # Use recent data for lag features
            recent_data = df.tail(30)
            for lag in [1, 7, 14, 30]:
                if lag <= len(recent_data):
                    future_features[f'lag_{lag}'] = recent_data['quantity_sold'].iloc[-lag]
                else:
                    future_features[f'lag_{lag}'] = recent_data['quantity_sold'].mean()
            
            # Rolling statistics from recent data
            for window in [7, 14, 30]:
                future_features[f'rolling_mean_{window}'] = recent_data['quantity_sold'].tail(window).mean()
                future_features[f'rolling_std_{window}'] = recent_data['quantity_sold'].tail(window).std()
            
            # Predict
            feature_cols = [col for col in df.columns if col not in ['date', 'quantity_sold', 'id', 'product_id', 'location_id', 'revenue', 'created_at']]
            X_future = pd.DataFrame([future_features])[feature_cols]
            
            predicted_qty = self.model.predict(X_future)[0]
            
            # Calculate confidence intervals (simple approach using std)
            recent_std = recent_data['quantity_sold'].std()
            lower_bound = max(0, predicted_qty - 1.96 * recent_std)
            upper_bound = predicted_qty + 1.96 * recent_std
            
            predictions.append({
                'forecast_date': future_date,
                'predicted_quantity': float(predicted_qty),
                'lower_bound': float(lower_bound),
                'upper_bound': float(upper_bound),
                'confidence_score': 0.85  # Placeholder
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
