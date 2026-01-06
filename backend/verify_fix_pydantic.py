import warnings
import sys
import os

# Add current directory to path
sys.path.append(os.getcwd())

print("Testing Pydantic schemas for warnings...")
with warnings.catch_warnings(record=True) as w:
    warnings.simplefilter("always")
    import schemas
    
    found_warning = False
    for warning in w:
        if "protected namespace" in str(warning.message):
            print(f"❌ Found warning: {warning.message}")
            found_warning = True
    
    if not found_warning:
        print("✅ No protected namespace warnings found!")
