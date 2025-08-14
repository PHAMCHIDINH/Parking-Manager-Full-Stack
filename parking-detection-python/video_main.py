import cv2
import numpy as np
import os
import json
import time
import threading
import requests
from ultralytics import YOLO
from datetime import datetime
from typing import Dict, List, Tuple, Optional
try:
    import torch
except Exception:  # torch may not be installed in some environments
    torch = None

##############################################################################
# CONFIG - Video Processing
##############################################################################

BASE_URL = "http://localhost:8080"
GET_ALL_SPOTS_URL = f"{BASE_URL}/api/parking"
DEFINE_CORNERS_URL = f"{BASE_URL}/api/parking/define-corners"
PYTHON_OCC_URL = f"{BASE_URL}/api/parking/python-occupancies"

"""
Performance notes:
- Replaces per-frame point-in-polygon with a precomputed label map (O(1) lookup per detection).
- Reuses a single HTTP session for lower latency.
- Optionally uses GPU + FP16 if available.
- Filters YOLO classes to only vehicles of interest to speed up inference.
- Skips resending occupancy if no change since last send.
"""

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
IMG_SIZE = 640  # YOLO inference size (smaller is faster, 640 is a good default)
UPDATE_INTERVAL = 2.0  # Gửi update mỗi 2 giây
FRAME_SKIP = 2  # Giảm để cập nhật nhanh hơn
MIN_CHANGE_SEND_INTERVAL = 0.3  # Gửi ngay khi có thay đổi (cooldown tối thiểu)
DISPLAY_WINDOW = True  # Set False for headless mode
WRITE_FRAME_JPEG_QUALITY = 80  # Reduce disk I/O size

# Classes of interest (will auto-map to model.names if available)
CLASSES_OF_INTEREST = {
    'car', 'truck', 'bus', 'van', 'suv', 'motorbike', 'motorcycle'
}

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

def _parse_spot_coords(spots: List[dict]) -> List[Tuple[int, str, np.ndarray]]:
    """Pre-parse JSON coordinates into numpy arrays.
    Returns list of tuples: (spotId, label, pts[N,2] int32)
    Only includes spots that have defined coordinates.
    """
    parsed = []
    for sp in spots:
        coords_str = sp.get("imageCoordinates")
        if not coords_str:
            continue
        try:
            coords = json.loads(coords_str)
            pts = np.array(coords, dtype=np.int32)
            if pts.ndim == 2 and pts.shape[1] == 2 and len(pts) >= 3:
                parsed.append((sp["id"], sp["label"], pts))
        except Exception:
            continue
    return parsed

def _build_spot_label_map(frame_h: int, frame_w: int,
                          parsed_spots: List[Tuple[int, str, np.ndarray]]):
    """Create a label map image where each pixel stores the index of the spot it belongs to.
    Returns:
      label_map: HxW int32 image, 0 for background, i+1 for spot index i
      idx_to_spot: list of dicts {id, label, pts}
      id_to_idx: dict spotId -> index
    """
    label_map = np.zeros((frame_h, frame_w), dtype=np.int32)
    idx_to_spot = []
    id_to_idx: Dict[int, int] = {}

    for i, (sid, lbl, pts) in enumerate(parsed_spots):
        # Clip points inside frame bounds to avoid OpenCV errors
        pts_clipped = pts.copy()
        pts_clipped[:, 0] = np.clip(pts_clipped[:, 0], 0, frame_w - 1)
        pts_clipped[:, 1] = np.clip(pts_clipped[:, 1], 0, frame_h - 1)
        cv2.fillPoly(label_map, [pts_clipped.astype(np.int32)], color=i + 1)
        idx_to_spot.append({"id": sid, "label": lbl, "pts": pts_clipped})
        id_to_idx[sid] = i

    return label_map, idx_to_spot, id_to_idx

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

