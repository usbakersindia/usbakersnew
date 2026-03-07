#!/bin/bash
# =============================================================================
# US Bakers - Hostinger VPS Deployment Script
# Complete deployment with MongoDB, Backend, Frontend, and Seed Data
# =============================================================================

set -e  # Exit on any error

echo "=============================================="
echo "🚀 US Bakers VPS Deployment Starting..."
echo "=============================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
APP_DIR="/home/usbakers"
APP_USER="usbakers"
DOMAIN="your-domain.com"  # Change this to your domain
BACKEND_PORT=8001
FRONTEND_PORT=3000

# =============================================================================
# Step 1: System Update & Basic Packages
# =============================================================================
echo -e "${GREEN}Step 1: Updating system and installing basic packages...${NC}"
sudo apt update
sudo apt upgrade -y
sudo apt install -y curl wget git build-essential software-properties-common

# =============================================================================
# Step 2: Install Python 3.11
# =============================================================================
echo -e "${GREEN}Step 2: Installing Python 3.11...${NC}"
sudo add-apt-repository -y ppa:deadsnakes/ppa
sudo apt update
sudo apt install -y python3.11 python3.11-venv python3.11-dev python3-pip

# =============================================================================
# Step 3: Install Node.js 18
# =============================================================================
echo -e "${GREEN}Step 3: Installing Node.js 18 and Yarn...${NC}"
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g yarn

# =============================================================================
# Step 4: Install MongoDB 6.0
# =============================================================================
echo -e "${GREEN}Step 4: Installing MongoDB 6.0...${NC}"
curl -fsSL https://www.mongodb.org/static/pgp/server-6.0.asc | sudo gpg --dearmor -o /etc/apt/trusted.gpg.d/mongodb-6.gpg
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/6.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-6.0.list
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Wait for MongoDB to start
sleep 5
echo -e "${GREEN}✓ MongoDB started${NC}"

# =============================================================================
# Step 5: Install Nginx
# =============================================================================
echo -e "${GREEN}Step 5: Installing Nginx...${NC}"
sudo apt install -y nginx

# =============================================================================
# Step 6: Install Supervisor
# =============================================================================
echo -e "${GREEN}Step 6: Installing Supervisor...${NC}"
sudo apt install -y supervisor

# =============================================================================
# Step 7: Create Application User
# =============================================================================
echo -e "${GREEN}Step 7: Creating application user...${NC}"
if ! id "$APP_USER" &>/dev/null; then
    sudo useradd -m -s /bin/bash $APP_USER
    echo -e "${GREEN}✓ User $APP_USER created${NC}"
else
    echo -e "${YELLOW}User $APP_USER already exists${NC}"
fi

# =============================================================================
# Step 8: Clone Repository (if not exists)
# =============================================================================
echo -e "${GREEN}Step 8: Setting up application directory...${NC}"
sudo mkdir -p $APP_DIR
sudo chown -R $APP_USER:$APP_USER $APP_DIR

