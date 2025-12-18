from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import firebase_admin
from firebase_admin import credentials, auth
import os
from pathlib import Path

# Add support for disabling auth for easier development
DISABLE_AUTH = os.getenv("DISABLE_AUTH", "true").lower() == "true"
firebase_initialized = False

def initialize_firebase():
    global firebase_initialized
    if DISABLE_AUTH:
        print("🔓 Authentication is DISABLED for development")
        return
        
    if not firebase_initialized:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase-service-account.json")
        
        # Check if credentials file exists
        if Path(cred_path).exists():
            try:
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
                firebase_initialized = True
                print("✅ Firebase Admin SDK initialized successfully")
            except Exception as e:
                print(f"⚠️  Firebase initialization failed: {e}")
                print("⚠️  Authentication will be disabled. Please add firebase-service-account.json")
        else:
            print(f"⚠️  Firebase credentials not found at {cred_path}")
            print("⚠️  Authentication will be disabled. Please add firebase-service-account.json")

# HTTP Bearer token scheme
security = HTTPBearer(auto_error=False)

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security)
) -> dict:
    """
    Verify Firebase ID token and return user info.
    If Firebase is not configured or disabled, returns a mock user for development.
    """
    
    # Development mode - no Firebase configured or auth disabled
    if DISABLE_AUTH or not firebase_initialized:
        return {
            "uid": "dev-user-123",
            "email": "dev@example.com",
            "role": "admin"
        }
    
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    try:
        # Verify the ID token
        decoded_token = auth.verify_id_token(credentials.credentials)
        
        return {
            "uid": decoded_token["uid"],
            "email": decoded_token.get("email"),
            "role": decoded_token.get("role", "viewer")  # Default role
        }
    except auth.InvalidIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except auth.ExpiredIdTokenError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication token has expired",
            headers={"WWW-Authenticate": "Bearer"},
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Authentication failed: {str(e)}",
            headers={"WWW-Authenticate": "Bearer"},
        )

def require_role(required_role: str):
    """
    Dependency to check if user has required role.
    Role hierarchy: admin > manager > viewer
    """
    async def role_checker(current_user: dict = Depends(get_current_user)):
        role_hierarchy = {"admin": 3, "manager": 2, "viewer": 1}
        
        user_role_level = role_hierarchy.get(current_user.get("role", "viewer"), 1)
        required_role_level = role_hierarchy.get(required_role, 1)
        
        if user_role_level < required_role_level:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Insufficient permissions. Required role: {required_role}"
            )
        
        return current_user
    
    return role_checker
