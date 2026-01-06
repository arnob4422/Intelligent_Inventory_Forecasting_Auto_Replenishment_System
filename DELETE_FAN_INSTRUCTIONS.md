# How to Delete Fan (PROD-13) Product

## Method 1: Using the Web UI (Recommended - Easiest)

1. Open your browser and go to: http://localhost:5173
2. Navigate to the **Inventory** page
3. Find the row with **Fan (PROD-13)**
4. Click the **trash/delete icon** (🗑️) on the right side of that row
5. Confirm the deletion when prompted
6. The product will be removed from the database

---

## Method 2: Using Python Script (Requires Virtual Environment)

If you want to delete it via script, run these commands:

```powershell
# Navigate to the project root
cd C:\Users\USER\Downloads\Intelligent_Inventory_Forecasting_Auto_Replenishment_System

# Activate virtual environment
.\venv\Scripts\Activate.ps1

# Navigate to backend
cd backend

# Run the delete script
python delete_fan.py
```

---

## Method 3: Direct Database Access (Advanced)

If you have SQLite browser installed, you can:
1. Open `backend/inventory.db` with SQLite browser
2. Find the product with SKU 'PROD-13' in the `products` table
3. Delete related records from `inventory`, `sales_data`, and `forecasts` tables
4. Delete the product record

---

## Note

After deletion, you can always add the Fan product back later through the "Add Product" button in the Inventory page if needed.
