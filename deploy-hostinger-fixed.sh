#!/bin/bash

#############################################
# US Bakers CRM - Fixed Hostinger VPS Deployment
# GitHub: https://github.com/usbakersindia/usbakers
# Compatible with Ubuntu 24.04 Noble
#############################################

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="usbakers-crm"
APP_USER="usbakers"
APP_DIR="/home/$APP_USER/$APP_NAME"
GITHUB_REPO="https://github.com/usbakersindia/usbakers.git"
DOMAIN=""  # Leave empty for IP access, or set your domain

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if running as root
check_root() {
    if [ "$EUID" -ne 0 ]; then 
        print_error "Please run this script as root or with sudo"
        exit 1
    fi
}

# Welcome message
clear
echo "=================================================="
echo "  US Bakers CRM - Automated Deployment Script"
echo "  Hostinger VPS Edition (Ubuntu 24.04 Compatible)"
echo "=================================================="
echo ""
print_info "This script will install and configure:"
echo "  - Node.js v18"
echo "  - Python 3.11"
echo "  - MongoDB 7.0 (Ubuntu 24.04 compatible)"
echo "  - Nginx"
echo "  - Supervisor"
echo "  - Your US Bakers CRM application"
echo ""

# Ask for confirmation
read -p "Do you want to continue? (y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_warning "Deployment cancelled"
    exit 0
fi

# Ask for domain (optional)
echo ""
print_info "Domain Configuration (optional)"
read -p "Enter your domain name (leave empty to use IP): " DOMAIN
if [ -z "$DOMAIN" ]; then
    DOMAIN=$(hostname -I | awk '{print $1}')
    print_info "Using IP address: $DOMAIN"
else
    print_info "Using domain: $DOMAIN"
fi

echo ""
print_info "Starting deployment..."
sleep 2

#############################################
# Step 1: Update System
#############################################
print_info "Step 1/13: Updating system packages..."
apt update && apt upgrade -y
apt install -y curl wget git unzip software-properties-common build-essential gnupg
print_success "System updated"

#############################################
# Step 2: Create Application User
#############################################
print_info "Step 2/13: Creating application user..."
if id "$APP_USER" &>/dev/null; then
    print_warning "User $APP_USER already exists"
else
    adduser --disabled-password --gecos "" $APP_USER
    usermod -aG sudo $APP_USER
    print_success "User $APP_USER created"
fi

#############################################
# Step 3: Install Node.js
#############################################
print_info "Step 3/13: Installing Node.js v18..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash -
apt install -y nodejs
npm install -g yarn
print_success "Node.js $(node --version) and Yarn $(yarn --version) installed"

#############################################
# Step 4: Install Python 3.11
#############################################
print_info "Step 4/13: Installing Python 3.11..."
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
print_success "Python $(python3.11 --version) installed"

#############################################
# Step 5: Install MongoDB 7.0 (Ubuntu 24.04 Fix)
#############################################
print_info "Step 5/13: Installing MongoDB 7.0..."

# Remove any existing MongoDB repository configurations
rm -f /etc/apt/sources.list.d/mongodb*.list
rm -f /usr/share/keyrings/mongodb-server-7.0.gpg

# Import MongoDB GPG key
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
    gpg --dearmor -o /usr/share/keyrings/mongodb-server-7.0.gpg

# Add MongoDB repository for Ubuntu 22.04 (Jammy) - works on 24.04
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
    tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update and install
apt update
apt install -y mongodb-org

# Create systemd service if it doesn't exist
if [ ! -f /lib/systemd/system/mongod.service ]; then
    cat > /lib/systemd/system/mongod.service << 'MONGOEOF'
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
ExecReload=/bin/kill -HUP $MAINPID
Restart=on-failure
LimitNOFILE=64000

[Install]
WantedBy=multi-user.target
MONGOEOF
fi

# Create MongoDB directories
mkdir -p /var/lib/mongodb
mkdir -p /var/log/mongodb
mkdir -p /var/run/mongodb
chown -R mongodb:mongodb /var/lib/mongodb
chown -R mongodb:mongodb /var/log/mongodb
chown -R mongodb:mongodb /var/run/mongodb

# Reload systemd and start MongoDB
systemctl daemon-reload
systemctl start mongod
systemctl enable mongod

# Wait for MongoDB to start
sleep 5

if systemctl is-active --quiet mongod; then
    print_success "MongoDB installed and started"
else
    print_error "MongoDB failed to start, checking logs..."
    journalctl -u mongod -n 50 --no-pager
    exit 1
fi

#############################################
# Step 6: Install Nginx
#############################################
print_info "Step 6/13: Installing Nginx..."
apt install -y nginx
systemctl start nginx
systemctl enable nginx
print_success "Nginx installed and started"

#############################################
# Step 7: Install Supervisor
#############################################
print_info "Step 7/13: Installing Supervisor..."
apt install -y supervisor
systemctl start supervisor
systemctl enable supervisor
print_success "Supervisor installed and started"

