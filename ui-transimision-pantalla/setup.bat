@echo off
setlocal
echo ========= SETUP DE TRANSMISION INALAMBRICA =========

:: ---------- 1. Agregar ffmpeg a PATH si no está ----------
where ffmpeg >nul 2>&1
if %errorlevel%==0 (
    echo ffmpeg ya se encuentra disponible.
) else (
    echo  Configurando ffmpeg. Agregando ffmpeg al PATH...

    set "ffmpegPath=%~dp0ffmpeg\bin"
    
    :: Agregar al PATH del sistema
    powershell -Command "[Environment]::SetEnvironmentVariable('Path', [Environment]::GetEnvironmentVariable('Path','Machine') + ';%ffmpegPath%', 'Machine')"
    
    echo ffmpeg agregado al PATH. Reiniciá sesión para que tenga efecto global.
)

:: ---------- 2. Verificar si usbmmidd está instalado ----------
set usbCheck=0
pnputil /enum-drivers | findstr /i "usbmmidd.inf" >nul
if %errorlevel%==0 (
    echo El driver usbmmidd ya está instalado
    set usbCheck=1
) else (
    echo El driver usbmmidd no está instalado. Instalando...
    pushd "%~dp0usbmmidd"
    deviceinstaller64.exe install usbmmidd.inf usbmmidd
    popd
)

:: ---------- 3. Confirmar instalación ----------
if %usbCheck%==0 (
    echo Instalación de usbmmidd completada
)

echo ------------------------------------------------------
echo Setup finalizado. Podés iniciar el sistema con tu botón PLAY.
pause
exit /b
