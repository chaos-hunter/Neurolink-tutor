@echo off
title Neuralinq Tutor
echo ========================================
echo  Neuralinq Tutor
echo ========================================

:check-prereqs
set prereqStatus=TRUE

echo.
echo [1/5] Checking Python...
python --version
if %errorlevel% neq 0 (
    echo ERROR: Python not found!
    echo Please install Python from https://www.python.org/downloads/
    set prereqStatus=FALSE
    pause
    exit /b 1
)
echo Python found!
echo.

echo [2/5] Checking Node.js...
node --version
if %errorlevel% neq 0 (
    echo ERROR: Node.js not found!
    echo Please install Node.js from https://nodejs.org/en/download
    set prereqStatus=FALSE
    pause
    exit /b 1
)
echo Node.js found!
echo.

if %prereqStatus%==FALSE (
    echo ========================================
    echo  Pre-requisites missing!
    echo ========================================
    echo ERROR: One or more pre-requisites are not found!
    echo Please install the missing pre-requisites
    pause
    goto :EOF
)

echo ========================================
echo  Pre-requisites OK!
echo ========================================
if %prereqStatus%==TRUE goto check-enviro

goto :EOF

:check-enviro
set enviroStatus=TRUE
echo.
echo [3/5] Checking Environment Files...
if exist "backend\.env" (
    echo backend/.env exists!
) else (
    echo backend/.env missing!
    echo Run setup.bat to create it
    set enviroStatus=FALSE
)

if exist "frontend\.env" (
    echo frontend/.env exists!
) else (
    echo frontend/.env missing!
    echo Run setup.bat to create it
    set enviroStatus=FALSE
)
echo.

if %enviroStatus%==FALSE (
    echo ========================================
    echo  Enviroment files missing!
    echo ========================================
    echo ERROR: One or more enviroment files are not found!
    echo Please fix the missing enviroment files
    pause
    goto :EOF
)

echo ========================================
echo  Enviroment files OK!
echo ========================================
if %enviroStatus%==TRUE goto check-dependencies

goto :EOF

:check-dependencies
set dependStatus=TRUE
echo.
echo [4/5] Checking Backend Dependencies...
cd backend
python -c "import flask; import flask_cors" 2>nul
if %errorlevel% neq 0 (
    echo Backend dependencies not installed!
    set dependStatus=FALSE
) else (
    echo Backend dependencies OK!
)
cd ..
echo.

echo [4/5] Checking Frontend Dependencies...
if exist "frontend\node_modules" (
    echo Frontend dependencies OK!
) else (
    echo Frontend dependencies not installed!
    set dependStatus=FALSE
)
echo.

if %dependStatus%==FALSE (
    echo ========================================
    echo  Dependencies missing!
    echo ========================================
    echo Dependencies will now install
    pause
    goto install-dependencies
)

echo ========================================
echo  Dependencies OK!
echo ========================================
if %dependStatus%==TRUE goto run-program

goto :EOF


:install-dependencies
cls
echo.
echo [1/4] Setting up Backend...
cd backend
echo Installing Python dependencies...
pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Python dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo [2/4] Setting up Frontend...
cd frontend
echo Installing Node.js dependencies...
call npm install
title Neuralinq Tutor - Project Setup
if %errorlevel% neq 0 (
    echo ERROR: Failed to install Node.js dependencies
    pause
    exit /b 1
)
cd ..

echo.
echo [3/4] Creating environment files...
if not exist backend\.env (
    copy backend\.env.example backend\.env
    echo Created backend/.env from example
)
if not exist frontend\.env (
    copy frontend\.env.example frontend\.env
    echo Created frontend/.env from example
)

echo.
echo [4/4] Setup Complete!
echo.

:run-program
set /p q=Ready to start program? (y/n): 
echo. 
if /I "%q%" NEQ "y" (
    echo Exiting setup...
    exit /b 0
)   
echo Starting Backend and Frontend...
echo.
echo Note: Two command prompt windows will open.
echo Close them to stop the servers.
echo.
start cmd /k "cd backend && python app.py"
start cmd /k "cd frontend && npm start"
pause
goto :EOF