def _get_allowed_class_ids(model) -> Optional[List[int]]:
    """Map CLASSES_OF_INTEREST names to model class ids, if available."""
    try:
        names_dict = model.model.names if hasattr(model, 'model') else model.names
    except Exception:
        names_dict = getattr(model, 'names', None)
    if not isinstance(names_dict, (list, dict)):
        return None
    if isinstance(names_dict, list):
        ids = [i for i, n in enumerate(names_dict) if str(n).lower() in CLASSES_OF_INTEREST]
    else:
        ids = [i for i, n in names_dict.items() if str(n).lower() in CLASSES_OF_INTEREST]
    return ids if ids else None

def detect_occupied_spots(
    frame,
    model,
    spots,
    label_map: Optional[np.ndarray] = None,
    idx_to_spot: Optional[List[dict]] = None,
    allowed_cls: Optional[List[int]] = None,
    use_half: bool = False
):
    """Detect cars and compute occupied spots.
    If label_map and idx_to_spot are provided, performs O(1) spot lookup per detection.
    Returns (occupancy_list, detected_cars)
    """
    try:
        results = model(frame, conf=CONFIDENCE_THRESHOLD, imgsz=IMG_SIZE,
                        classes=allowed_cls, half=use_half)
    except TypeError:
        # 'half' may not be supported by some versions
        results = model(frame, conf=CONFIDENCE_THRESHOLD, imgsz=IMG_SIZE,
                        classes=allowed_cls)

    detected_cars = []

    # Boolean occupied per index
    occ_flags: Optional[np.ndarray] = None
    if label_map is not None and idx_to_spot is not None:
        occ_flags = np.zeros(len(idx_to_spot), dtype=bool)

    for result in results:
        if not hasattr(result, 'boxes') or result.boxes is None:
            continue
        # xyxy tensor -> numpy
        for box, cls_i in zip(result.boxes.xyxy, result.boxes.cls):
            x1, y1, x2, y2 = map(int, box)
            cx = max(0, min((x1 + x2) // 2, frame.shape[1] - 1))
            cy = max(0, min((y1 + y2) // 2, frame.shape[0] - 1))
            detected_cars.append((x1, y1, x2, y2, cx, cy))

            if occ_flags is not None:
                idx = int(label_map[cy, cx]) - 1  # label_map stores i+1
                if idx >= 0:
                    occ_flags[idx] = True

    occupancy_list = []
    if occ_flags is not None:
        for i, occ in enumerate(occ_flags):
            occupancy_list.append({
                "spotId": idx_to_spot[i]["id"],
                "occupied": bool(occ)
            })
    else:
        # Fallback to original, slower polygon test if label_map not provided
        occupant_labels = set()
        for _, _, _, _, cx, cy in detected_cars:
            for sp in spots:
                coords_str = sp.get("imageCoordinates")
                if not coords_str:
                    continue
                try:
                    pts = np.array(json.loads(coords_str), dtype=np.int32)
                    inside = cv2.pointPolygonTest(pts, (cx, cy), False)
                    if inside >= 0:
                        occupant_labels.add(sp["label"])
                        break
                except Exception:
                    continue
        for sp in spots:
            coords_str = sp.get("imageCoordinates")
            if not coords_str:
                continue
            occupancy_list.append({
                "spotId": sp["id"],
                "occupied": sp["label"] in occupant_labels
            })

    return occupancy_list, detected_cars

_http_session: Optional[requests.Session] = None

def _get_http_session() -> requests.Session:
    global _http_session
    if _http_session is None:
        _http_session = requests.Session()
    return _http_session

def send_occupancies(occupancy_list):
    """Send occupancy data to backend."""
    try:
        occupied_count = len([x for x in occupancy_list if x['occupied']])
        total_count = len(occupancy_list)
        print(f"📡 Sending {total_count} spots data: {occupied_count} occupied, {total_count - occupied_count} free")
        sess = _get_http_session()
        resp = sess.post(PYTHON_OCC_URL, json=occupancy_list, timeout=5)
        resp.raise_for_status()
        print("✓ Successfully sent occupancy data")
        return True
    except Exception as e:
        print(f"✗ Error sending occupancies: {e}")
        return False

def annotate_frame(frame, idx_to_spot: List[dict], occupancy_list, detected_cars):
    """
    Annotate frame with parking spots and detection results.
    """
    annotated = frame.copy()
    
    # Convert occupancy_list to map
    occ_map = {item["spotId"]: item["occupied"] for item in occupancy_list}

    # Draw parking spots
    for info in idx_to_spot:
        sid = info["id"]
        lbl = info["label"]
        pts = info["pts"].astype(np.int32)

        is_occ = occ_map.get(sid, False)
        color = (0, 0, 255) if is_occ else (0, 255, 0)  # Red if occupied, Green if free
        text_status = "OCCUPIED" if is_occ else "FREE"

        cv2.polylines(annotated, [pts], True, color, 2)
        if len(pts) > 0:
            (tx, ty) = pts[0]
            cv2.putText(annotated, f"{lbl}:{text_status}", (tx, ty - 5),
                       cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

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
    total_spots = len(idx_to_spot)
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
        self.label_map = None
        self.idx_to_spot = None
        self.id_to_idx = None
        self.allowed_cls = None
        self.use_half = False
        self._last_payload_fingerprint = None

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

        # Build spot label map once for O(1) occupancy lookup
        parsed_spots = _parse_spot_coords(self.spots)
        self.label_map, self.idx_to_spot, self.id_to_idx = _build_spot_label_map(height, width, parsed_spots)

        # Determine allowed classes
        self.allowed_cls = _get_allowed_class_ids(self.model)

        # Try to use GPU + FP16 if available
        try:
            if torch is not None and torch.cuda.is_available():
                self.model.to('cuda')
                self.use_half = True  # use FP16 on GPU for speed
        except Exception:
            self.use_half = False

        # Warmup (especially for GPU)
        try:
            _ = self.model(np.zeros((IMG_SIZE, IMG_SIZE, 3), dtype=np.uint8), imgsz=IMG_SIZE)
        except Exception:
            pass
        
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
                occupancy_list, detected_cars = detect_occupied_spots(
                    frame, self.model, self.spots,
                    label_map=self.label_map,
                    idx_to_spot=self.idx_to_spot,
                    allowed_cls=self.allowed_cls,
                    use_half=self.use_half,
                )
                
                # Annotate frame
                annotated_frame = annotate_frame(frame, self.idx_to_spot, occupancy_list, detected_cars)
                
                # Send updates: immediately on change (with a small cooldown),
                # otherwise at a slower periodic interval as a fallback
                payload_fingerprint = hash(tuple(x['occupied'] for x in occupancy_list))
                changed = payload_fingerprint != self._last_payload_fingerprint
                if changed and (current_time - self.last_update_time >= MIN_CHANGE_SEND_INTERVAL):
                    threading.Thread(target=send_occupancies, args=(occupancy_list,), daemon=True).start()
                    self._last_payload_fingerprint = payload_fingerprint
                    self.last_update_time = current_time
                elif current_time - self.last_update_time >= UPDATE_INTERVAL:
                    threading.Thread(target=send_occupancies, args=(occupancy_list,), daemon=True).start()
                    self._last_payload_fingerprint = payload_fingerprint
                    self.last_update_time = current_time
                
                # Save current frame
                try:
                    cv2.imwrite(OUTPUT_FRAME_PATH, annotated_frame, [int(cv2.IMWRITE_JPEG_QUALITY), WRITE_FRAME_JPEG_QUALITY])
                except Exception:
                    pass
                
                # Write to output video
                if self.out:
                    self.out.write(annotated_frame)
                
                # Display frame
                if DISPLAY_WINDOW:
                    display_frame = annotated_frame
                    # Resize for display if too large
                    if display_frame.shape[1] > 1280:
                        display_frame, _ = resize_with_aspect_ratio(display_frame, 1280, 720)
                    cv2.imshow('Parking Detection', display_frame)
            
            # Check for key press
            key = cv2.waitKey(1) & 0xFF if DISPLAY_WINDOW else 255
            if key == ord('q'):
                print("Stopping video processing...")
                break
            elif key == ord('p') and DISPLAY_WINDOW:
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
