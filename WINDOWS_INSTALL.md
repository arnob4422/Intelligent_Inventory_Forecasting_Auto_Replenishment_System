# Windows Installation Guide

## Issue Detected
Your system is missing a C compiler needed to build NumPy from source. Here's the solution:

## Solution 1: Install Pre-built Packages (Recommended)

### Step 1: Upgrade pip
```bash
cd backend
venv\Scripts\activate
python -m pip install --upgrade pip
```

### Step 2: Install packages with pre-built wheels
```bash
pip install --only-binary :all: numpy==1.26.3
pip install --only-binary :all: pandas==2.1.4
pip install --only-binary :all: scikit-learn==1.4.0
pip install --only-binary :all: scipy
```

### Step 3: Install remaining packages
```bash
pip install fastapi==0.109.0
pip install uvicorn[standard]==0.27.0
pip install sqlalchemy==2.0.25
pip install pydantic==2.5.3
pip install pydantic-settings==2.1.0
pip install python-multipart==0.0.6
pip install firebase-admin==6.4.0
pip install statsmodels==0.14.1
pip install python-jose[cryptography]==3.3.0
pip install python-dotenv==1.0.0
pip install pytest==7.4.4
pip install httpx==0.26.0
```

## Solution 2: Use Anaconda (Alternative)

If the above doesn't work, use Anaconda which includes pre-built scientific packages:

1. Download Anaconda: https://www.anaconda.com/download
2. Install Anaconda
3. Open Anaconda Prompt
4. Navigate to backend folder
5. Run:
```bash
conda create -n inventory python=3.11
conda activate inventory
conda install numpy pandas scikit-learn
pip install -r requirements.txt
```

## Frontend Setup - Install Node.js

### Step 1: Download Node.js
1. Go to: https://nodejs.org/
2. Download the LTS version (Long Term Support)
3. Run the installer
4. Accept all defaults
5. Restart your terminal/PowerShell

### Step 2: Verify Installation
```bash
node --version
npm --version
```

### Step 3: Install Frontend Dependencies
```bash
cd frontend
npm install
```

This will take 3-5 minutes.

## Quick Commands After Setup

### Start Backend
```bash
cd backend
venv\Scripts\activate
python seed_data.py
python main.py
```

### Start Frontend (in new terminal)
```bash
cd frontend
npm run dev
```

## If You Still Have Issues

Run this simplified installation:
```bash
cd backend
venv\Scripts\activate
pip install fastapi uvicorn sqlalchemy pydantic firebase-admin
```

This installs core packages only. The ML features will be limited but the system will run.
