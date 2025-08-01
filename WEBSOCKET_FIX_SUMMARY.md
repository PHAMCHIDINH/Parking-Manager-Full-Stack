# WebSocket Real-time Update Fix Summary

## 🔍 Vấn đề được xác định

**Vấn đề chính**: Khi hệ thống computer vision Python phát hiện thay đổi trạng thái parking spot từ FREE sang OCCUPIED, thông tin này không được cập nhật real-time trên web frontend. User phải ấn nút "Reset" hoặc refresh page để thấy thay đổi.

### Nguyên nhân gốc rễ:

1. **Backend đã hoạt động đúng**: 
   - Python CV system gửi occupancy updates qua `/api/parking/python-occupancies`
   - Backend xử lý và broadcast WebSocket message qua `/topic/parking-updates`

2. **AdminDashboard có WebSocket nhưng mặc định TẮT**:
   - Có logic WebSocket đầy đủ
   - Nhưng chỉ hoạt động khi switch "Live Occupancy" được bật
   - Mặc định `liveOccupancy = false`

3. **UserDashboard HOÀN TOÀN THIẾU WebSocket**:
   - Không có import WebSocket libraries
   - Không có logic subscribe WebSocket
   - Chỉ có REST API fetch ban đầu

## 🛠️ Giải pháp đã triển khai

### 1. Thêm WebSocket cho UserDashboard

**Thêm imports cần thiết:**
```typescript
import { Client, Message } from "@stomp/stompjs";
import SockJS from "sockjs-client";
```

**Thêm function helper:**
```typescript
function toSpotRecord(spot: any): SpotRecord {
    return {
        spot_id: spot.label,
        type: spot.category,
        occupied: spot.occupied,
        geometry: spot.coordinates ? JSON.parse(spot.coordinates) : undefined,
    };
}
```

**Thêm WebSocket logic:**
```typescript
useEffect(() => {
    if (!liveOccupancy) return;

    const socket = new SockJS("http://localhost:8080/ws");
    const stompClient = new Client({
        webSocketFactory: () => socket as any,
        onConnect: () => {
            console.log("[UserDashboard] STOMP connected!");
            stompClient.subscribe("/topic/parking-updates", (msg: Message) => {
                const payload = JSON.parse(msg.body);
                console.log("[UserDashboard] Received WebSocket update:", payload);
                if (Array.isArray(payload)) {
                    console.log("[UserDashboard] Updating all spots:", payload.length);
                    setSpots(payload.map(toSpotRecord));
                } else {
                    const updated = toSpotRecord(payload);
                    console.log("[UserDashboard] Updating single spot:", updated.spot_id);
                    setSpots((prev) => {
                        const idx = prev.findIndex((s) => s.spot_id === updated.spot_id);
                        if (idx >= 0) {
                            const copy = [...prev];
                            copy[idx] = updated;
                            return copy;
                        }
                        return [...prev, updated];
                    });
                }
            });
        },
        onDisconnect: () => {
            console.log("[UserDashboard] STOMP disconnected!");
        },
        onStompError: (frame) => {
            console.error("[UserDashboard] STOMP error:", frame);
        },
    });
    stompClient.activate();

    return () => {
        stompClient.deactivate();
    };
}, [liveOccupancy]);
```

### 2. Bật mặc định Live Occupancy

**UserDashboard:**
```typescript
const [liveOccupancy, setLiveOccupancy] = useState(true); // Changed from false
```

**AdminDashboard:**
```typescript
const [liveOccupancy, setLiveOccupancy] = useState(true); // Changed from false
```

### 3. Thêm Debug Logging

Thêm console.log để theo dõi WebSocket traffic:
- Khi connect/disconnect
- Khi nhận message
- Khi update spots (single vs array)

## 🔄 Luồng hoạt động sau khi fix

1. **Python CV System** phát hiện xe vào ô đỗ
2. **Python** gửi POST `/api/parking/python-occupancies` với data:
   ```json
   [{"spotId": 1, "occupied": true}]
   ```
3. **Backend** xử lý và update database
4. **Backend** broadcast WebSocket message qua `/topic/parking-updates`
5. **Frontend** (cả User và Admin Dashboard) tự động nhận message
6. **Frontend** update UI ngay lập tức mà không cần refresh

## 📋 Files đã thay đổi

1. `parking-project-frontend/src/pages/UserDashboard.tsx`:
   - ✅ Thêm WebSocket imports
   - ✅ Thêm toSpotRecord function
   - ✅ Thêm WebSocket useEffect logic
   - ✅ Bật mặc định liveOccupancy = true
   - ✅ Thêm debug logging

2. `parking-project-frontend/src/pages/AdminDashboard.tsx`:
   - ✅ Bật mặc định liveOccupancy = true
   - ✅ Thêm debug logging

## 🧪 Cách test

1. **Khởi động các service:**
   ```bash
   # Backend
   cd parkingmanager
   mvn spring-boot:run

   # Frontend
   cd parking-project-frontend
   npm run dev

   # Python CV
   cd parking-detection-python
   python video_main.py
   ```

2. **Mở browser:**
   - Admin: http://localhost:5173/admin
   - User: http://localhost:5173/user

3. **Kiểm tra WebSocket connection:**
   - Mở DevTools Console
   - Xem log "[UserDashboard] STOMP connected!"
   - Xem log "[AdminDashboard] STOMP connected!"

4. **Test real-time update:**
   - Chạy Python CV system để phát hiện xe
   - Hoặc manual trigger qua API:
     ```bash
     curl -X POST http://localhost:8080/api/parking/python-occupancies \
       -H "Content-Type: application/json" \
       -d '[{"spotId": 1, "occupied": true}]'
     ```
   - Xem console log nhận WebSocket message
   - Kiểm tra UI update ngay lập tức

## ⚠️ Lưu ý

1. **Dependency đã có sẵn**: Không cần install thêm packages
2. **Backend không thay đổi**: Logic WebSocket backend đã hoạt động đúng
3. **Switch vẫn hoạt động**: User có thể tắt/bật live occupancy
4. **Performance**: WebSocket chỉ update khi có thay đổi thực sự

## 🎯 Kết quả mong đợi

- ✅ Khi ô đỗ xe chuyển từ FREE → OCCUPIED: UI update ngay lập tức
- ✅ Khi ô đỗ xe chuyển từ OCCUPIED → FREE: UI update ngay lập tức  
- ✅ Không cần ấn Reset hoặc refresh page
- ✅ Hoạt động cho cả User và Admin dashboard
- ✅ Debug logs giúp troubleshoot nếu có vấn đề