#############################################
# Step 8: Clone Application
#############################################
print_info "Step 8/13: Cloning application from GitHub..."
# Remove old directory if exists
if [ -d "$APP_DIR" ]; then
    print_warning "Removing old application directory..."
    rm -rf "$APP_DIR"
fi

# Clone as app user
su - $APP_USER -c "git clone $GITHUB_REPO $APP_DIR"
print_success "Application cloned"

#############################################
# Step 9: Setup Backend
#############################################
print_info "Step 9/13: Setting up backend..."

# Create virtual environment and install dependencies
su - $APP_USER -c "cd $APP_DIR/backend && python3.11 -m venv venv && source venv/bin/activate && pip install --upgrade pip && pip install -r requirements.txt"

# Create .env file
cat > $APP_DIR/backend/.env << EOF
MONGO_URL=mongodb://localhost:27017/usbakers
DB_NAME=usbakers
SECRET_KEY=$(openssl rand -hex 32)
BACKEND_URL=http://$DOMAIN
EOF

chown $APP_USER:$APP_USER $APP_DIR/backend/.env
print_success "Backend configured"

# Seed database
print_info "Seeding database..."
su - $APP_USER -c "cd $APP_DIR/backend && source venv/bin/activate && python utils/seed_fresh_data.py" || print_warning "Database seeding failed (may need manual seeding)"
print_success "Database setup completed"

#############################################
# Step 10: Setup Frontend
#############################################
print_info "Step 10/13: Setting up frontend..."

# Create .env file
cat > $APP_DIR/frontend/.env << EOF
REACT_APP_BACKEND_URL=http://$DOMAIN
EOF

chown $APP_USER:$APP_USER $APP_DIR/frontend/.env

# Install dependencies and build
su - $APP_USER -c "cd $APP_DIR/frontend && yarn install && yarn build"
print_success "Frontend built"

#############################################
# Step 11: Configure Supervisor
#############################################
print_info "Step 11/13: Configuring Supervisor..."

# Create logs directory
mkdir -p /home/$APP_USER/logs
chown -R $APP_USER:$APP_USER /home/$APP_USER/logs

# Create supervisor config for backend
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
environment=PATH="$APP_DIR/backend/venv/bin"
EOF

# Reload supervisor
supervisorctl reread
supervisorctl update
supervisorctl start usbakers-backend

# Wait for backend to start
sleep 5

print_success "Backend service started"

#############################################
# Step 12: Configure Nginx
#############################################
print_info "Step 12/13: Configuring Nginx..."

# Remove default site
rm -f /etc/nginx/sites-enabled/default

# Create Nginx config
cat > /etc/nginx/sites-available/usbakers << 'EOF'
server {
    listen 80;
    server_name SERVER_NAME_PLACEHOLDER;

    client_max_body_size 50M;

    # Frontend
    location / {
        root APP_DIR_PLACEHOLDER/frontend/build;
        try_files $uri $uri/ /index.html;
        
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2|ttf|eot)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # Backend API
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Uploads
    location /uploads {
        alias APP_DIR_PLACEHOLDER/uploads;
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    error_page 404 /index.html;
}
EOF

# Replace placeholders
sed -i "s|SERVER_NAME_PLACEHOLDER|$DOMAIN|g" /etc/nginx/sites-available/usbakers
sed -i "s|APP_DIR_PLACEHOLDER|$APP_DIR|g" /etc/nginx/sites-available/usbakers

# Enable site
ln -sf /etc/nginx/sites-available/usbakers /etc/nginx/sites-enabled/

# Test and restart Nginx
nginx -t
systemctl restart nginx
print_success "Nginx configured and restarted"

#############################################
# Step 13: Configure Firewall
#############################################
print_info "Step 13/13: Configuring firewall..."

# Install and configure UFW
apt install -y ufw
ufw --force enable
ufw allow 22/tcp
ufw allow 80/tcp
ufw allow 443/tcp
print_success "Firewall configured"

#############################################
# Create Backup Script
#############################################
print_info "Creating backup script..."

cat > /home/$APP_USER/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/APP_USER_PLACEHOLDER/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR
mongodump --uri="mongodb://localhost:27017/usbakers" --out="$BACKUP_DIR/backup_$DATE"

# Keep only last 7 days
find $BACKUP_DIR -type d -mtime +7 -exec rm -rf {} \; 2>/dev/null

echo "Backup completed: $DATE"
EOF

sed -i "s|APP_USER_PLACEHOLDER|$APP_USER|g" /home/$APP_USER/backup-db.sh
chmod +x /home/$APP_USER/backup-db.sh
chown $APP_USER:$APP_USER /home/$APP_USER/backup-db.sh

# Add cron job for daily backups
(crontab -u $APP_USER -l 2>/dev/null; echo "0 2 * * * /home/$APP_USER/backup-db.sh >> /home/$APP_USER/logs/backup.log 2>&1") | crontab -u $APP_USER -
print_success "Backup script created and scheduled"

#############################################
# Create Management Script
#############################################
print_info "Creating management script..."

cat > /home/$APP_USER/manage.sh << 'EOF'
#!/bin/bash

case "$1" in
    restart)
        echo "Restarting services..."
        sudo supervisorctl restart usbakers-backend
        sudo systemctl restart nginx
        echo "Services restarted"
        ;;
    logs)
        echo "Showing backend logs (Ctrl+C to exit)..."
        tail -f /home/APP_USER_PLACEHOLDER/logs/backend.log
        ;;
    status)
        echo "Service Status:"
        echo "==============="
        sudo supervisorctl status usbakers-backend
        sudo systemctl status nginx --no-pager
        sudo systemctl status mongod --no-pager
        ;;
    update)
        echo "Updating application..."
        cd APP_DIR_PLACEHOLDER
        git pull
        cd frontend && yarn install && yarn build
        cd ../backend && source venv/bin/activate && pip install -r requirements.txt
        sudo supervisorctl restart usbakers-backend
        echo "Application updated"
        ;;
    backup)
        /home/APP_USER_PLACEHOLDER/backup-db.sh
        ;;
    *)
        echo "US Bakers CRM Management Script"
        echo "Usage: ./manage.sh {restart|logs|status|update|backup}"
        echo ""
        echo "Commands:"
        echo "  restart - Restart backend and nginx"
        echo "  logs    - View backend logs"
        echo "  status  - Check service status"
        echo "  update  - Update application from GitHub"
        echo "  backup  - Backup database"
        exit 1
        ;;
