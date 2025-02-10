import mysql.connector
from PIL import Image, ImageDraw, ImageFont, ImageOps
import tkinter as tk
from tkinter import ttk
import datetime

DB_CONFIG = {
    "host": "localhost",
    "port": 3306,
    "user": "root",
    "password": "zakaria",
    "database": "parking_manager",
}

def fetch_parking_data():
    connection = mysql.connector.connect(**DB_CONFIG)
    cursor = connection.cursor(dictionary=True)

    cursor.execute("SELECT DISTINCT detected_at FROM parking_spot_logs ORDER BY detected_at DESC")
    times = [row["detected_at"] for row in cursor.fetchall()]

    cursor.execute("""
        SELECT parking_spot_logs.parking_spot_id, parking_spot_logs.status, parking_spot_logs.detected_at 
        FROM parking_spot_logs 
        ORDER BY parking_spot_logs.detected_at DESC
    """)
    logs = cursor.fetchall()

    cursor.close()
    connection.close()
    return times, logs

def draw_rounded_rectangle(draw, x1, y1, x2, y2, radius, fill, outline):
    """Draws a rounded rectangle."""
    draw.rectangle([x1 + radius, y1, x2 - radius, y2], fill=fill, outline=outline)
    draw.rectangle([x1, y1 + radius, x2, y2 - radius], fill=fill, outline=outline)
    draw.pieslice([x1, y1, x1 + 2 * radius, y1 + 2 * radius], 180, 270, fill=fill, outline=outline)
    draw.pieslice([x2 - 2 * radius, y1, x2, y1 + 2 * radius], 270, 360, fill=fill, outline=outline)
    draw.pieslice([x1, y2 - 2 * radius, x1 + 2 * radius, y2], 90, 180, fill=fill, outline=outline)
    draw.pieslice([x2 - 2 * radius, y2 - 2 * radius, x2, y2], 0, 90, fill=fill, outline=outline)

def draw_parking_lot(parking_status):
    """
    Draws a 2-row parking lot layout with 14 spots.
    Each parking spot is labeled and color-coded based on its status.
    """
    canvas_width = 900
    canvas_height = 500
    spot_width = 100
    spot_height = 60
    margin = 20
    font = ImageFont.truetype("Arial.ttf", 18)

    image = Image.new("RGB", (canvas_width, canvas_height), "#f0f0f0")
    draw = ImageDraw.Draw(image)

    draw.rectangle([10, 10, canvas_width - 10, canvas_height - 10], fill="#d0d0d0", outline="black", width=3)

    for i in range(14):
        row = i // 7  # 0 for top row, 1 for bottom row
        col = i % 7   # Column index

        x1 = margin + col * (spot_width + margin)
        y1 = margin + row * (spot_height + margin)
        x2 = x1 + spot_width
        y2 = y1 + spot_height

        spot_id = i + 1
        color = "#7fff7f" if parking_status.get(spot_id, "Free") == "Free" else "#ff7f7f"
        border_color = "#007f00" if parking_status.get(spot_id, "Free") == "Free" else "#7f0000"

        draw_rounded_rectangle(draw, x1, y1, x2, y2, radius=10, fill=color, outline=border_color)

        label = f"P{spot_id}"
        draw.text((x1 + 20, y1 + 20), label, fill="black", font=font)

    legend_x = canvas_width - 200
    legend_y = canvas_height - 100
    draw.rectangle([legend_x, legend_y, legend_x + 180, legend_y + 80], fill="#ffffff", outline="black")
    draw.text((legend_x + 10, legend_y + 10), "Legend:", fill="black", font=font)
    draw.rectangle([legend_x + 10, legend_y + 40, legend_x + 40, legend_y + 60], fill="#7fff7f", outline="black")
    draw.text((legend_x + 50, legend_y + 40), "Free", fill="black", font=font)
    draw.rectangle([legend_x + 10, legend_y + 70, legend_x + 40, legend_y + 90], fill="#ff7f7f", outline="black")
    draw.text((legend_x + 50, legend_y + 70), "Occupied", fill="black", font=font)

    image_path = "parking_lot_status.png"
    image.save(image_path)
    return image_path

# GUI for selecting timestamp and viewing parking lot status
def show_parking_lot():
    times, logs = fetch_parking_data()

    status_by_time = {}
    for log in logs:
        time = log["detected_at"]
        if time not in status_by_time:
            status_by_time[time] = {}
        status_by_time[time][log["parking_spot_id"]] = log["status"]

    root = tk.Tk()
    root.title("Parking Lot Status")

    time_label = tk.Label(root, text="Select Detection Time:")
    time_label.pack(pady=5)
    time_dropdown = ttk.Combobox(root, values=[str(t) for t in times], state="readonly")
    time_dropdown.pack(pady=5)
    time_dropdown.set("Select Time")

    def update_parking_lot():
        selected_time_str = time_dropdown.get()
        if selected_time_str == "Select Time":
            return

        selected_time = datetime.datetime.strptime(selected_time_str, "%Y-%m-%d %H:%M:%S")
        parking_status = status_by_time[selected_time]
        image_path = draw_parking_lot(parking_status)

        parking_image = Image.open(image_path)
        parking_image.show()

    update_button = tk.Button(root, text="Show Parking Lot Status", command=update_parking_lot)
    update_button.pack(pady=10)

    root.mainloop()

if __name__ == "__main__":
    show_parking_lot()
