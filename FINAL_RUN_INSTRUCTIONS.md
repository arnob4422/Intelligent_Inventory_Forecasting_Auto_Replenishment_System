# 🚀 HOW TO RUN THIS PROJECT

## ✅ BACKEND (Works Now!)

### Method 1: Double-Click (Easiest!)
1. Go to the `backend` folder
2. **Double-click** `START_BACKEND.bat`
3. Server will start automatically!

### Method 2: Command Line
```bash
cd backend
venv\Scripts\python main.py
```

### Access Backend:
- **API Documentation:** http://localhost:8000/docs
- **System Stats:** http://localhost:8000/api/stats
- **Products:** http://localhost:8000/api/products/

---

## ⏳ FRONTEND (Requires Node.js)

### Step 1: Install Node.js
1. Download: https://nodejs.org/
2. Install the LTS version
3. Restart your computer

### Step 2: Install Dependencies
```bash
cd frontend
npm install
```

### Step 3: Run Frontend
```bash
npm run dev
```

### Access Frontend:
- **React App:** http://localhost:5173

---

## 📊 What's Available Now

### ✅ Backend Features (Working!)
- Full REST API with 30+ endpoints
- 6 Products in database
- 4 Locations (warehouses & stores)
- 2,160 Sales records (90 days)
- Interactive API documentation
- Basic replenishment recommendations

### ⏳ Frontend (Needs Node.js)
- Beautiful React dashboard
- Charts and visualizations
- Product & inventory management
- Sales analytics

### ⏳ Advanced ML (Needs Anaconda)
- Demand forecasting
- Anomaly detection
- Simulations

---

## 🎯 Quick Start

1. **Run Backend:**
   - Double-click `backend\START_BACKEND.bat`
   - OR run: `cd backend` then `venv\Scripts\python main.py`

2. **Open Browser:**
   - Go to: http://localhost:8000/docs

3. **Test API:**
   - Click any endpoint
   - Click "Try it out"
   - Click "Execute"
   - See results!

---

## ❓ Troubleshooting

### "ModuleNotFoundError: No module named 'fastapi'"
**Solution:** Use the correct command:
```bash
cd backend
venv\Scripts\python main.py
```

### "This site can't be reached" at 0.0.0.0:8000
**Solution:** Use `localhost` instead:
```
http://localhost:8000/docs
```

### Frontend won't start
**Solution:** Install Node.js first from https://nodejs.org/

---

## 📝 Summary

| Component | Status | How to Run |
|-----------|--------|------------|
| Backend | ✅ Ready | `backend\START_BACKEND.bat` |
| Frontend | ⏳ Needs Node.js | Install Node.js → `npm install` → `npm run dev` |
| ML Features | ⏳ Needs Anaconda | Optional - see INSTALL_DEPENDENCIES.md |

**Your backend is ready to use right now!** 🎉