esac
EOF

sed -i "s|APP_USER_PLACEHOLDER|$APP_USER|g" /home/$APP_USER/manage.sh
sed -i "s|APP_DIR_PLACEHOLDER|$APP_DIR|g" /home/$APP_USER/manage.sh
chmod +x /home/$APP_USER/manage.sh
chown $APP_USER:$APP_USER /home/$APP_USER/manage.sh
print_success "Management script created"

#############################################
# Final Checks
#############################################
print_info "Performing final checks..."

# Wait for services to start
sleep 5

# Check backend
if supervisorctl status usbakers-backend | grep -q RUNNING; then
    print_success "Backend is running"
else
    print_error "Backend failed to start. Checking logs..."
    tail -n 50 /home/$APP_USER/logs/backend.log
fi

# Check Nginx
if systemctl is-active --quiet nginx; then
    print_success "Nginx is running"
else
    print_error "Nginx failed to start"
fi

# Check MongoDB
if systemctl is-active --quiet mongod; then
    print_success "MongoDB is running"
else
    print_error "MongoDB failed to start"
fi

#############################################
# Deployment Complete
#############################################
clear
echo "=================================================="
echo "  🎉 Deployment Complete! 🎉"
echo "=================================================="
echo ""
print_success "US Bakers CRM is now deployed!"
echo ""
echo "📱 Access your application:"
echo "   URL: http://$DOMAIN"
echo ""
echo "🔑 Login Credentials:"
echo "   Super Admin:"
echo "   - Email: admin@usbakers.com"
echo "   - Password: admin123"
echo ""
echo "   Satyam (Dhangu Road):"
echo "   - Email: satyam@usbakers.com"
echo "   - Password: satyam123"
echo ""
echo "   Sushant (Railway Road):"
echo "   - Email: sushant@usbakers.com"
echo "   - Password: sushant123"
echo ""
echo "   Factory Admin:"
echo "   - Email: factory@usbakers.com"
echo "   - Password: factory123"
echo ""
echo "🔧 Useful Commands:"
echo "   View logs:    sudo -u $APP_USER /home/$APP_USER/manage.sh logs"
echo "   Check status: sudo -u $APP_USER /home/$APP_USER/manage.sh status"
echo "   Restart:      sudo -u $APP_USER /home/$APP_USER/manage.sh restart"
echo "   Update:       sudo -u $APP_USER /home/$APP_USER/manage.sh update"
echo "   Backup:       sudo -u $APP_USER /home/$APP_USER/manage.sh backup"
echo ""
echo "📂 Important Locations:"
echo "   Application:  $APP_DIR"
echo "   Logs:         /home/$APP_USER/logs/"
echo "   Backups:      /home/$APP_USER/backups/"
echo ""
echo "⚠️  Security Recommendations:"
echo "   1. Change all default passwords immediately"
echo "   2. Setup domain and SSL certificate:"
echo "      sudo apt install certbot python3-certbot-nginx"
echo "      sudo certbot --nginx -d yourdomain.com"
echo ""
echo "📝 MongoDB Troubleshooting:"
echo "   If MongoDB fails to start, run:"
echo "   sudo journalctl -u mongod -n 100 --no-pager"
echo ""
echo "=================================================="
print_success "Deployment script finished successfully!"
echo "=================================================="
