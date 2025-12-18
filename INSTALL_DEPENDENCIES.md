# Step-by-Step Dependency Installation Guide

## Current Status
✅ Python 3.14.0 is installed  
❌ Node.js is NOT installed  
⚠️ C/C++ compiler is missing (needed for NumPy, Pandas, Scikit-learn)

## EASIEST SOLUTION: Use Anaconda (Recommended for Windows)

### Why Anaconda?
Anaconda includes pre-compiled scientific packages (NumPy, Pandas, Scikit-learn) so you don't need a C compiler.

### Step 1: Install Anaconda
1. Download from: **https://www.anaconda.com/download**
2. Choose "Windows" and download the installer
3. Run the installer (accept all defaults)
4. ✅ Check "Add Anaconda to PATH" during installation

### Step 2: Install Backend Dependencies
Open **Anaconda Prompt** (search for it in Start menu):

```bash
# Navigate to project
cd "c:\Users\user\Downloads\Intelligent Inventory Forecasting & Auto-Replenishment System\backend"

# Create conda environment
conda create -n inventory python=3.11 -y

# Activate environment
conda activate inventory

# Install scientific packages (pre-compiled!)
conda install numpy pandas scikit-learn statsmodels -y

# Install remaining packages with pip
pip install fastapi==0.109.0
pip install uvicorn[standard]==0.27.0
pip install sqlalchemy==2.0.25
pip install pydantic==2.5.3
pip install pydantic-settings==2.1.0
pip install python-multipart==0.0.6
pip install firebase-admin==6.4.0
pip install python-jose[cryptography]==3.3.0
pip install python-dotenv==1.0.0
pip install pytest==7.4.4
pip install httpx==0.26.0
```

### Step 3: Seed Database
```bash
python seed_data.py
```

### Step 4: Run Backend
```bash
python main.py
```

## Install Node.js for Frontend

### Step 1: Download Node.js
1. Go to: **https://nodejs.org/**
2. Download the **LTS version** (left button - Long Term Support)
3. Run the installer
4. Accept all defaults
5. **Restart your computer** (important!)

### Step 2: Verify Node.js Installation
Open a NEW PowerShell window:
```bash
node --version
npm --version
```

You should see version numbers.

### Step 3: Install Frontend Dependencies
```bash
cd "c:\Users\user\Downloads\Intelligent Inventory Forecasting & Auto-Replenishment System\frontend"
npm install
```

This will take 3-5 minutes.

## Running the Application

### Terminal 1 - Backend (Anaconda Prompt)
```bash
cd "c:\Users\user\Downloads\Intelligent Inventory Forecasting & Auto-Replenishment System\backend"
conda activate inventory
python main.py
```

### Terminal 2 - Frontend (PowerShell)
```bash
cd "c:\Users\user\Downloads\Intelligent Inventory Forecasting & Auto-Replenishment System\frontend"
npm run dev
```

### Access the App
Open browser: **http://localhost:5173**

## ALTERNATIVE: Install Visual Studio Build Tools (Advanced)

If you don't want to use Anaconda, install Microsoft C++ Build Tools:

1. Download: **https://visualstudio.microsoft.com/visual-cpp-build-tools/**
2. Run installer
3. Select "Desktop development with C++"
4. Install (takes 6GB+ space)
5. Restart computer
6. Then run:
```bash
cd backend
venv\Scripts\activate
pip install -r requirements.txt
```

## Troubleshooting

### "conda: command not found"
- Restart your computer after installing Anaconda
- Or manually add to PATH: `C:\Users\user\anaconda3\Scripts`

### "node: command not found"
- Restart your computer after installing Node.js
- Verify installation path: `C:\Program Files\nodejs`

### Backend won't start
- Make sure you activated conda environment: `conda activate inventory`
- Check if port 8000 is free: `netstat -ano | findstr :8000`

### Frontend won't start
- Delete `node_modules` folder and run `npm install` again
- Make sure Node.js version is 18+

## Quick Reference

**Backend with Anaconda:**
```bash
conda activate inventory
cd backend
python main.py
```

**Frontend:**
```bash
cd frontend
npm run dev
```

**Login:** Use any email/password (dev mode)

## Next Steps After Installation

1. ✅ Install Anaconda
2. ✅ Install backend dependencies
3. ✅ Install Node.js
4. ✅ Install frontend dependencies
5. ✅ Seed database
6. ✅ Run both servers
7. ✅ Access http://localhost:5173
