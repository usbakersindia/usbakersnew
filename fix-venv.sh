#!/bin/bash

# Quick Fix Script for venv issue
# Run this if setup-fresh.sh failed at venv creation

echo "========================================"
echo "  Fixing Virtual Environment Issue"
echo "========================================"
echo ""

PROJECT_DIR="/home/usbakers/usbakers-crm"

# Check if project exists
if [ ! -d "$PROJECT_DIR" ]; then
    echo "❌ Project directory not found: $PROJECT_DIR"
    echo "Please make sure you cloned the repository first"
    exit 1
fi

echo "1️⃣  Installing python3-venv package..."
apt install -y python3.11-venv python3-venv

echo ""
echo "2️⃣  Removing old venv if exists..."
cd "$PROJECT_DIR/backend"
rm -rf venv

echo ""
echo "3️⃣  Creating fresh virtual environment..."
python3.11 -m venv venv

if [ ! -f "venv/bin/activate" ]; then
    echo "❌ Failed with python3.11, trying python3..."
    python3 -m venv venv
fi

if [ ! -f "venv/bin/activate" ]; then
    echo "❌ Virtual environment creation failed!"
    echo ""
    echo "Debug info:"
    python3 --version
    python3.11 --version 2>/dev/null || echo "python3.11 not found"
    which python3
    exit 1
fi

echo "✅ Virtual environment created successfully!"
echo ""
echo "4️⃣  Installing backend dependencies..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

echo ""
echo "✅ Backend setup complete!"
echo ""
echo "5️⃣  Installing frontend dependencies..."
cd "$PROJECT_DIR/frontend"
yarn install

echo ""
echo "6️⃣  Building frontend..."
yarn build

echo ""
echo "7️⃣  Seeding database..."
cd "$PROJECT_DIR/backend"
source venv/bin/activate
python3 utils/seed_complete_data.py
deactivate

echo ""
echo "8️⃣  Restarting services..."
supervisorctl reread
supervisorctl update
supervisorctl restart usbakers-backend usbakers-frontend

echo ""
echo "========================================"
echo "✅ Fix Complete!"
echo "========================================"
echo ""
echo "Check status:"
echo "  supervisorctl status"
echo ""
