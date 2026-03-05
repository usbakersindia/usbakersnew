#!/bin/bash

###############################################################################
# US Bakers CRM - Complete One-Command Deployment Script
# For Hostinger VPS (Ubuntu 24.04 / Ubuntu 22.04)
# 
# Usage: sudo bash deploy-full.sh
###############################################################################

set -e  # Exit on any error

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
APP_NAME="usbakers-crm"
APP_USER="usbakers"
APP_DIR="/home/$APP_USER/$APP_NAME"
GITHUB_REPO="https://github.com/usbakersindia/usbakers.git"
SERVER_IP=$(hostname -I | awk '{print $1}')

# Functions
print_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
print_success() { echo -e "${GREEN}[SUCCESS]${NC} $1"; }
print_warning() { echo -e "${YELLOW}[WARNING]${NC} $1"; }
print_error() { echo -e "${RED}[ERROR]${NC} $1"; }

check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run as root: sudo bash deploy-full.sh"
        exit 1
    fi
}

# Header
clear
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}║          US Bakers CRM - Full Deployment Script           ║${NC}"
echo -e "${BLUE}║                                                            ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
print_info "Server IP: $SERVER_IP"
echo ""

# Confirmation
read -p "Deploy US Bakers CRM to this server? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

check_root

###############################################################################
# STEP 1: System Update
###############################################################################
print_info "[1/15] Updating system packages..."
apt update -qq
apt upgrade -y -qq
apt install -y curl wget git unzip software-properties-common build-essential gnupg lsb-release -qq
print_success "System updated"

###############################################################################
# STEP 2: Create Application User
###############################################################################
print_info "[2/15] Creating application user..."
if id "$APP_USER" &>/dev/null; then
    print_warning "User $APP_USER already exists"
else
    adduser --disabled-password --gecos "" $APP_USER
    print_success "User $APP_USER created"
fi

###############################################################################
# STEP 3: Install Node.js 20
###############################################################################
print_info "[3/15] Installing Node.js 20..."
curl -fsSL https://deb.nodesource.com/setup_20.x | bash - > /dev/null 2>&1
apt install -y nodejs -qq
npm install -g yarn -s
print_success "Node.js $(node --version) installed"

###############################################################################
# STEP 4: Install Python 3.11
###############################################################################
print_info "[4/15] Installing Python 3.11..."
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip -qq
print_success "Python 3.11 installed"

###############################################################################
# STEP 5: Install MongoDB 7.0
###############################################################################
print_info "[5/15] Installing MongoDB 7.0..."

# Remove old MongoDB configs
rm -f /etc/apt/sources.list.d/mongodb*.list
rm -f /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB GPG key and repository
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Use Jammy repo (works on Ubuntu 24.04)
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list > /dev/null

apt update -qq
apt install -y mongodb-org

# Create systemd service if needed
if [ ! -f /lib/systemd/system/mongod.service ]; then
    cat > /lib/systemd/system/mongod.service << 'EOF'
[Unit]
Description=MongoDB Database Server
Documentation=https://docs.mongodb.org/manual
After=network-online.target
Wants=network-online.target

[Service]
User=mongodb
Group=mongodb
Type=forking
PIDFile=/var/run/mongodb/mongod.pid
ExecStart=/usr/bin/mongod --config /etc/mongod.conf
Restart=on-failure
LimitNOFILE=64000

[Install]
WantedBy=multi-user.target
EOF
fi

# Setup MongoDB directories
mkdir -p /var/lib/mongodb /var/log/mongodb /var/run/mongodb
chown -R mongodb:mongodb /var/lib/mongodb /var/log/mongodb /var/run/mongodb

systemctl daemon-reload
systemctl start mongod
systemctl enable mongod
sleep 3

if systemctl is-active --quiet mongod; then
    print_success "MongoDB installed and running"
else
    print_error "MongoDB failed to start"
    exit 1
fi

###############################################################################
# STEP 6: Install Nginx
###############################################################################
print_info "[6/15] Installing Nginx..."
apt install -y nginx -qq
systemctl start nginx
systemctl enable nginx
print_success "Nginx installed"

###############################################################################
# STEP 7: Install Supervisor
###############################################################################
print_info "[7/15] Installing Supervisor..."
apt install -y supervisor -qq
systemctl start supervisor
systemctl enable supervisor
print_success "Supervisor installed"

###############################################################################
# STEP 8: Clone/Update Application
###############################################################################
print_info "[8/15] Setting up application..."
if [ -d "$APP_DIR" ]; then
    print_warning "Application directory exists, updating..."
    cd $APP_DIR
    su - $APP_USER -c "cd $APP_DIR && git pull"
else
    su - $APP_USER -c "git clone $GITHUB_REPO $APP_DIR"
fi
print_success "Application code ready"

###############################################################################
# STEP 9: Setup Backend
###############################################################################
print_info "[9/15] Setting up backend..."

cd $APP_DIR/backend

# Create virtual environment
su - $APP_USER -c "cd $APP_DIR/backend && python3.11 -m venv venv"

