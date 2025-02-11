import cv2
import numpy as np
import os
import json
import time
import schedule
import requests
from ultralytics import YOLO

##############################################################################
# CONFIG
##############################################################################

BASE_URL = "http://localhost:8080"

# Endpoint to fetch spots (IDs & labels)
GET_ALL_SPOTS_URL = f"{BASE_URL}/api/parking"

# Endpoint to store corners
DEFINE_CORNERS_URL = f"{BASE_URL}/api/parking/define-corners"

# Endpoint to send occupancy
PYTHON_OCC_URL = f"{BASE_URL}/api/parking/python-occupancies"

# YOLO model + local image
YOLO_MODEL_PATH = 'z.pt'
IMAGE_PATH = 'aerial2.jpg'
OUTPUT_IMAGE_PATH = 'detection_result.jpg'

CONFIDENCE_THRESHOLD = 0.1
NUM_SPOTS_TO_DEFINE = 69  # max number of numeric-labeled spots to define via GUI

##############################################################################
# HELPER FUNCTIONS
##############################################################################

def resize_with_aspect_ratio(image, max_width=1280, max_height=720):
    """
    Resizes 'image' so that neither width nor height exceed the given maxima,
    preserving aspect ratio. Returns (resized_image, scale_factor).
    """
    h, w = image.shape[:2]
    scale = min(max_width / w, max_height / h)
    new_w = int(w * scale)
    new_h = int(h * scale)
    resized = cv2.resize(image, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale


def fetch_spots():
    """
    GET /api/parking => returns JSON array of ParkingSpot objects:
      [
        {
          "id": 1,
          "label": "1",
          "status": "AVAILABLE",
          "occupied": false,
          "imageCoordinates": "...",
          ...
        },
        ...
      ]
    """
    try:
        r = requests.get(GET_ALL_SPOTS_URL)
        r.raise_for_status()
        return r.json()  # list of dict
    except Exception as e:
        print("Error fetching spots from backend:", e)
        return []


def define_parking_spots_via_gui(image_path, spots):
    """
    Let user define corners for up to `NUM_SPOTS_TO_DEFINE` numeric-labeled spots
    in ascending numeric order. Once we finish or reach the limit, we auto-close
    the GUI window, effectively simulating 'q'. Then we POST the definitions
    to /api/parking/define-corners in one batch.
    """
    # Filter numeric-labeled spots + sort ascending
    numeric_spots = []
    for sp in spots:
        lbl = sp["label"]
        if lbl.isdigit():
            numeric_spots.append(sp)
    numeric_spots.sort(key=lambda s: int(s["label"]))

    # If you only want to define up to N spots:
    numeric_spots = numeric_spots[:NUM_SPOTS_TO_DEFINE]

    img = cv2.imread(image_path)
    if img is None:
        print("Cannot open image:", image_path)
        return

    scaled_img, scale = resize_with_aspect_ratio(img, 1280, 720)

    defined_corners = {}  # map <spotId> -> list of (x,y) corners
    current_points = []
    current_index = 0  # which numeric spot we are labeling
    done_defining = False

    def on_mouse_click(event, x, y, flags, param):
        nonlocal current_points, current_index, done_defining
        if event == cv2.EVENT_LBUTTONDOWN:
            current_points.append((x, y))
            print(f"Clicked: ({x},{y})")

            if len(current_points) == 4:
                # store corners for the current spot
                sp = numeric_spots[current_index]
                sp_id = sp["id"]

                # scale back to original
                unscaled = [
                    (int(px / scale), int(py / scale))
                    for (px, py) in current_points
                ]
                defined_corners[sp_id] = unscaled
                print(f"Spot label={sp['label']} => corners={unscaled}")

                current_points = []
                current_index += 1

                # If we've labeled all N numeric spots or reached the limit:
                if current_index >= len(numeric_spots):
                    print("All spots defined or limit reached.")
                    done_defining = True
                    cv2.destroyAllWindows()

    cv2.namedWindow("Define Spots")
    cv2.setMouseCallback("Define Spots", on_mouse_click)

    print("=== Instructions ===")
    print(f"Define up to {len(numeric_spots)} numeric-labeled spots by clicking 4 corners each.")
    print("Left-click 4 times => define corners for the *current* spot => automatically moves to next.")
    print("Press 'q' to finish early.\n")

    while True:
        if done_defining:
            break

        if current_index >= len(numeric_spots):
            break

        temp = scaled_img.copy()

        # show the in-progress polygon
        if current_points:
            pts = np.array(current_points, dtype=np.int32)
            cv2.polylines(temp, [pts], isClosed=False, color=(255, 0, 0), thickness=2)
            for pt in current_points:
                cv2.circle(temp, pt, 5, (255, 0, 0), -1)

        cv2.imshow("Define Spots", temp)
        key = cv2.waitKey(50)
        if key == ord('q'):
            print("Exiting define-corners GUI due to 'q' key.")
            break

    cv2.destroyAllWindows()

    # Now send corners to backend
    if defined_corners:
        to_send = []
        for sp_id, corners in defined_corners.items():
            # corners => [(x1,y1),(x2,y2),(x3,y3),(x4,y4)]
            to_send.append({
                "spotId": sp_id,
                "corners": corners
            })
        try:
            resp = requests.post(DEFINE_CORNERS_URL, json=to_send)
            print("POST define-corners =>", resp.text)
        except Exception as e:
            print("Error posting corners:", e)
    else:
        print("No corners defined (or user exited immediately).")


def detect_occupied_spots(resized_img, model, spots):
    """
    Uses YOLO to detect 'car' => checks center point in each spot's 'imageCoordinates' polygon.
    Returns a list of {spotId, occupied}.
    """
    results = model(resized_img, conf=CONFIDENCE_THRESHOLD)
    occupant_labels = set()

    for result in results:
        if not result.boxes:
            continue
        for box, cls_i in zip(result.boxes.xyxy, result.boxes.cls):
            cls_name = result.names[int(cls_i)]
            if cls_name == "car":
                x1, y1, x2, y2 = map(int, box)
                cx = (x1 + x2) // 2
                cy = (y1 + y2) // 2

                # check each spot's corners
                for sp in spots:
                    label = sp["label"]
                    coords_str = sp.get("imageCoordinates")
                    if not coords_str:
                        continue  # skip spots that don't have corners
                    coords_list = json.loads(coords_str)
                    pts = np.array(coords_list, dtype=np.int32)
                    inside = cv2.pointPolygonTest(pts, (cx, cy), False)
                    if inside >= 0:
                        occupant_labels.add(label)
                        break

    # occupant_labels might have e.g. {"1","2","10"}
    # build a list of {spotId, occupied}
    occupancy_list = []
    for sp in spots:
        lbl = sp["label"]
        sid = sp["id"]
        is_occ = (lbl in occupant_labels)
        occupancy_list.append({
            "spotId": sid,
            "occupied": is_occ
        })

    return occupancy_list


def send_occupancies(occupancy_list):
    """
    POST list of {spotId, occupied} => /api/parking/python-occupancies
    """
    try:
        resp = requests.post(PYTHON_OCC_URL, json=occupancy_list)
        print("Occupancies =>", resp.text)
    except Exception as e:
        print("Error sending occupancies:", e)


def annotate_and_save(resized_img, spots, occupancy_list, out_path):
    """
    Optionally draw polygons for each spot in 'spots' using imageCoordinates,
    and color them red (occupied) or green (free), then save.
    """
    # Convert occupancy_list => map of spotId -> bool
    occ_map = {}
    for item in occupancy_list:
        occ_map[item["spotId"]] = item["occupied"]

    for sp in spots:
        sid = sp["id"]
        lbl = sp["label"]
        coords_str = sp.get("imageCoordinates")
        if not coords_str:
            continue
        coords = json.loads(coords_str)
        pts = np.array(coords, dtype=np.int32)

        is_occ = occ_map.get(sid, False)
        color = (0, 255, 0)
        text_status = "Free"
        if is_occ:
            color = (0, 0, 255)
            text_status = "Occupied"

        cv2.polylines(resized_img, [pts], True, color, 2)
        (tx, ty) = pts[0]
        cv2.putText(resized_img, f"{lbl}:{text_status}", (tx, ty - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 2)

    cv2.imwrite(out_path, resized_img)
    print(f"Saved annotated => {out_path}")


##############################################################################
# MAIN FLOW
##############################################################################

def run_detection_cycle(model):
    print("=== DETECTION CYCLE START ===")
    # 1) Fetch all spots from backend
    spots = fetch_spots()
    if not spots:
        print("No spots found from backend.")
        return

    # 2) Load + resize aerial image
    orig = cv2.imread(IMAGE_PATH)
    if orig is None:
        print("Cannot load image:", IMAGE_PATH)
        return
    resized, scale = resize_with_aspect_ratio(orig, 1280, 720)

    # 3) YOLO => occupancy
    occupancy_list = detect_occupied_spots(resized, model, spots)

    # 4) POST occupancy to backend
    send_occupancies(occupancy_list)

    # 5) annotate + save
    annotate_and_save(resized, spots, occupancy_list, OUTPUT_IMAGE_PATH)
    print("=== DETECTION CYCLE DONE ===\n")


def main():
    # 1) First, fetch spots to ensure we have them
    spots = fetch_spots()
    if not spots:
        print("No spots in backend. Possibly none loaded from GeoJSON. Exiting.")
        return

    # 2) Let user define corners in a GUI
    define_parking_spots_via_gui(IMAGE_PATH, spots)

    # 3) Load YOLO
    if not os.path.exists(YOLO_MODEL_PATH):
        print("YOLO model not found =>", YOLO_MODEL_PATH)
        return
    model = YOLO(YOLO_MODEL_PATH)

    # 4) Schedule repeated detection
    def detection_job():
        run_detection_cycle(model)

    schedule.every(1).minutes.do(detection_job)
    # Run once immediately:
    detection_job()

    print("Press Ctrl+C to exit detection loop.")
    try:
        while True:
            schedule.run_pending()
            time.sleep(1)
    except KeyboardInterrupt:
        print("Exiting.")


if __name__ == "__main__":
    main()
