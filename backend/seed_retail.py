import sqlite3
import os

def seed_retail_products():
    db_path = "../data/inventory.db"
    if not os.path.exists(db_path):
        db_path = "data/inventory.db"
        
    classes = ['-', '6973077693007', '7up', 'AirSoft', 'Ambassadeur', 'Arruapan', 'Atlantico', 'Auzia', 'BFree', 'Basilico', 'Bimo', 'Bingo', 'Bisowik', 'Bladi', 'Bona', 'Bonal', 'Bref', 'Brossevvc', 'Bueno', 'Cacakuetes', 'Caramello', 'Casa mar', 'Celia', 'Chiuaua', 'Clorant', 'Conbebe', 'Condia', 'Confi Africats', 'Cotex', 'Cremy', 'Cristal', 'Crunchy', 'Daddy', 'Dahlia', 'Datte', 'Dorex', 'Douceline', 'Dziriya', 'Eden', 'Elhana', 'Elhara', 'Excellence', 'FH', 'Fibrax', 'Flan', 'Force Xpress', 'Gatoya', 'Gloria', 'Go Snack', 'Goldex', 'Grains de sesame', 'Guigoz', 'Harissa', 'Hopla', 'Hrousse', 'Indigo', 'JE Reste', 'Jumbo', 'Kenz', 'La Caille', 'Label', 'Labelle', 'Lavande', 'LaveSole', 'Lebleb', 'Lebled', 'Lebled-', 'Liya', 'Maestro', 'Maitre', 'Mariciana', 'Milina', 'Molino', 'Mystic Garden', 'Nada', 'Nedex', 'Nescafe', 'Nesquik', 'Nestle', 'Net GO', 'Nouara', 'Nuance', 'OBRIO', 'Oceana', 'Papilion', 'Parex', 'Polish', 'Polystar', 'Prince', 'Prosafe', 'Ricamar', 'SOS', 'Sandvich', 'Sanino', 'Saveurs du Monde', 'Sosemie', 'StarSols', 'Tartiner', 'Tassilo', 'Twisco', 'Twist', 'VIVA', 'Wafa', 'Zahouani', 'afia', 'aigle', 'amir', 'amour', 'awane', 'berbere', 'bombom', 'bonal', 'bref', 'brilex', 'burger', 'celia', 'chapelure', 'cherchell', 'chocapic', 'coca cola', 'cocacola', 'condia', 'cotex', 'ela', 'elgorriaga', 'elitta', 'extra', 'fanta', 'force xpress', 'frottoire', 'froutoire', 'gloria', 'hmis', 'ifruit', 'jumbo', 'kidy', 'le chef', 'le panier', 'life', 'life javel', 'nestle', 'nouara', 'olive', 'pitbull', 'recamar', 'ricamar', 'selecto', 'sofia', 'sprite', 'tango', 'thon', 'top yumy', 'wafa']

    print(f"Connecting to {db_path}...")
    try:
        conn = sqlite3.connect(db_path)
        cursor = conn.cursor()
        
        batch_data = []
        for i, cls in enumerate(classes):
            if cls == '-' or not cls: continue
            
            # Clean name for DB
            display_name = cls.title()
            sku = f"RET-{i:03d}"
            
            # Check if exists
            cursor.execute("SELECT id FROM products WHERE name = ?", (display_name,))
            if cursor.fetchone():
                continue
                
            batch_data.append((sku, display_name, "Retail", 7, 10, 150.0))
        
        if batch_data:
            cursor.executemany("""
                INSERT INTO products (sku, name, category, lead_time_days, safety_stock_level, unit_cost, created_at)
                VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
            """, batch_data)
            conn.commit()
            print(f"Successfully added {len(batch_data)} retail products.")
        else:
            print("No new products to add.")
            
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    seed_retail_products()
