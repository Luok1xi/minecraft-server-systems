@echo off
setlocal EnableExtensions EnableDelayedExpansion
chcp 65001 >nul
cd /d "%~dp0"

echo ====================================================
echo  LegendaryWardrobeDisplay 1.0.2 STRICT CLEAN BUILD
echo ====================================================
echo.

if not exist "gradle.properties" (
  echo [ERROR] gradle.properties not found.
  pause
  exit /b 1
)

findstr /B /C:"mod_id=legendarywardrobedisplay" "gradle.properties" >nul
if errorlevel 1 (
  echo [STOP] This is NOT a LegendaryWardrobeDisplay project folder.
  echo [STOP] Do not run this inside LuokixiVisuals or another mod project.
  pause
  exit /b 2
)

if not exist "gradlew.bat" (
  echo [ERROR] gradlew.bat is missing.
  echo Copy ONLY these Forge 1.20.1-47.4.22 MDK launcher files into THIS folder:
  echo   gradlew.bat
  echo   gradlew
  echo   gradle\wrapper\
  echo Do NOT copy this source into an existing mod project.
  pause
  exit /b 3
)

set "BACKUP=_foreign_source_backup"
if exist "%BACKUP%" rmdir /s /q "%BACKUP%"
mkdir "%BACKUP%" >nul 2>nul

REM Move the Forge MDK template ExampleMod out of the source tree if present.
if exist "src\main\java\com\example" (
  echo [FIX] Found Forge MDK ExampleMod sources. Moving them out of src...
  mkdir "%BACKUP%\java\com" >nul 2>nul
  move "src\main\java\com\example" "%BACKUP%\java\com\example" >nul
)
if exist "src\main\resources\assets\examplemod" (
  echo [FIX] Found Forge MDK ExampleMod assets. Moving them out of src...
  mkdir "%BACKUP%\resources\assets" >nul 2>nul
  move "src\main\resources\assets\examplemod" "%BACKUP%\resources\assets\examplemod" >nul
)

REM Move accidental LuokixiVisuals contamination out of the source tree if present.
if exist "src\main\java\com\luokixi" (
  echo [FIX] Found LuokixiVisuals Java sources. Moving them out of src...
  mkdir "%BACKUP%\java\com" >nul 2>nul
  move "src\main\java\com\luokixi" "%BACKUP%\java\com\luokixi" >nul
)
if exist "src\main\resources\assets\luokixivisuals" (
  echo [FIX] Found LuokixiVisuals assets. Moving them out of src...
  mkdir "%BACKUP%\resources\assets" >nul 2>nul
  move "src\main\resources\assets\luokixivisuals" "%BACKUP%\resources\assets\luokixivisuals" >nul
)
if exist "src\main\resources\luokixivisuals.mixins.json" (
  echo [FIX] Found LuokixiVisuals mixin config. Moving it out of src...
  mkdir "%BACKUP%\resources" >nul 2>nul
  move "src\main\resources\luokixivisuals.mixins.json" "%BACKUP%\resources\luokixivisuals.mixins.json" >nul
)

if exist "build" rmdir /s /q "build"

echo.
echo [BUILD] Starting strict clean Forge build...
call gradlew.bat --no-daemon clean build
if errorlevel 1 (
  echo.
  echo [FAILED] Gradle build failed. Send me the full output.
  pause
  exit /b 4
)

set "JAR=build\libs\LegendaryWardrobeDisplay-1.0.2.jar"
if not exist "%JAR%" (
  echo [ERROR] Expected jar not found: %JAR%
  dir /b "build\libs" 2>nul
  pause
  exit /b 5
)

echo.
echo [CHECK] Looking for ExampleMod / LuokixiVisuals contamination...
jar tf "%JAR%" | findstr /I /C:"examplemod" /C:"com/example/" /C:"com/luokixi/" /C:"assets/luokixivisuals/" /C:"luokixivisuals.mixins.json" >nul
if not errorlevel 1 (
  echo [BLOCKED] Foreign mod files are still inside the jar.
  echo [BLOCKED] The unsafe jar has been deleted.
  del /q "%JAR%" >nul 2>nul
  pause
  exit /b 6
)

echo [CHECK] Confirming LegendaryWardrobeDisplay metadata...
jar tf "%JAR%" | findstr /I /C:"com/lsi/legendarywardrobe/LegendaryWardrobeDisplay.class" >nul
if errorlevel 1 (
  echo [BLOCKED] Main LegendaryWardrobeDisplay class is missing.
  del /q "%JAR%" >nul 2>nul
  pause
  exit /b 7
)

echo.
echo [OK] Strict clean jar passed all checks:
echo      %JAR%
echo.
echo Delete every older LegendaryWardrobeDisplay jar first.
echo Put this SAME 1.0.2 jar in BOTH server mods and client mods.
echo.
pause
exit /b 0
