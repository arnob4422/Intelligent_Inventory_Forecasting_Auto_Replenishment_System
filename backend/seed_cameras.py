from database import SessionLocal
import models

def seed_cameras():
    db = SessionLocal()
    try:
        # Check if we already have cameras
        if db.query(models.Camera).count() > 0:
            print("Cameras already exist. Skipping seed.")
            return

        # Add mock cameras
        cameras = [
            models.Camera(name="Main Entrance", type="network", status="online", location_id=1),
            models.Camera(name="Warehouse Aisle 4", type="network", status="online", location_id=1),
            models.Camera(name="Stock Room", type="network", status="offline", location_id=2)
        ]
        db.add_all(cameras)
        db.commit()
        print(f"Successfully seeded {len(cameras)} mock cameras.")
    except Exception as e:
        print(f"Error seeding cameras: {e}")
    finally:
        db.close()

if __name__ == "__main__":
    seed_cameras()
