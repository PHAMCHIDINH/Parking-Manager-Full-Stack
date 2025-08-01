import cv2
import numpy as np
import os
import json
import time
import threading
import requests
from ultralytics import YOLO
from datetime import datetime

##############################################################################
# CONFIG - Video Processing
##############################################################################

BASE_URL = "http://localhost:8080"
GET_ALL_SPOTS_URL = f"{BASE_URL}/api/parking"
DEFINE_CORNERS_URL = f"{BASE_URL}/api/parking/define-corners"
PYTHON_OCC_URL = f"{BASE_URL}/api/parking/python-occupancies"

# YOLO model path
YOLO_MODEL_PATH = 'z.pt'

# Video Configuration
VIDEO_PATH = 'image/parking_video.mp4'  # Thay bằng đường dẫn video của bạn
# Hoặc sử dụng webcam: VIDEO_PATH = 0

# Ảnh để định nghĩa vị trí ô đỗ (chỉ dùng 1 lần)
REFERENCE_IMAGE_PATH = 'image/reference_frame.jpg'

# Output
OUTPUT_VIDEO_PATH = 'image/detection_output.mp4'
OUTPUT_FRAME_PATH = 'image/current_frame.jpg'

CONFIDENCE_THRESHOLD = 0.1
UPDATE_INTERVAL = 2.0  # Gửi update mỗi 2 giây
FRAME_SKIP = 3  # Process mỗi 3 frames để tăng performance

##############################################################################
# HELPER FUNCTIONS
##############################################################################

