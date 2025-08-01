# 🎬 Video Processing Setup Guide

## 📹 Chuẩn bị Video

### 1. Chuẩn bị file video:
- Đặt video của bãi đỗ xe vào thư mục: `parking-detection-python/`
- Đổi tên thành: `parking_video.mp4`
- Hoặc sửa đường dẫn trong file `video_main.py` dòng `VIDEO_PATH`

### 2. Hoặc sử dụng webcam:
```python
# Trong file video_main.py, sửa dòng:
VIDEO_PATH = 0  # Sử dụng webcam mặc định
```

## 🎯 Workflow Sử Dụng

### Bước 1: Định nghĩa vị trí ô đỗ (Chỉ làm 1 lần)
1. Chạy script: `python video_main.py`
2. Nếu chưa có coordinates, GUI sẽ hiện ra
3. Click 4 góc của mỗi ô đỗ trên ảnh reference
4. Nhấn 'q' để hoàn thành hoặc 's' để bỏ qua ô hiện tại

### Bước 2: Xử lý video real-time
1. Sau khi định nghĩa xong, video sẽ tự động bắt đầu
2. Hệ thống sẽ:
   - Phát hiện xe trong từng frame
   - Kiểm tra xe nằm trong ô nào
   - Gửi cập nhật lên backend mỗi 2 giây
   - Hiển thị video với ô đỗ được đánh dấu màu

### Bước 3: Xem kết quả trên web
1. Mở trình duyệt: `http://localhost:5173`
2. Trang web sẽ hiển thị:
   - Bản đồ 2D với màu sắc real-time
   - Trạng thái ô đỗ cập nhật liên tục
   - WebSocket updates từ video processing

## 🎮 Điều khiển

### Khi định nghĩa ô đỗ:
- **Click chuột**: Chọn góc của ô đỗ (4 clicks/ô)
- **Q**: Thoát và lưu
- **S**: Bỏ qua ô hiện tại

### Khi xử lý video:
- **Q**: Dừng video processing
- **P**: Tạm dừng video
- **Space**: Tiếp tục (sau khi pause)

## 📊 Thông tin hiển thị

### Video window sẽ hiển thị:
- ✅ **Ô xanh**: Trống
- ❌ **Ô đỏ**: Có xe
- 🚗 **Hộp vàng**: Xe được phát hiện
- 📍 **Điểm vàng**: Center point của xe
- ⏰ **Timestamp**: Thời gian real-time
- 📈 **Stats**: Số ô đã đỗ/tổng số ô

### Web interface hiển thị:
- 🗺️ **2D Map**: Bản đồ bãi đỗ xe
- 🔴 **Màu đỏ**: Ô đã đỗ
- 🟢 **Màu xanh**: Ô trống
- 🟠 **Màu cam**: Ô đã được đặt chỗ

## ⚙️ Cấu hình

### Trong file `video_main.py`:
```python
VIDEO_PATH = 'parking_video.mp4'    # Đường dẫn video
CONFIDENCE_THRESHOLD = 0.1           # Ngưỡng phát hiện
UPDATE_INTERVAL = 2.0                # Gửi update mỗi 2 giây
FRAME_SKIP = 3                       # Xử lý mỗi 3 frames
```

### Performance tuning:
- **FRAME_SKIP**: Tăng để giảm CPU usage
- **UPDATE_INTERVAL**: Giảm để cập nhật nhanh hơn
- **CONFIDENCE_THRESHOLD**: Điều chỉnh độ nhạy phát hiện

## 🔧 Troubleshooting

### Video không mở được:
```bash
# Kiểm tra codec video
ffmpeg -i your_video.mp4
# Convert nếu cần:
ffmpeg -i input.avi -c:v libx264 -c:a aac output.mp4
```

### Độ chính xác thấp:
1. Kiểm tra lighting trong video
2. Điều chỉnh `CONFIDENCE_THRESHOLD`
3. Re-define parking spots nếu cần
4. Sử dụng video có resolution cao hơn

### WebSocket không kết nối:
1. Kiểm tra backend đang chạy (port 8080)
2. Kiểm tra frontend đang chạy (port 5173)
3. Kiểm tra firewall/antivirus

## 📝 Files được tạo ra:

- `detection_output.mp4`: Video đã được annotate
- `current_frame.jpg`: Frame hiện tại với annotations
- Console logs với thông tin real-time

## 🚀 Integration với hệ thống:

1. **Backend**: Nhận cập nhật qua `/api/parking/python-occupancies`
2. **Database**: Tự động cập nhật trạng thái ô đỗ
3. **WebSocket**: Broadcast changes đến tất cả clients
4. **Frontend**: Real-time visualization trên bản đồ 2D

Hệ thống hoạt động liên tục và tự động, không cần can thiệp thủ công!
