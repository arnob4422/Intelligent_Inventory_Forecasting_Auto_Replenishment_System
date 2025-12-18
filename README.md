# Intelligent Inventory Forecasting & Auto-Replenishment System

A production-ready, AI-powered inventory management system with demand forecasting, anomaly detection, and automated replenishment recommendations.

## 🚀 Features

- **Demand Forecasting**: ML-powered time series forecasting using Random Forest
- **Anomaly Detection**: Automatic detection of sales spikes, drops, and unusual patterns
- **Auto-Replenishment**: Intelligent reorder point and quantity calculations
- **Multi-Location Support**: Manage inventory across warehouses and stores
- **Simulation Engine**: Test different inventory strategies
- **Role-Based Access**: Firebase authentication with admin/manager/viewer roles
- **Modern UI**: Beautiful, responsive React dashboard with real-time charts

## 📋 Tech Stack

### Backend
- **FastAPI**: High-performance Python web framework
- **SQLAlchemy**: ORM for database operations
- **SQLite**: Lightweight database (easily swappable for PostgreSQL/MySQL)
- **Scikit-learn**: Machine learning for forecasting and anomaly detection
- **Firebase Admin SDK**: Authentication and authorization
- **Pandas/NumPy**: Data processing and analysis

### Frontend
- **React 18**: Modern UI library
- **Vite**: Lightning-fast build tool
- **TailwindCSS**: Utility-first CSS framework
- **Recharts**: Beautiful charting library
- **React Router**: Client-side routing
- **Axios**: HTTP client
- **Firebase SDK**: Client-side authentication

## 📁 Project Structure

```
Intelligent Inventory Forecasting & Auto-Replenishment System/
├── backend/
│   ├── main.py                 # FastAPI application entry point
│   ├── database.py             # Database configuration
│   ├── models.py               # SQLAlchemy models
│   ├── schemas.py              # Pydantic schemas
│   ├── auth.py                 # Firebase authentication
│   ├── ml_engine.py            # ML forecasting & anomaly detection
│   ├── seed_data.py            # Database seeding script
│   ├── requirements.txt        # Python dependencies
│   └── routes/
│       ├── products.py         # Product management
│       ├── inventory.py        # Inventory tracking
│       ├── sales.py            # Sales data management
│       ├── forecast.py         # Forecasting endpoints
│       ├── anomalies.py        # Anomaly detection
│       ├── recommendations.py  # Replenishment recommendations
│       ├── simulations.py      # Inventory simulations
│       └── locations.py        # Location management
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   └── Layout.jsx      # Main layout with sidebar
│   │   ├── contexts/
│   │   │   └── AuthContext.jsx # Authentication context
│   │   ├── pages/
│   │   │   ├── Login.jsx       # Login/signup page
│   │   │   ├── Dashboard.jsx   # Main dashboard
│   │   │   ├── Inventory.jsx   # Inventory management
│   │   │   ├── Forecasting.jsx # Demand forecasting
│   │   │   ├── Anomalies.jsx   # Anomaly detection
│   │   │   └── Recommendations.jsx # Replenishment
│   │   ├── services/
│   │   │   └── api.js          # API service layer
│   │   ├── App.jsx             # Main app component
│   │   ├── main.jsx            # React entry point
│   │   ├── firebase.js         # Firebase configuration
│   │   └── index.css           # Global styles
│   ├── package.json
│   ├── vite.config.js
│   └── tailwind.config.js
└── data/                       # SQLite database (auto-created)
```

## 🛠️ Setup Instructions

### Prerequisites
- Python 3.9+
- Node.js 18+
- npm or yarn

### Backend Setup

1. **Navigate to backend directory**
   ```bash
   cd backend
   ```

2. **Create virtual environment**
   ```bash
   python -m venv venv
   ```

3. **Activate virtual environment**
   - Windows:
     ```bash
     venv\Scripts\activate
     ```
   - macOS/Linux:
     ```bash
     source venv/bin/activate
     ```

4. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

5. **Configure environment variables** (Optional)
   ```bash
   copy .env.example .env
   ```
   Edit `.env` if needed (defaults work fine for development)

6. **Seed the database with sample data**
   ```bash
   python seed_data.py
   ```

7. **Run the backend server**
   ```bash
   python main.py
   ```
   
   Backend will be available at: `http://localhost:8000`
   API Documentation: `http://localhost:8000/docs`

### Frontend Setup

