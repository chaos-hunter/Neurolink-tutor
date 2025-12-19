#!/bin/bash

echo "========================================"
echo " Neuralinq ITS - Project Setup"
echo "========================================"
echo

echo "[1/4] Setting up Backend..."
cd backend
echo "Installing Python dependencies..."
pip install -r requirements.txt
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Python dependencies"
    exit 1
fi
cd ..

echo
echo "[2/4] Setting up Frontend..."
cd frontend
echo "Installing Node.js dependencies..."
npm install
if [ $? -ne 0 ]; then
    echo "ERROR: Failed to install Node.js dependencies"
    exit 1
fi
cd ..

echo
echo "[3/4] Creating environment files..."
if [ ! -f backend/.env ]; then
    cp backend/.env.example backend/.env
    echo "Created backend/.env from example"
fi
if [ ! -f frontend/.env ]; then
    cp frontend/.env.example frontend/.env
    echo "Created frontend/.env from example"
fi

echo
echo "[4/4] Setup Complete!"
echo
echo "========================================"
echo " Ready to Start Development"
echo "========================================"
echo
echo "To start the application:"
echo "1. Backend:  cd backend && python app.py"
echo "2. Frontend: cd frontend && npm start"
echo
echo "Then open: http://localhost:3000"
echo