@echo off
echo ========================================
echo    PARKING MANAGER FULL STACK
echo ========================================
echo.
echo Chon lua chon:
echo 1. Chay Backend (Spring Boot) - Port 8080
echo 2. Chay Frontend (React) - Port 5173
echo 3. Chay Python CV Module (Static Image)
echo 4. Chay Python Video Processing (Real-time)
echo 5. Chay tat ca (mo nhieu cua so)
echo 6. Huong dan su dung
echo 0. Thoat
echo.
set /p choice="Nhap lua chon (0-6): "

if "%choice%"=="1" (
    echo Dang chay Backend...
    start cmd /k "cd parkingmanager && mvnw.cmd spring-boot:run"
) else if "%choice%"=="2" (
    echo Dang chay Frontend...
    start cmd /k "cd parking-project-frontend && npm run dev"
) else if "%choice%"=="3" (
    echo Dang chay Python CV Module (Static)...
    start cmd /k "cd parking-detection-python && ..\.venv\Scripts\python.exe main.py"
) else if "%choice%"=="4" (
    echo Dang chay Python Video Processing...
    start cmd /k "cd parking-detection-python && ..\.venv\Scripts\python.exe video_main.py"
) else if "%choice%"=="5" (
    echo Dang chay tat ca cac service...
    start cmd /k "cd parkingmanager && mvnw.cmd spring-boot:run"
    timeout /t 3 /nobreak >nul
    start cmd /k "cd parking-project-frontend && npm run dev"
    timeout /t 3 /nobreak >nul
    start cmd /k "cd parking-detection-python && ..\.venv\Scripts\python.exe video_main.py"
    echo Tat ca service da duoc khoi dong!
) else if "%choice%"=="6" (
    echo.
    echo ========== HUONG DAN SU DUNG ==========
    echo.
    echo 1. DAU TIEN: Sua file parkingmanager/src/main/resources/application.properties
    echo    - Thay "spring.datasource.password=YOUR_MYSQL_PASSWORD" bang mat khau MySQL thuc te
    echo.
    echo 2. CHAY CAC SERVICE:
    echo    - Backend: http://localhost:8080
    echo    - Frontend: http://localhost:5173
    echo    - Python CV chay tu dong
    echo.
    echo 3. DAU TIEN TRUY CAP:
    echo    - Mo trinh duyet tai http://localhost:5173
    echo    - Dang ky tai khoan moi hoac dang nhap
    echo.
    echo 4. CHUC NANG VIDEO PROCESSING:
    echo    - Dat video vao parking-detection-python/parking_video.mp4
    echo    - Hoac su dung webcam bang cach sua VIDEO_PATH = 0
    echo    - Tu dong phat hien xe ra vao lien tuc
    echo    - Cap nhat trang thai real-time moi 2 giay
    echo    - Hien thi video voi cac o do duoc danh dau
    echo.
    pause
    goto :start
) else if "%choice%"=="0" (
    echo Tam biet!
    exit
) else (
    echo Lua chon khong hop le!
    pause
    goto :start
)

:start
cls
goto :eof
