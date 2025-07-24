import cv2
import numpy as np
import os
from ultralytics import YOLO
import time

# Đường dẫn file
YOLO_MODEL_PATH = 'z.pt'
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

def detect_cars_from_camera():
    """
    Phát hiện xe hơi từ camera thời gian thực
    """
    print("=== PHÁT HIỆN XE HƠI TỪ CAMERA ===")
    
    # 1. Kiểm tra YOLO model
    if not os.path.exists(YOLO_MODEL_PATH):
        print(f"❌ Không tìm thấy YOLO model: {YOLO_MODEL_PATH}")
        return
    
    print(f"✅ Tìm thấy YOLO model: {YOLO_MODEL_PATH}")
    
    # 2. Load YOLO model
    print("🔄 Đang load YOLO model...")
    model = YOLO(YOLO_MODEL_PATH)
    print("✅ YOLO model đã được load thành công!")
    
    # 3. Khởi tạo camera
    print("🔄 Đang kết nối camera...")
    cap = cv2.VideoCapture(0)  # 0 là camera mặc định
    
    if not cap.isOpened():
        print("❌ Không thể mở camera!")
        print("💡 Hướng dẫn khắc phục:")
        print("   - Kiểm tra camera có được kết nối không")
        print("   - Thử thay đổi camera index (0, 1, 2...)")
        print("   - Đảm bảo không có ứng dụng nào khác đang sử dụng camera")
        return
    
    # Cài đặt độ phân giải camera
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    # Lấy thông tin camera thực tế
    actual_width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    actual_height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps = cap.get(cv2.CAP_PROP_FPS)
    
    print(f"✅ Camera đã kết nối thành công!")
    print(f"   - Độ phân giải: {actual_width}x{actual_height}")
    print(f"   - FPS: {fps}")
    print("\n🎮 Điều khiển:")
    print("   - Nhấn 'q' để thoát")
    print("   - Nhấn 's' để chụp ảnh")
    print("   - Nhấn 'p' để tạm dừng/tiếp tục")
    
    paused = False
    frame_count = 0
    start_time = time.time()
    
    try:
        while True:
            if not paused:
                ret, frame = cap.read()
                if not ret:
                    print("❌ Không thể đọc frame từ camera")
                    break
                
                frame_count += 1
                
                # 4. Resize frame để tăng tốc độ xử lý
                resized_frame, scale = resize_with_aspect_ratio(frame, 1280, 720)
                
                # 5. Chạy YOLO detection
                results = model(resized_frame, conf=CONFIDENCE_THRESHOLD, verbose=False)
                
                # 6. Vẽ kết quả lên frame
                detected_cars = 0
                detected_objects = {}
                annotated_frame = resized_frame.copy()
                
                for result in results:
                    if result.boxes is not None:
                        for i, (box, cls_i, conf) in enumerate(zip(result.boxes.xyxy, result.boxes.cls, result.boxes.conf)):
                            cls_name = result.names[int(cls_i)]
                            confidence = float(conf)
                            
                            # Đếm tất cả các đối tượng
                            if cls_name not in detected_objects:
                                detected_objects[cls_name] = 0
                            detected_objects[cls_name] += 1
                            
                            x1, y1, x2, y2 = map(int, box)
                            
                            # Chọn màu dựa trên loại xe
                            if cls_name == "car":
                                color = (0, 255, 0)  # Xanh lá cho xe hơi
                                detected_cars += 1
                            elif cls_name == "truck":
                                color = (255, 0, 0)  # Xanh dương cho xe tải
                            elif cls_name == "bus":
                                color = (0, 0, 255)  # Đỏ cho xe buýt
                            elif cls_name == "motorcycle":
                                color = (255, 255, 0)  # Vàng cho xe máy
                            else:
                                color = (128, 128, 128)  # Xám cho các đối tượng khác
                            
                            # Vẽ bounding box
                            cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                            
                            # Vẽ label với confidence
                            label = f"{cls_name}: {confidence:.2f}"
                            label_size = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.5, 2)[0]
                            
                            # Vẽ nền cho text
                            cv2.rectangle(annotated_frame, (x1, y1-label_size[1]-10), 
                                        (x1+label_size[0], y1), color, -1)
                            
                            # Vẽ text
                            cv2.putText(annotated_frame, label, (x1, y1-5), 
                                      cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2)
                
                # 7. Vẽ thông tin thống kê
                current_time = time.time()
                elapsed_time = current_time - start_time
                current_fps = frame_count / elapsed_time if elapsed_time > 0 else 0
                
                # Tạo thông tin hiển thị
                info_lines = [
                    f"FPS: {current_fps:.1f}",
                    f"Frame: {frame_count}",
                    f"Cars: {detected_cars}"
                ]
                
                # Thêm thông tin về các đối tượng khác
                for obj_name, count in detected_objects.items():
                    if obj_name != "car":
                        info_lines.append(f"{obj_name.title()}: {count}")
                
                # Vẽ background cho thông tin
                info_height = len(info_lines) * 25 + 10
                cv2.rectangle(annotated_frame, (10, 10), (200, 10 + info_height), (0, 0, 0), -1)
                
                # Vẽ thông tin
                for i, line in enumerate(info_lines):
                    y_pos = 30 + i * 25
                    cv2.putText(annotated_frame, line, (15, y_pos), 
                              cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
                
                # 8. Hiển thị frame
                cv2.imshow('YOLO Car Detection - Camera', annotated_frame)
            
            # 9. Xử lý phím nhấn
            key = cv2.waitKey(1) & 0xFF
            
            if key == ord('q'):
                print("🔴 Đang thoát...")
                break
            elif key == ord('s'):
                # Chụp ảnh
                timestamp = int(time.time())
                filename = f"camera_capture_{timestamp}.jpg"
                if not paused:
                    cv2.imwrite(filename, annotated_frame)
                    print(f"📸 Đã chụp ảnh: {filename}")
                else:
                    print("⚠️ Không thể chụp ảnh khi đang tạm dừng")
            elif key == ord('p'):
                # Tạm dừng/tiếp tục
                paused = not paused
                if paused:
                    print("⏸️ Đã tạm dừng")
                else:
                    print("▶️ Tiếp tục")
    
    except KeyboardInterrupt:
        print("\n🔴 Đã dừng bởi người dùng (Ctrl+C)")
    
    finally:
        # 10. Dọn dẹp
        cap.release()
        cv2.destroyAllWindows()
        
        # In thống kê cuối
        total_time = time.time() - start_time
        avg_fps = frame_count / total_time if total_time > 0 else 0
        
        print(f"\n📊 Thống kê:")
        print(f"   - Tổng số frame: {frame_count}")
        print(f"   - Thời gian chạy: {total_time:.1f}s")
        print(f"   - FPS trung bình: {avg_fps:.1f}")
        print("✅ Đã đóng camera và thoát chương trình")

def test_camera_availability():
    """
    Kiểm tra camera có sẵn không
    """
    print("🔍 Đang kiểm tra camera có sẵn...")
    
    for i in range(5):  # Kiểm tra camera index từ 0 đến 4
        cap = cv2.VideoCapture(i)
        if cap.isOpened():
            ret, frame = cap.read()
            if ret:
                height, width = frame.shape[:2]
                print(f"✅ Camera {i}: {width}x{height}")
            else:
                print(f"❌ Camera {i}: Không thể đọc frame")
            cap.release()
        else:
            print(f"❌ Camera {i}: Không thể mở")
    
    print("\n💡 Nếu không có camera nào hoạt động:")
    print("   1. Kiểm tra camera đã được kết nối")
    print("   2. Kiểm tra driver camera")
    print("   3. Đảm bảo không có app nào khác đang dùng camera")
    print("   4. Thử khởi động lại máy tính")

if __name__ == "__main__":
    print("🚗 CHƯƠNG TRÌNH PHÁT HIỆN XE HƠI TỪ CAMERA 🚗")
    print("\nChọn chế độ:")
    print("1. Chạy detection từ camera")
    print("2. Kiểm tra camera có sẵn")
    
    choice = input("\nNhập lựa chọn (1/2): ").strip()
    
    if choice == "1":
        detect_cars_from_camera()
    elif choice == "2":
        test_camera_availability()
    else:
        print("❌ Lựa chọn không hợp lệ!")
        print("Chạy chế độ mặc định...")
        detect_cars_from_camera()
