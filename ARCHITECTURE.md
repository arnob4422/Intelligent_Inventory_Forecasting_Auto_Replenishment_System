# Architecture Documentation

## System Overview

The Intelligent Inventory Forecasting System is a full-stack application that combines machine learning, real-time data processing, and modern web technologies to provide intelligent inventory management.

## Architecture Layers

### 1. Presentation Layer (Frontend)
- **Technology**: React 18 + Vite
- **Styling**: TailwindCSS
- **State Management**: React Context API
- **Routing**: React Router v6
- **Charts**: Recharts

**Key Components**:
- `Layout`: Main application shell with sidebar navigation
- `AuthContext`: Global authentication state
- `Dashboard`: Overview with key metrics and alerts
- `Inventory`: Product and stock management
- `Forecasting`: ML-powered demand predictions
- `Anomalies`: Unusual pattern detection
- `Recommendations`: Auto-replenishment suggestions

### 2. API Layer (Backend)
- **Framework**: FastAPI
- **Authentication**: Firebase Admin SDK
- **Validation**: Pydantic schemas
- **CORS**: Configured for local development

**Route Modules**:
- `/api/products`: Product CRUD operations
- `/api/inventory`: Stock level management
- `/api/sales`: Historical sales data
- `/api/forecast`: Demand forecasting
- `/api/anomalies`: Anomaly detection
- `/api/recommendations`: Replenishment logic
- `/api/simulations`: What-if scenarios
- `/api/locations`: Warehouse/store management

### 3. Business Logic Layer
- **ML Engine** (`ml_engine.py`):
  - `ForecastingEngine`: Random Forest-based time series forecasting
  - `AnomalyDetector`: Isolation Forest + Z-score analysis
  - `ReplenishmentCalculator`: Reorder point and quantity logic
  - `SimulationEngine`: Inventory strategy testing

### 4. Data Layer
- **ORM**: SQLAlchemy
- **Database**: SQLite (development) / PostgreSQL (production)
- **Models**:
  - `Product`: Item metadata
  - `Location`: Warehouses and stores
  - `SalesData`: Historical transactions
  - `Inventory`: Current stock levels
  - `Forecast`: Prediction results
  - `Anomaly`: Detected issues
  - `ReplenishmentRecommendation`: Reorder suggestions
  - `SimulationRun`: Simulation results

## Data Flow

### Forecasting Flow
1. User selects product and forecast horizon
2. Frontend calls `/api/forecast/generate`
3. Backend fetches historical sales data
4. ML engine trains Random Forest model
5. Model generates predictions with confidence intervals
6. Results saved to database
7. Frontend displays interactive chart

### Anomaly Detection Flow
1. System analyzes sales data periodically
2. Z-score and Isolation Forest algorithms detect outliers
3. Anomalies classified by severity (critical/high/medium/low)
4. Results stored in database
5. Dashboard displays alerts
6. Users can mark as resolved

### Replenishment Flow
1. System calculates reorder points: ROP = (Avg Daily Demand × Lead Time) + Safety Stock
2. Compares current stock to reorder point
3. Generates recommendations with priority levels
4. Users approve/reject recommendations
5. Status tracked throughout lifecycle

## Security Architecture

### Authentication
- **Firebase Authentication**: Industry-standard OAuth 2.0
- **Token-based**: JWT tokens for API requests
- **Role-based Access Control (RBAC)**:
  - **Admin**: Full system access
  - **Manager**: Can create forecasts, manage inventory
  - **Viewer**: Read-only access

### Authorization
- Middleware checks token validity on each request
- Role requirements enforced at route level
- Development mode available without Firebase

## Machine Learning Architecture

### Forecasting Model
- **Algorithm**: Random Forest Regressor
- **Features**:
  - Time-based: day of week, month, quarter, week of year
  - Lag features: previous 1, 7, 14, 30 days
  - Rolling statistics: 7, 14, 30-day moving averages and std dev
- **Training**: On-demand per product
- **Output**: Point predictions + confidence intervals

### Anomaly Detection
- **Method 1**: Z-score (statistical)
  - Flags values >3 standard deviations from mean
- **Method 2**: Isolation Forest (ML-based)
  - Detects pattern anomalies
- **Combined Approach**: Reduces false positives

## Scalability Considerations

### Current Design (Small-Medium Scale)
- SQLite for simplicity
- Synchronous processing
- Single-server deployment

### Production Scaling Options
1. **Database**: Migrate to PostgreSQL/MySQL
2. **Caching**: Add Redis for frequently accessed data
3. **Async Processing**: Use Celery for background jobs
4. **Load Balancing**: Multiple FastAPI instances
5. **CDN**: Serve frontend assets via CDN
6. **Monitoring**: Add Prometheus + Grafana

## Technology Decisions

### Why FastAPI?
- High performance (async support)
- Automatic API documentation
- Built-in validation with Pydantic
- Modern Python features

### Why React?
- Component reusability
- Large ecosystem
- Excellent developer experience
- Virtual DOM for performance

### Why SQLite (Development)?
- Zero configuration
- File-based (easy backup)
- Perfect for prototyping
- Easy migration to PostgreSQL

### Why Random Forest for Forecasting?
- Handles non-linear patterns
- Robust to outliers
- No need for data normalization
- Feature importance insights

### Why TailwindCSS?
- Rapid UI development
- Consistent design system
- Small bundle size (purged)
- Highly customizable

## Future Enhancements

1. **Real-time Updates**: WebSocket support for live data
2. **Advanced ML**: LSTM/Prophet for better forecasting
3. **Multi-tenancy**: Support multiple organizations
4. **Mobile App**: React Native companion app
5. **Automated Ordering**: Direct integration with suppliers
6. **Reporting**: PDF/Excel export functionality
7. **Notifications**: Email/SMS alerts for critical events
