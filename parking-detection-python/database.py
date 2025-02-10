import mysql.connector
from mysql.connector import errorcode
import json
import os
from dotenv import load_dotenv

load_dotenv()

DB_HOST = os.getenv('DB_HOST', 'localhost')
DB_PORT = int(os.getenv('DB_PORT', 3306))
DB_USER = os.getenv('DB_USER', 'root')
DB_PASSWORD = os.getenv('DB_PASSWORD', '')
DB_NAME = os.getenv('DB_NAME', 'parking_manager')

def get_db_connection(database=None):
    try:
        cnx = mysql.connector.connect(
            host=DB_HOST,
            port=DB_PORT,
            user=DB_USER,
            password=DB_PASSWORD,
            database=database
        )
        return cnx
    except mysql.connector.Error as err:
        if err.errno == errorcode.ER_BAD_DB_ERROR and database:
            return None
        else:
            print("MySQL Error:", err)
            return None

def initialize_database():
    # 1) ensure DB exists
    conn = get_db_connection()
    if conn is None:
        print("Failed to connect to MySQL server.")
        return
    cursor = conn.cursor()
    try:
        cursor.execute(f"CREATE DATABASE IF NOT EXISTS {DB_NAME}")
        print(f"Database '{DB_NAME}' is ready.")
    except mysql.connector.Error as e:
        print("Failed creating database:", e)
    finally:
        cursor.close()
        conn.close()

    # 2) create tables for local polygon storage
    conn = get_db_connection(DB_NAME)
    if conn is None:
        print(f"Failed connecting to DB={DB_NAME}")
        return
    cursor = conn.cursor()

    create_spots_sql = """
    CREATE TABLE IF NOT EXISTS parking_spot_definitions (
        id INT AUTO_INCREMENT PRIMARY KEY,
        label VARCHAR(50) NOT NULL UNIQUE,
        points JSON NOT NULL
    );
    """
    create_logs_sql = """
    CREATE TABLE IF NOT EXISTS parking_spot_logs (
        id INT AUTO_INCREMENT PRIMARY KEY,
        parking_spot_id INT NOT NULL,
        status ENUM('Occupied','Free') NOT NULL,
        detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (parking_spot_id) REFERENCES parking_spot_definitions(id)
            ON DELETE CASCADE
            ON UPDATE CASCADE
    );
    """
    try:
        cursor.execute(create_spots_sql)
        cursor.execute(create_logs_sql)
        conn.commit()
        print("Tables are ready: parking_spot_definitions, parking_spot_logs")
    except mysql.connector.Error as e:
        print("Error creating tables:", e)
    finally:
        cursor.close()
        conn.close()

def save_parking_spot(label, points):
    """
    Insert a new row into 'parking_spot_definitions',
    storing (label, points-as-JSON).
    label might be '1','2','3', etc.
    points is a list of 4 (x,y) corners.
    """
    conn = get_db_connection(DB_NAME)
    if conn is None:
        print("No DB connection for save_parking_spot.")
        return
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO parking_spot_definitions (label, points)
            VALUES (%s, %s)
        """, (label, json.dumps(points)))
        conn.commit()
        print(f"Parking spot label={label} saved to local DB.")
    except mysql.connector.Error as e:
        print(f"Error saving spot label={label}:", e)
    finally:
        cursor.close()
        conn.close()

def load_parking_spots():
    """
    Return a list of dicts from parking_spot_definitions,
    each dict => { 'id':..., 'label':..., 'points':... }
    """
    conn = get_db_connection(DB_NAME)
    if conn is None:
        return []
    cursor = conn.cursor(dictionary=True)
    try:
        cursor.execute("SELECT * FROM parking_spot_definitions")
        rows = cursor.fetchall()
        return rows
    except mysql.connector.Error as e:
        print("Error loading spots:", e)
        return []
    finally:
        cursor.close()
        conn.close()

def save_parking_spot_log(parking_spot_id, status):
    """
    Optionally log each detection result.
    """
    conn = get_db_connection(DB_NAME)
    if conn is None:
        return
    cursor = conn.cursor()
    try:
        cursor.execute("""
            INSERT INTO parking_spot_logs (parking_spot_id, status)
            VALUES (%s, %s)
        """, (parking_spot_id, status))
        conn.commit()
        print(f"Log saved: ID={parking_spot_id}, status={status}")
    except mysql.connector.Error as e:
        print("Error saving log:", e)
    finally:
        cursor.close()
        conn.close()
