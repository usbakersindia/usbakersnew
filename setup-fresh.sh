#!/bin/bash

# US Bakers - Complete Fresh Setup Script
# This script sets up everything from a fresh clone

set -e  # Exit on any error

echo "=========================================="
echo "  US Bakers - Complete Setup Script"
echo "=========================================="
echo ""

# Color codes
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get project directory
PROJECT_DIR="/home/usbakers/usbakers-crm"

echo -e "${YELLOW}📂 Project Directory: $PROJECT_DIR${NC}"
echo ""

# Navigate to project
cd "$PROJECT_DIR"

# ============================================
# Step 1: Configure Backend .env
# ============================================
echo -e "${GREEN}Step 1: Setting up Backend .env${NC}"
echo ""

# Prompt for configuration
read -p "Enter your domain (e.g., crm.usbakers.com): " DOMAIN
read -p "Enter MongoDB URL [mongodb://localhost:27017/usbakers_crm]: " MONGO_URL
MONGO_URL=${MONGO_URL:-mongodb://localhost:27017/usbakers_crm}

read -p "Enter MongoDB Database Name [usbakers_crm]: " DB_NAME
DB_NAME=${DB_NAME:-usbakers_crm}

# Generate random JWT secret
JWT_SECRET=$(openssl rand -hex 32)

read -p "Enter MSG91 Auth Key (press Enter to skip): " MSG91_KEY
read -p "Enter MSG91 Sender ID (press Enter to skip): " MSG91_SENDER

# Create backend .env
cat > "$PROJECT_DIR/backend/.env" <<EOF
MONGO_URL=$MONGO_URL
DB_NAME=$DB_NAME
JWT_SECRET=$JWT_SECRET
MSG91_AUTH_KEY=${MSG91_KEY:-your-msg91-key}
MSG91_SENDER_ID=${MSG91_SENDER:-your-sender-id}
EOF

echo "✅ Backend .env created"
echo ""

# ============================================
# Step 2: Configure Frontend .env
# ============================================
echo -e "${GREEN}Step 2: Setting up Frontend .env${NC}"

cat > "$PROJECT_DIR/frontend/.env" <<EOF
REACT_APP_BACKEND_URL=https://$DOMAIN
EOF

echo "✅ Frontend .env created"
echo ""

# ============================================
# Step 3: Check and Update Supervisor Configs
# ============================================
echo -e "${GREEN}Step 3: Checking Supervisor configurations${NC}"

# Backend supervisor config
BACKEND_CONF="/etc/supervisor/conf.d/usbakers-backend.conf"
if [ -f "$BACKEND_CONF" ]; then
    echo "  → Backend supervisor config exists"
    # Check if path is correct
    if grep -q "$PROJECT_DIR/backend" "$BACKEND_CONF"; then
        echo "  → Path is correct"
    else
        echo -e "${YELLOW}  ⚠ Updating backend path in supervisor config...${NC}"
        sudo sed -i "s|directory=.*|directory=$PROJECT_DIR/backend|g" "$BACKEND_CONF"
        sudo sed -i "s|command=.*|command=$PROJECT_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001|g" "$BACKEND_CONF"
    fi
else
    echo -e "${YELLOW}  ⚠ Backend supervisor config not found${NC}"
    echo "  Creating backend supervisor config..."
    
    sudo tee "$BACKEND_CONF" > /dev/null <<EOF
[program:usbakers-backend]
directory=$PROJECT_DIR/backend
command=$PROJECT_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
user=usbakers
environment=PATH="$PROJECT_DIR/backend/venv/bin"
EOF
    
    echo "  ✅ Backend supervisor config created"
fi

# Frontend supervisor config
FRONTEND_CONF="/etc/supervisor/conf.d/usbakers-frontend.conf"
if [ -f "$FRONTEND_CONF" ]; then
    echo "  → Frontend supervisor config exists"
    if grep -q "$PROJECT_DIR/frontend" "$FRONTEND_CONF"; then
        echo "  → Path is correct"
    else
        echo -e "${YELLOW}  ⚠ Updating frontend path in supervisor config...${NC}"
        sudo sed -i "s|directory=.*|directory=$PROJECT_DIR/frontend|g" "$FRONTEND_CONF"
        sudo sed -i "s|command=.*|command=/usr/bin/yarn start|g" "$FRONTEND_CONF"
    fi
else
    echo -e "${YELLOW}  ⚠ Frontend supervisor config not found${NC}"
    echo "  Creating frontend supervisor config..."
    
    sudo tee "$FRONTEND_CONF" > /dev/null <<EOF
[program:usbakers-frontend]
directory=$PROJECT_DIR/frontend
command=/usr/bin/yarn start
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
user=usbakers
environment=PORT="3000"
EOF
    
    echo "  ✅ Frontend supervisor config created"
fi

echo "✅ Supervisor configurations ready"
echo ""

# ============================================
# Step 4: Install Backend Dependencies
# ============================================
echo -e "${GREEN}Step 4: Installing backend dependencies${NC}"
cd "$PROJECT_DIR/backend"

# Remove old venv if exists
if [ -d "venv" ]; then
    echo "  → Removing old virtual environment..."
    rm -rf venv
fi

# Create virtual environment
echo "  → Creating virtual environment..."
python3.11 -m venv venv

if [ ! -f "venv/bin/activate" ]; then
    echo "  ✗ Failed to create virtual environment"
    echo "  Trying with python3..."
    python3 -m venv venv
fi

if [ ! -f "venv/bin/activate" ]; then
    echo "  ✗ Virtual environment creation failed!"
    exit 1
fi

# Activate and install
echo "  → Installing Python packages..."
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt
deactivate

echo "✅ Backend dependencies installed"
echo ""

# ============================================
# Step 5: Install Frontend Dependencies
# ============================================
echo -e "${GREEN}Step 5: Installing frontend dependencies${NC}"
cd "$PROJECT_DIR/frontend"
yarn install
echo "✅ Frontend dependencies installed"
echo ""

# ============================================
# Step 6: Build Frontend
# ============================================
echo -e "${GREEN}Step 6: Building frontend${NC}"
yarn build
echo "✅ Frontend built successfully"
echo ""

# ============================================
# Step 7: Seed Database
# ============================================
echo -e "${GREEN}Step 7: Seeding database with test data${NC}"
cd "$PROJECT_DIR/backend"
source venv/bin/activate
python3 utils/seed_complete_data.py
deactivate
echo "✅ Database seeded"
echo ""

# ============================================
# Step 8: Reload and Restart Services
# ============================================
echo -e "${GREEN}Step 8: Starting services${NC}"
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl restart usbakers-backend usbakers-frontend
echo "✅ Services restarted"
echo ""

# ============================================
# Step 9: Check Status
# ============================================
echo -e "${GREEN}Step 9: Checking service status${NC}"
sudo supervisorctl status usbakers-backend usbakers-frontend
echo ""

# ============================================
# Setup Complete
# ============================================
echo "=========================================="
echo -e "${GREEN}✅ Setup completed successfully!${NC}"
echo "=========================================="
echo ""
echo "📝 Configuration Summary:"
echo "   Domain: https://$DOMAIN"
echo "   MongoDB: $MONGO_URL"
echo "   Database: $DB_NAME"
echo ""
echo "🔑 Test Credentials:"
echo "   Super Admin: admin@usbakers.com / admin123"
echo "   Dhangu Road: satyam@usbakers.com / satyam123"
echo "   Railway Road: sushant@usbakers.com / sushant123"
echo "   Factory: factory@usbakers.com / factory123"
echo ""
echo "🔗 Access your application at: https://$DOMAIN"
echo ""
echo "📊 Check logs if needed:"
echo "   Backend: sudo tail -f /var/log/supervisor/backend.err.log"
echo "   Frontend: sudo tail -f /var/log/supervisor/frontend.err.log"
echo ""
echo "🎉 Happy Baking!"
echo ""