1. **Navigate to frontend directory**
   ```bash
   cd frontend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Run the development server**
   ```bash
   npm run dev
   ```
   
   Frontend will be available at: `http://localhost:5173`

## 🔐 Firebase Authentication Setup (Optional)

The system works in **development mode** without Firebase. To enable full authentication:

### Backend Configuration

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Go to Project Settings → Service Accounts
4. Click "Generate New Private Key"
5. Save the JSON file as `backend/firebase-service-account.json`

### Frontend Configuration

1. In Firebase Console, go to Project Settings → General
2. Under "Your apps", click the web icon (</>)
3. Copy the `firebaseConfig` object
4. Update `frontend/src/firebase.js` with your config:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 📊 Usage Guide

### 1. Login
- Use any email/password in development mode
- With Firebase: Create account or login with existing credentials

### 2. Dashboard
- View system statistics
- Monitor low stock alerts
- Check recent anomalies
- Review pending recommendations

### 3. Inventory Management
- View all products and stock levels
- Filter and search products
- Update stock quantities
- Monitor stock status (Critical/Low/Normal/Overstocked)

### 4. Demand Forecasting
- Select a product
- Choose forecast horizon (7-90 days)
- Click "Generate Forecast"
- View predictions with confidence intervals
- Analyze trends and patterns

### 5. Anomaly Detection
- System automatically detects unusual sales patterns
- View detected anomalies (spikes, drops, pattern changes)
- Filter by resolved/unresolved
- Mark anomalies as resolved

### 6. Replenishment Recommendations
- View AI-generated reorder suggestions
- See priority levels (Urgent/High/Medium/Low)
- Approve or reject recommendations
- Track recommendation status

## 🧪 API Endpoints

### Products
- `GET /api/products/` - List all products
- `POST /api/products/` - Create product (Manager+)
- `PUT /api/products/{id}` - Update product (Manager+)
- `DELETE /api/products/{id}` - Delete product (Admin)

### Inventory
- `GET /api/inventory/` - List inventory
- `GET /api/inventory/low-stock/` - Get low stock items
- `PUT /api/inventory/{id}` - Update inventory (Manager+)

### Sales
- `GET /api/sales/` - List sales data
- `POST /api/sales/bulk-upload` - Upload CSV (Manager+)
- `GET /api/sales/analytics/summary` - Get analytics

### Forecasting
- `POST /api/forecast/generate` - Generate forecast (Manager+)
- `GET /api/forecast/` - List forecasts

### Anomalies
- `POST /api/anomalies/detect` - Detect anomalies (Manager+)
- `GET /api/anomalies/` - List anomalies
- `PUT /api/anomalies/{id}/resolve` - Resolve anomaly (Manager+)

### Recommendations
- `POST /api/recommendations/generate` - Generate recommendations (Manager+)
- `GET /api/recommendations/` - List recommendations
- `PUT /api/recommendations/{id}/status` - Update status (Manager+)

### Simulations
- `POST /api/simulations/run` - Run simulation (Manager+)
- `GET /api/simulations/` - List simulations

## 🔧 Configuration

### Backend Environment Variables
```env
DATABASE_URL=sqlite:///./data/inventory.db
FIREBASE_CREDENTIALS_PATH=./firebase-service-account.json
SECRET_KEY=your-secret-key-here
```

### Frontend Environment Variables
Create `frontend/.env`:
```env
VITE_API_URL=http://localhost:8000
```

## 🎨 Design Features

- **Modern Gradient UI**: Beautiful color schemes with smooth transitions
- **Responsive Design**: Works on desktop, tablet, and mobile
- **Interactive Charts**: Real-time data visualization with Recharts
- **Smooth Animations**: Micro-interactions for better UX
- **Dark Mode Ready**: Easy to extend with dark mode support

## 🚀 Production Deployment

### Backend
1. Use PostgreSQL or MySQL instead of SQLite
2. Set strong `SECRET_KEY` in environment
3. Enable HTTPS
4. Configure CORS for your domain
5. Use production WSGI server (Gunicorn/Uvicorn)

### Frontend
1. Build production bundle: `npm run build`
2. Serve `dist/` folder with Nginx/Apache
3. Update `VITE_API_URL` to production backend URL
4. Enable Firebase authentication

## 📝 License

This project is provided as-is for educational and commercial use.

## 🤝 Support

For issues or questions, please check the API documentation at `/docs` endpoint.

---

**Built with ❤️ using FastAPI, React, and Machine Learning**
