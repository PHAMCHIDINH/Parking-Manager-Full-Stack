import cv2
import numpy as np
import os
from ultralytics import YOLO

# Đường dẫn file
YOLO_MODEL_PATH = 'z.pt'
IMAGE_PATH = 'aerial2.jpg'
OUTPUT_IMAGE_PATH = 'test_detection_result.jpg'
CONFIDENCE_THRESHOLD = 0.1

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

def test_yolo_detection():
    """
    Test YOLO detection trên ảnh aerial2.jpg
    """
    print("=== KIỂM TRA YOLO DETECTION ===")
    
    # 1. Kiểm tra file tồn tại
    if not os.path.exists(YOLO_MODEL_PATH):
        print(f"❌ Không tìm thấy YOLO model: {YOLO_MODEL_PATH}")
        return
    
    if not os.path.exists(IMAGE_PATH):
        print(f"❌ Không tìm thấy ảnh: {IMAGE_PATH}")
        return
    
    print(f"✅ Tìm thấy YOLO model: {YOLO_MODEL_PATH}")
    print(f"✅ Tìm thấy ảnh: {IMAGE_PATH}")
    
    # 2. Load YOLO model
    print("🔄 Đang load YOLO model...")
    model = YOLO(YOLO_MODEL_PATH)
    print("✅ YOLO model đã được load thành công!")
    
    # 3. Load và resize ảnh
    print("🔄 Đang load ảnh...")
    orig_img = cv2.imread(IMAGE_PATH)
    if orig_img is None:
        print(f"❌ Không thể load ảnh: {IMAGE_PATH}")
        return
    
    resized_img, scale = resize_with_aspect_ratio(orig_img, 1280, 720)
    print(f"✅ Ảnh đã được resize: {resized_img.shape}")
    
    # 4. Chạy YOLO detection
    print("🔄 Đang chạy YOLO detection...")
    results = model(resized_img, conf=CONFIDENCE_THRESHOLD)
    
    # 5. Vẽ kết quả lên ảnh
    detected_cars = 0
    annotated_img = resized_img.copy()
    
    for result in results:
        if result.boxes is not None:
            for box, cls_i in zip(result.boxes.xyxy, result.boxes.cls):
                cls_name = result.names[int(cls_i)]
                confidence = result.boxes.conf[0] if result.boxes.conf is not None else 0
                
                # Chỉ hiển thị xe hơi
                if cls_name == "car":
                    detected_cars += 1
                    x1, y1, x2, y2 = map(int, box)
                    
                    # Vẽ bounding box
                    cv2.rectangle(annotated_img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    
                    # Vẽ label
                    label = f"{cls_name}: {confidence:.2f}"
                    cv2.putText(annotated_img, label, (x1, y1-10), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 2)
    
    print(f"✅ Phát hiện được {detected_cars} xe hơi!")
    
    # 6. Lưu kết quả
    cv2.imwrite(OUTPUT_IMAGE_PATH, annotated_img)
    print(f"✅ Kết quả đã được lưu vào: {OUTPUT_IMAGE_PATH}")
    
    # 7. Hiển thị kết quả (tùy chọn)
    print("\n📋 Tóm tắt:")
    print(f"   - Số xe phát hiện: {detected_cars}")
    print(f"   - Confidence threshold: {CONFIDENCE_THRESHOLD}")
    print(f"   - Kích thước ảnh sau resize: {resized_img.shape}")
    print(f"   - File kết quả: {OUTPUT_IMAGE_PATH}")

if __name__ == "__main__":
    test_yolo_detection()