# Copy files from current directory to APP_DIR
echo "Copying application files..."
sudo cp -r /app/* $APP_DIR/
sudo chown -R $APP_USER:$APP_USER $APP_DIR

# =============================================================================
# Step 9: Backend Setup
# =============================================================================
echo -e "${GREEN}Step 9: Setting up Backend...${NC}"
cd $APP_DIR/backend

# Create Python virtual environment
sudo -u $APP_USER python3.11 -m venv venv

# Install Python dependencies
sudo -u $APP_USER $APP_DIR/backend/venv/bin/pip install --upgrade pip
sudo -u $APP_USER $APP_DIR/backend/venv/bin/pip install -r requirements.txt

# Create .env file
cat > $APP_DIR/backend/.env << 'EOF'
MONGO_URL=mongodb://localhost:27017
DB_NAME=usbakers
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
APP_URL=http://localhost:8001
EOF

sudo chown $APP_USER:$APP_USER $APP_DIR/backend/.env

echo -e "${GREEN}✓ Backend setup complete${NC}"

# =============================================================================
# Step 10: Frontend Setup
# =============================================================================
echo -e "${GREEN}Step 10: Setting up Frontend...${NC}"
cd $APP_DIR/frontend

# Install dependencies
sudo -u $APP_USER yarn install

# Create .env file
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://$DOMAIN
EOF

sudo chown $APP_USER:$APP_USER $APP_DIR/frontend/.env

# Build frontend
sudo -u $APP_USER yarn build

echo -e "${GREEN}✓ Frontend setup complete${NC}"

# =============================================================================
# Step 11: Supervisor Configuration
# =============================================================================
echo -e "${GREEN}Step 11: Configuring Supervisor...${NC}"

# Backend supervisor config
cat > /etc/supervisor/conf.d/usbakers-backend.conf << EOF
[program:usbakers-backend]
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port $BACKEND_PORT
directory=$APP_DIR/backend
user=$APP_USER
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/usbakers-backend.err.log
stdout_logfile=/var/log/supervisor/usbakers-backend.out.log
environment=PATH="$APP_DIR/backend/venv/bin"
EOF

# Frontend supervisor config
cat > /etc/supervisor/conf.d/usbakers-frontend.conf << EOF
[program:usbakers-frontend]
command=/usr/bin/yarn start
directory=$APP_DIR/frontend
user=$APP_USER
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/usbakers-frontend.err.log
stdout_logfile=/var/log/supervisor/usbakers-frontend.out.log
environment=PORT="$FRONTEND_PORT"
EOF

# Reload supervisor
sudo supervisorctl reread
sudo supervisorctl update

echo -e "${GREEN}✓ Supervisor configured${NC}"

# =============================================================================
# Step 12: Nginx Configuration
# =============================================================================
echo -e "${GREEN}Step 12: Configuring Nginx...${NC}"

cat > /etc/nginx/sites-available/usbakers << 'EOF'
server {
    listen 80;
    server_name DOMAIN_PLACEHOLDER;

    # Frontend
    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
EOF

# Replace placeholder with actual domain
sed -i "s/DOMAIN_PLACEHOLDER/$DOMAIN/g" /etc/nginx/sites-available/usbakers

# Enable site
sudo ln -sf /etc/nginx/sites-available/usbakers /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Test and reload nginx
sudo nginx -t
sudo systemctl reload nginx

echo -e "${GREEN}✓ Nginx configured${NC}"

# =============================================================================
# Step 13: Start Services
# =============================================================================
echo -e "${GREEN}Step 13: Starting all services...${NC}"

sudo supervisorctl start usbakers-backend
sudo supervisorctl start usbakers-frontend

sleep 5

echo -e "${GREEN}✓ Services started${NC}"

# =============================================================================
# Step 14: Run Seed Data
# =============================================================================
echo -e "${GREEN}Step 14: Loading seed data...${NC}"

cd $APP_DIR/backend
sudo -u $APP_USER $APP_DIR/backend/venv/bin/python utils/seed_complete_data.py

echo -e "${GREEN}✓ Seed data loaded${NC}"

# =============================================================================
# Step 15: Setup Firewall
# =============================================================================
echo -e "${GREEN}Step 15: Configuring firewall...${NC}"

sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable

echo -e "${GREEN}✓ Firewall configured${NC}"

# =============================================================================
# Final Status Check
# =============================================================================
echo ""
echo "=============================================="
echo "✅ Deployment Complete!"
echo "=============================================="
echo ""
echo "Service Status:"
sudo supervisorctl status
echo ""
echo "MongoDB Status:"
sudo systemctl status mongod --no-pager | head -3
echo ""
echo "Nginx Status:"
sudo systemctl status nginx --no-pager | head -3
echo ""
echo "=============================================="
echo "🎉 Your application is ready!"
echo "=============================================="
echo ""
echo "Access your application:"
echo "URL: http://$DOMAIN"
echo ""
echo "Test Credentials:"
echo "Super Admin: admin@usbakers.com / admin123"
echo "Dhangu Admin: satyam@usbakers.com / satyam123"
echo "Railway Admin: sushant@usbakers.com / sushant123"
echo "Factory: factory@usbakers.com / factory123"
echo ""
echo "Test Data Loaded:"
echo "- 4 Users (all roles)"
echo "- 2 Outlets with zones"
echo "- 5 Sales Persons"
echo "- 10 Orders (3 pending, 2 hold, 5 active)"
echo "- Payment webhook configured"
echo ""
echo "PetPooja Webhook URLs:"
echo "Payment: http://$DOMAIN/api/petpooja/payment-webhook"
echo "Status: http://$DOMAIN/api/petpooja/callback"
echo ""
echo "=============================================="
echo "📝 Important Next Steps:"
echo "=============================================="
echo "1. Update domain in frontend/.env if needed"
echo "2. Setup SSL certificate (recommended):"
echo "   sudo apt install certbot python3-certbot-nginx"
echo "   sudo certbot --nginx -d $DOMAIN"
echo "3. Configure PetPooja webhooks with above URLs"
echo "4. Change JWT_SECRET in backend/.env"
echo "5. Test all features"
echo ""
echo "Useful Commands:"
echo "- Check logs: sudo tail -f /var/log/supervisor/usbakers-*.log"
echo "- Restart backend: sudo supervisorctl restart usbakers-backend"
echo "- Restart frontend: sudo supervisorctl restart usbakers-frontend"
echo "- Check status: sudo supervisorctl status"
echo ""
echo "=============================================="