def resize_with_aspect_ratio(image, max_width=1280, max_height=720):
    """Resize image while preserving aspect ratio."""
    h, w = image.shape[:2]
    scale = min(max_width / w, max_height / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale

def fetch_spots():
    """Fetch parking spots from backend."""
    try:
        r = requests.get(GET_ALL_SPOTS_URL)
        r.raise_for_status()
        return r.json()
    except Exception as e:
        print(f"Error fetching spots from backend: {e}")
        return []

def define_parking_spots_via_gui(image_path, spots):
    """
    GUI tool để admin định nghĩa vị trí ô đỗ bằng cách click 4 góc.
    Chỉ cần chạy 1 lần khi setup.
    """
    # Filter numeric-labeled spots và sort
    numeric_spots = []
    for sp in spots:
        lbl = sp["label"]
        if lbl.isdigit():
            numeric_spots.append(sp)
    numeric_spots.sort(key=lambda s: int(s["label"]))
    
    # Giới hạn số ô cần define (có thể điều chỉnh)
    MAX_SPOTS_TO_DEFINE = min(20, len(numeric_spots))
    numeric_spots = numeric_spots[:MAX_SPOTS_TO_DEFINE]

    img = cv2.imread(image_path)
    if img is None:
        print(f"Cannot open image: {image_path}")
        return

    scaled_img, scale = resize_with_aspect_ratio(img, 1280, 720)
    defined_corners = {}
    current_points = []
    current_index = 0
    done_defining = False

    def on_mouse_click(event, x, y, flags, param):
        nonlocal current_points, current_index, done_defining
        if event == cv2.EVENT_LBUTTONDOWN and current_index < len(numeric_spots):
            current_points.append((x, y))
            print(f"Clicked: ({x},{y}) for spot {numeric_spots[current_index]['label']}")

            if len(current_points) == 4:
                sp = numeric_spots[current_index]
                sp_id = sp["id"]
                
                # Scale về kích thước gốc
                unscaled = [
                    (int(px / scale), int(py / scale))
                    for (px, py) in current_points
                ]
                defined_corners[sp_id] = unscaled
                print(f"✓ Spot {sp['label']} defined with corners: {unscaled}")

                current_points = []
                current_index += 1

                if current_index >= len(numeric_spots):
                    print("All spots defined!")
                    done_defining = True

    cv2.namedWindow("Define Parking Spots")
    cv2.setMouseCallback("Define Parking Spots", on_mouse_click)

    print("=== PARKING SPOT DEFINITION ===")
    print(f"Define up to {len(numeric_spots)} spots by clicking 4 corners each.")
    print("Click 4 corners for each spot in order.")
    print("Press 'q' to finish or 's' to skip current spot.")
    print(f"Currently defining: Spot {numeric_spots[0]['label'] if numeric_spots else 'None'}")

    while not done_defining and current_index < len(numeric_spots):
        temp = scaled_img.copy()
        
        # Hiển thị spots đã define
        for sp_id, corners in defined_corners.items():
            scaled_corners = [(int(x * scale), int(y * scale)) for x, y in corners]
            pts = np.array(scaled_corners, dtype=np.int32)
            cv2.polylines(temp, [pts], True, (0, 255, 0), 2)
            cv2.putText(temp, f"Spot {sp_id}", scaled_corners[0], 
                       cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)

        # Hiển thị current spot being defined
        if current_index < len(numeric_spots):
            current_spot = numeric_spots[current_index]
            cv2.putText(temp, f"Defining: Spot {current_spot['label']} ({len(current_points)}/4 points)", 
                       (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

        # Hiển thị current points
        if current_points:
            pts = np.array(current_points, dtype=np.int32)
            cv2.polylines(temp, [pts], False, (255, 0, 0), 2)
            for i, pt in enumerate(current_points):
                cv2.circle(temp, pt, 5, (255, 0, 0), -1)
                cv2.putText(temp, str(i+1), (pt[0]+10, pt[1]), 
                           cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 0), 1)

        cv2.imshow("Define Parking Spots", temp)
        
        key = cv2.waitKey(30) & 0xFF
        if key == ord('q'):
            print("Exiting definition tool.")
            break
        elif key == ord('s') and current_index < len(numeric_spots):
            print(f"Skipping spot {numeric_spots[current_index]['label']}")
            current_points = []
            current_index += 1

    cv2.destroyAllWindows()

    # Gửi corners đến backend
    if defined_corners:
        to_send = []
        for sp_id, corners in defined_corners.items():
            to_send.append({
                "spotId": sp_id,
                "corners": corners
            })
        try:
            resp = requests.post(DEFINE_CORNERS_URL, json=to_send)
            print(f"✓ Posted corners to backend: {resp.text}")
        except Exception as e:
            print(f"✗ Error posting corners: {e}")
    else:
        print("No corners defined.")

def detect_occupied_spots(frame, model, spots):
    """
    Detect cars in frame and check which parking spots are occupied.
    """
    results = model(frame, conf=CONFIDENCE_THRESHOLD)
    occupant_labels = set()
    detected_cars = []

    for result in results:
        if not result.boxes:
            continue
        for box, cls_i in zip(result.boxes.xyxy, result.boxes.cls):
            cls_name = result.names[int(cls_i)]
            if cls_name == "car":
                x1, y1, x2, y2 = map(int, box)
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2
                detected_cars.append((x1, y1, x2, y2, cx, cy))

                # Kiểm tra từng spot
                for sp in spots:
                    label = sp["label"]
                    coords_str = sp.get("imageCoordinates")
                    if not coords_str:
                        continue
                    
                    try:
                        coords_list = json.loads(coords_str)
                        pts = np.array(coords_list, dtype=np.int32)
                        inside = cv2.pointPolygonTest(pts, (cx, cy), False)
                        if inside >= 0:
                            occupant_labels.add(label)
                            break
                    except:
                        continue

    # Tạo danh sách occupancy - CHỈ cho spots có imageCoordinates
    occupancy_list = []
    for sp in spots:
        # Chỉ process spots có imageCoordinates được định nghĩa
        coords_str = sp.get("imageCoordinates")
        if not coords_str:
            continue
            
        lbl = sp["label"]
        sid = sp["id"]
        is_occ = (lbl in occupant_labels)
        occupancy_list.append({
            "spotId": sid,
            "occupied": is_occ
        })

    return occupancy_list, detected_cars

def send_occupancies(occupancy_list):
    """Send occupancy data to backend."""
    try:
        # Debug log
        occupied_count = len([x for x in occupancy_list if x['occupied']])
        total_count = len(occupancy_list)
        print(f"📡 Sending {total_count} spots data: {occupied_count} occupied, {total_count - occupied_count} free")
        
        resp = requests.post(PYTHON_OCC_URL, json=occupancy_list)
        resp.raise_for_status()
        print(f"✓ Successfully sent occupancy data")
        return True
    except Exception as e:
        print(f"✗ Error sending occupancies: {e}")
        return False

def annotate_frame(frame, spots, occupancy_list, detected_cars):
    """
    Annotate frame with parking spots and detection results.
    """
    annotated = frame.copy()
    
    # Convert occupancy_list to map
    occ_map = {}
    for item in occupancy_list:
        occ_map[item["spotId"]] = item["occupied"]

    # Draw parking spots
    for sp in spots:
        sid = sp["id"]
        lbl = sp["label"]
        coords_str = sp.get("imageCoordinates")
        if not coords_str:
            continue
        
        try:
            coords = json.loads(coords_str)
            pts = np.array(coords, dtype=np.int32)

            is_occ = occ_map.get(sid, False)
            color = (0, 0, 255) if is_occ else (0, 255, 0)  # Red if occupied, Green if free
            text_status = "OCCUPIED" if is_occ else "FREE"

            cv2.polylines(annotated, [pts], True, color, 2)
            
            # Label
            if len(pts) > 0:
                (tx, ty) = pts[0]
                cv2.putText(annotated, f"{lbl}:{text_status}", (tx, ty - 5),
                           cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)
        except:
            continue

    # Draw detected cars
    for x1, y1, x2, y2, cx, cy in detected_cars:
        cv2.rectangle(annotated, (x1, y1), (x2, y2), (255, 255, 0), 2)
        cv2.circle(annotated, (cx, cy), 5, (255, 255, 0), -1)
        cv2.putText(annotated, "CAR", (x1, y1-10), 
                   cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 2)

    # Add timestamp
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    cv2.putText(annotated, f"Time: {timestamp}", (10, 30),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    
    # Add stats
    total_spots = len(spots)
    occupied_count = len([x for x in occupancy_list if x['occupied']])
    cv2.putText(annotated, f"Occupied: {occupied_count}/{total_spots}", (10, 60),
               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)

    return annotated

class VideoProcessor:
    def __init__(self, video_path, model, spots):
        self.video_path = video_path
        self.model = model
        self.spots = spots
        self.cap = None
        self.out = None
        self.last_update_time = 0
        self.frame_count = 0
        self.running = False
        
    def start_processing(self):
        """Start video processing."""
        self.cap = cv2.VideoCapture(self.video_path)
        if not self.cap.isOpened():
            print(f"✗ Cannot open video: {self.video_path}")
            return
            
        # Setup video writer
        fps = int(self.cap.get(cv2.CAP_PROP_FPS))
        width = int(self.cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(self.cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
        fourcc = cv2.VideoWriter_fourcc(*'mp4v')
        self.out = cv2.VideoWriter(OUTPUT_VIDEO_PATH, fourcc, fps, (width, height))
        
        print(f"✓ Processing video: {self.video_path}")
        print(f"✓ Resolution: {width}x{height}, FPS: {fps}")
        print("Press 'q' to quit, 'p' to pause")
        
        self.running = True
        
        while self.running:
            ret, frame = self.cap.read()
            if not ret:
                print("End of video or error reading frame")
                break
                
            self.frame_count += 1
            
            # Process every FRAME_SKIP frames
            if self.frame_count % FRAME_SKIP == 0:
                current_time = time.time()
                
                # Detect occupancy
                occupancy_list, detected_cars = detect_occupied_spots(frame, self.model, self.spots)
                
                # Annotate frame
                annotated_frame = annotate_frame(frame, self.spots, occupancy_list, detected_cars)
                
                # Send updates to backend periodically
                if current_time - self.last_update_time >= UPDATE_INTERVAL:
                    threading.Thread(target=send_occupancies, args=(occupancy_list,), daemon=True).start()
                    self.last_update_time = current_time
                
                # Save current frame
                cv2.imwrite(OUTPUT_FRAME_PATH, annotated_frame)
                
                # Write to output video
                if self.out:
                    self.out.write(annotated_frame)
                
                # Display frame
                display_frame = annotated_frame
                # Resize for display if too large
                if display_frame.shape[1] > 1280:
                    display_frame, _ = resize_with_aspect_ratio(display_frame, 1280, 720)
                
                cv2.imshow('Parking Detection', display_frame)
            
            # Check for key press
            key = cv2.waitKey(1) & 0xFF
            if key == ord('q'):
                print("Stopping video processing...")
                break
            elif key == ord('p'):
                print("Paused. Press any key to continue...")
                cv2.waitKey(0)
        
        self.cleanup()
    
    def cleanup(self):
        """Clean up resources."""
        self.running = False
        if self.cap:
            self.cap.release()
        if self.out:
            self.out.release()
        cv2.destroyAllWindows()
        print("✓ Video processing stopped and resources cleaned up")

##############################################################################
# MAIN FUNCTIONS
##############################################################################

def setup_parking_spots():
    """Setup parking spots by defining their positions."""
    spots = fetch_spots()
    if not spots:
        print("✗ No spots found from backend.")
        return None
    
    print(f"✓ Found {len(spots)} spots from backend")
    
    # Check if spots already have imageCoordinates
    spots_with_coords = [sp for sp in spots if sp.get("imageCoordinates")]
    spots_without_coords = [sp for sp in spots if not sp.get("imageCoordinates")]
    
    print(f"Spots with coordinates: {len(spots_with_coords)}")
    print(f"Spots without coordinates: {len(spots_without_coords)}")
    
    if spots_without_coords:
        print("Some spots need coordinate definition...")
        define_parking_spots_via_gui(REFERENCE_IMAGE_PATH, spots_without_coords)
        # Fetch again to get updated coordinates
        spots = fetch_spots()
    
    return spots

def main():
    """Main function."""
    print("=== PARKING MANAGER VIDEO PROCESSING ===")
    
    # 1. Check if YOLO model exists
    if not os.path.exists(YOLO_MODEL_PATH):
        print(f"✗ YOLO model not found: {YOLO_MODEL_PATH}")
        return
    
    # 2. Load YOLO model
    print("Loading YOLO model...")
    model = YOLO(YOLO_MODEL_PATH)
    print("✓ YOLO model loaded")
    
    # 3. Setup parking spots
    spots = setup_parking_spots()
    if not spots:
        return
    
    # Filter spots that have coordinates
    spots_with_coords = [sp for sp in spots if sp.get("imageCoordinates")]
    print(f"✓ Using {len(spots_with_coords)} spots with defined coordinates")
    
    if not spots_with_coords:
        print("✗ No spots with coordinates found. Please define spot positions first.")
        return
    
    # 4. Check video source
    if not os.path.exists(VIDEO_PATH) and VIDEO_PATH != 0:
        print(f"✗ Video file not found: {VIDEO_PATH}")
        print("Please ensure video file exists or use webcam (VIDEO_PATH = 0)")
        return
    
    # 5. Start video processing
    processor = VideoProcessor(VIDEO_PATH, model, spots_with_coords)
    
    try:
        processor.start_processing()
    except KeyboardInterrupt:
        print("\n⚠ Interrupted by user")
        processor.cleanup()
    except Exception as e:
        print(f"✗ Error during processing: {e}")
        processor.cleanup()

if __name__ == "__main__":
    main()