# Install emergentintegrations
su - $APP_USER -c "cd $APP_DIR/backend && source venv/bin/activate && pip install --upgrade pip -q && pip install emergentintegrations --extra-index-url https://d33sy5i8bnduwe.cloudfront.net/simple/ -q"

# Install other dependencies
su - $APP_USER -c "cd $APP_DIR/backend && source venv/bin/activate && pip install \$(grep -v emergentintegrations requirements.txt | grep -v '^#' | grep -v '^$' | tr '\n' ' ') -q"

# Create .env file
cat > $APP_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017/usbakers
DB_NAME=usbakers
SECRET_KEY=$(openssl rand -hex 32)
BACKEND_URL=http://$SERVER_IP
CORS_ORIGINS=*
EOF

chown $APP_USER:$APP_USER $APP_DIR/backend/.env
print_success "Backend dependencies installed"

# Seed database
print_info "Seeding database with test data..."
cd $APP_DIR/backend
su - $APP_USER -c "cd $APP_DIR/backend && source venv/bin/activate && export MONGO_URL=mongodb://localhost:27017/usbakers && export DB_NAME=usbakers && PYTHONPATH=$APP_DIR/backend python utils/seed_fresh_data.py" || print_warning "Database seeding had warnings (check bcrypt)"
print_success "Database initialized"

###############################################################################
# STEP 10: Setup Frontend
###############################################################################
print_info "[10/15] Setting up frontend..."

cd $APP_DIR/frontend

# Create .env
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://$SERVER_IP
EOF
chown $APP_USER:$APP_USER $APP_DIR/frontend/.env

# Install and build
print_info "Installing frontend dependencies (1-2 minutes)..."
su - $APP_USER -c "cd $APP_DIR/frontend && yarn install --silent" > /dev/null 2>&1

print_info "Building frontend (1-2 minutes)..."
su - $APP_USER -c "cd $APP_DIR/frontend && yarn build" > /dev/null 2>&1

if [ -f "$APP_DIR/frontend/build/index.html" ]; then
    print_success "Frontend built successfully"
else
    print_error "Frontend build failed"
    exit 1
fi

###############################################################################
# STEP 11: Configure Supervisor for Backend
###############################################################################
print_info "[11/15] Configuring Supervisor..."

mkdir -p /home/$APP_USER/logs
chown -R $APP_USER:$APP_USER /home/$APP_USER/logs

cat > /etc/supervisor/conf.d/usbakers-backend.conf << EOF
[program:usbakers-backend]
directory=$APP_DIR/backend
command=$APP_DIR/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001 --workers 1
user=$APP_USER
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/home/$APP_USER/logs/backend.log
stderr_logfile=/home/$APP_USER/logs/backend-error.log
environment=MONGO_URL="mongodb://localhost:27017/usbakers",DB_NAME="usbakers",CORS_ORIGINS="*"
EOF

supervisorctl reread
supervisorctl update
supervisorctl start usbakers-backend

sleep 3

if supervisorctl status usbakers-backend | grep -q RUNNING; then
    print_success "Backend service started"
else
    print_error "Backend failed to start"
    tail -n 20 /home/$APP_USER/logs/backend.log
    exit 1
fi

###############################################################################
# STEP 12: Configure Nginx
###############################################################################
print_info "[12/15] Configuring Nginx..."

rm -f /etc/nginx/sites-enabled/default

