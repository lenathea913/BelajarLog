@echo off
title BelajarLog | Jurnal Belajar Harian
cd /d "%~dp0"

echo ============================================
echo    BelajarLog - Jurnal Belajar Harian
echo    Launcher
echo ============================================
echo.
echo Menjalankan server, mohon tunggu...
echo (Browser terbuka otomatis dalam 3 detik)
echo.

if not exist node_modules (
    echo [setup] Menginstall dependensi...
    call npm install
    if errorlevel 1 (
        echo Gagal menginstall. Pastikan Node.js sudah terinstall.
        pause
        exit /b 1
    )
    echo.
)

rem Buka browser setelah server sempat boot
start "" cmd /c "timeout /t 3 /nobreak >nul & start http://localhost:5175/"

call npm run dev

echo.
echo Server berhenti. Tekan apa pun untuk menutup jendela ini.
pause >nul
