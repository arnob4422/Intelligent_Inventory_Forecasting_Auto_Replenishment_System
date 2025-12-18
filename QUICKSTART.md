# Quick Start Guide

## Backend Setup (5 minutes)

1. Open terminal in `backend/` folder
2. Create virtual environment:
   ```bash
   python -m venv venv
   venv\Scripts\activate
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Seed database:
   ```bash
   python seed_data.py
   ```
5. Start server:
   ```bash
   python main.py
   ```

✅ Backend running at http://localhost:8000

## Frontend Setup (3 minutes)

1. Open new terminal in `frontend/` folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start dev server:
   ```bash
   npm run dev
   ```

✅ Frontend running at http://localhost:5173

## Login

Use any email/password (development mode)
Example: `admin@test.com` / `password123`

## Next Steps

1. Explore Dashboard
2. Generate a forecast for a product
3. Check anomaly detection
4. Review replenishment recommendations