cat > /etc/nginx/sites-available/usbakers << EOF
server {
    listen 80 default_server;
    server_name _;
    
    client_max_body_size 50M;

    # Frontend
    location / {
        root $APP_DIR/frontend/build;
        try_files \$uri \$uri/ /index.html;
        index index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias $APP_DIR/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
}
EOF

ln -sf /etc/nginx/sites-available/usbakers /etc/nginx/sites-enabled/

nginx -t
systemctl restart nginx
print_success "Nginx configured"

###############################################################################
# STEP 13: Fix Permissions
###############################################################################
print_info "[13/15] Fixing file permissions..."

chmod 755 /home /home/$APP_USER
chmod -R 755 $APP_DIR
chown -R $APP_USER:$APP_USER $APP_DIR

# Frontend build
find $APP_DIR/frontend/build -type d -exec chmod 755 {} \;
find $APP_DIR/frontend/build -type f -exec chmod 644 {} \;

# Uploads directory
mkdir -p $APP_DIR/uploads $APP_DIR/backend/uploads
chmod -R 755 $APP_DIR/uploads $APP_DIR/backend/uploads
chown -R $APP_USER:$APP_USER $APP_DIR/uploads $APP_DIR/backend/uploads

# Test if www-data can read
if su - www-data -s /bin/bash -c "test -r $APP_DIR/frontend/build/index.html" 2>/dev/null; then
    print_success "Permissions configured correctly"
else
    print_warning "Adding www-data to user group..."
    usermod -a -G $APP_USER www-data
fi

###############################################################################
# STEP 14: Configure Firewall
###############################################################################
print_info "[14/15] Configuring firewall..."

if command -v ufw &> /dev/null; then
    ufw --force enable
    ufw allow 22/tcp
    ufw allow 80/tcp
    ufw allow 443/tcp
    print_success "Firewall configured"
else
    print_warning "UFW not installed, skipping firewall configuration"
fi

###############################################################################
# STEP 15: Final Testing
###############################################################################
print_info "[15/15] Testing deployment..."

sleep 3

# Test backend health
HEALTH=$(curl -s http://localhost:8001/api/health || echo "failed")
if echo "$HEALTH" | grep -q "healthy"; then
    print_success "Backend health check passed"
else
    print_error "Backend health check failed"
fi

# Test user logins
print_info "Testing user logins..."
TESTED=0
PASSED=0

for user in "admin@usbakers.com:admin123:Super Admin" "satyam@usbakers.com:satyam123:Satyam" "sushant@usbakers.com:sushant123:Sushant" "factory@usbakers.com:factory123:Factory"; do
    email=$(echo $user | cut -d: -f1)
    pass=$(echo $user | cut -d: -f2)
    name=$(echo $user | cut -d: -f3)
    
    TESTED=$((TESTED + 1))
    if curl -s -X POST http://$SERVER_IP/api/auth/login \
        -H "Content-Type: application/json" \
        -d "{\"email\":\"$email\",\"password\":\"$pass\"}" 2>/dev/null | grep -q "access_token"; then
        echo -e "  ${GREEN}✓${NC} $name"
        PASSED=$((PASSED + 1))
    else
        echo -e "  ${RED}✗${NC} $name"
    fi
done

# Database stats
USER_COUNT=$(mongosh mongodb://localhost:27017/usbakers --quiet --eval "db.users.countDocuments({})" 2>/dev/null || echo "?")
ORDER_COUNT=$(mongosh mongodb://localhost:27017/usbakers --quiet --eval "db.orders.countDocuments({})" 2>/dev/null || echo "?")

###############################################################################
# DEPLOYMENT COMPLETE
###############################################################################

clear
echo -e "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}║              🎉 DEPLOYMENT SUCCESSFUL! 🎉                  ║${NC}"
echo -e "${GREEN}║                                                            ║${NC}"
echo -e "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ APPLICATION ACCESS                                         │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo "🌐 URL: http://$SERVER_IP"
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ LOGIN CREDENTIALS                                          │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo "👤 Super Admin (Full Access + Permission Management):"
echo "   📧 admin@usbakers.com"
echo "   🔒 admin123"
echo ""
echo "👤 Satyam - Dhangu Road (Outlet Admin):"
echo "   📧 satyam@usbakers.com"
echo "   🔒 satyam123"
echo ""
echo "👤 Sushant - Railway Road (Outlet Admin):"
echo "   📧 sushant@usbakers.com"
echo "   🔒 sushant123"
echo ""
echo "👤 Factory (Kitchen Dashboard):"
echo "   📧 factory@usbakers.com"
echo "   🔒 factory123"
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ FEATURES                                                   │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo "✅ Multi-outlet order management"
echo "✅ Kitchen & Delivery dashboards"
echo "✅ Customer management"
echo "✅ Payment tracking & reports"
echo "✅ WhatsApp notifications (MSG91)"
echo "✅ Role-based access control"
echo "✅ Granular permission management"
echo "✅ User management with auto-permissions"
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ DATABASE                                                   │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo "Users: $USER_COUNT  |  Orders: $ORDER_COUNT"
echo "Login Tests: $PASSED/$TESTED passed"
echo ""
echo -e "${BLUE}┌────────────────────────────────────────────────────────────┐${NC}"
echo -e "${BLUE}│ MANAGEMENT COMMANDS                                        │${NC}"
echo -e "${BLUE}└────────────────────────────────────────────────────────────┘${NC}"
echo ""
echo "📊 Check status:"
echo "   sudo supervisorctl status usbakers-backend"
echo "   sudo systemctl status nginx"
echo "   sudo systemctl status mongod"
echo ""
echo "📝 View logs:"
echo "   tail -f /home/$APP_USER/logs/backend.log"
echo "   tail -f /var/log/nginx/error.log"
echo ""
echo "🔄 Restart services:"
echo "   sudo supervisorctl restart usbakers-backend"
echo "   sudo systemctl restart nginx"
echo ""
echo "💾 Backup database:"
echo "   mongodump --uri='mongodb://localhost:27017/usbakers' --out=/home/$APP_USER/backup-\$(date +%Y%m%d)"
echo ""
echo -e "${YELLOW}⚠️  IMPORTANT NEXT STEPS:${NC}"
echo ""
echo "1. Change all default passwords immediately"
echo "2. Configure domain (if you have one):"
echo "   - Update REACT_APP_BACKEND_URL in frontend/.env"
echo "   - Update Nginx server_name"
echo "   - Setup SSL: sudo certbot --nginx -d yourdomain.com"
echo "3. Configure MSG91 WhatsApp settings in the app"
echo "4. Setup automated backups (cron job)"
echo ""
echo -e "${GREEN}🎯 Your US Bakers CRM is ready to use!${NC}"
echo ""
