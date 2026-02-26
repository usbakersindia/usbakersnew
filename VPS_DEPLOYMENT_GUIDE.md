# 🚀 Complete VPS Deployment Guide - US Bakers CRM

## 📋 Prerequisites

### What You Need:
- ✅ VPS Server (Ubuntu 20.04/22.04 recommended)
- ✅ Domain name (e.g., usbakers.tech)
- ✅ Root/sudo access to VPS
- ✅ SSH client (Terminal on Mac/Linux, PuTTY on Windows)

### Recommended VPS Specs:
- **Minimum:** 2 GB RAM, 2 CPU cores, 50 GB storage
- **Recommended:** 4 GB RAM, 2 CPU cores, 80 GB storage
- **Providers:** DigitalOcean, AWS Lightsail, Linode, Vultr, Hetzner

---

## 🔧 Step 1: Initial VPS Setup

### 1.1 Connect to Your VPS
```bash
ssh root@your_vps_ip
# Or if you have a user:
ssh username@your_vps_ip
```

### 1.2 Update System
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.3 Create a New User (if using root)
```bash
adduser usbakers
usermod -aG sudo usbakers
su - usbakers
```

### 1.4 Set Up Firewall
```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
sudo ufw status
```

---

## 📦 Step 2: Install Required Software

### 2.1 Install Node.js (v18 LTS)
```bash
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs
node --version  # Should show v18.x
npm --version
```

### 2.2 Install Python 3.11
```bash
sudo apt install -y python3.11 python3.11-venv python3-pip
python3.11 --version
```

### 2.3 Install MongoDB
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Create list file for MongoDB
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu $(lsb_release -cs)/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Install MongoDB
sudo apt update
sudo apt install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod
sudo systemctl status mongod
```

### 2.4 Install Nginx (Web Server)
```bash
sudo apt install -y nginx
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 2.5 Install PM2 (Process Manager)
```bash
sudo npm install -g pm2
sudo npm install -g yarn
```

### 2.6 Install Certbot (SSL Certificate)
```bash
sudo apt install -y certbot python3-certbot-nginx
```

---

## 📂 Step 3: Deploy Your Application

### 3.1 Create Application Directory
```bash
sudo mkdir -p /var/www/usbakers
sudo chown -R $USER:$USER /var/www/usbakers
cd /var/www/usbakers
```

### 3.2 Clone/Upload Your Code

**Option A: From Git Repository**
```bash
# Install git if not present
sudo apt install -y git

# Clone your repository
git clone https://github.com/yourusername/usbakers-crm.git .
```

**Option B: Upload via SCP from Local Machine**
```bash
# From your LOCAL machine (not VPS):
# Zip your project first
cd /path/to/your/project
tar -czf usbakers.tar.gz backend frontend

# Upload to VPS
scp usbakers.tar.gz username@your_vps_ip:/var/www/usbakers/

# On VPS, extract
cd /var/www/usbakers
tar -xzf usbakers.tar.gz
rm usbakers.tar.gz
```

### 3.3 Set Up Backend

```bash
cd /var/www/usbakers/backend

# Create virtual environment
python3.11 -m venv venv
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Create .env file
nano .env
```

**Backend .env file:**
```env
MONGO_URL=mongodb://localhost:27017
DB_NAME=usbakers_production
CORS_ORIGINS=https://www.usbakers.tech,https://usbakers.tech
SECRET_KEY=your-super-secret-key-change-this-in-production-2024
BACKEND_URL=https://www.usbakers.tech
AISENSY_API_KEY=your_aisensy_jwt_token_here
AISENSY_API_ENDPOINT=https://backend.aisensy.com/campaign/t1/api/v2
```

**Generate a secure SECRET_KEY:**
```bash
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 3.4 Set Up Frontend

```bash
cd /var/www/usbakers/frontend

# Install dependencies
yarn install
# Or: npm install

# Create .env file
nano .env
```

**Frontend .env file:**
```env
REACT_APP_BACKEND_URL=https://www.usbakers.tech
```

**Build the frontend:**
```bash
yarn build
# Or: npm run build
```

This creates an optimized production build in `/var/www/usbakers/frontend/build/`

---

## 🔐 Step 4: Configure MongoDB Security

### 4.1 Create Database and Admin User
```bash
mongosh

# In MongoDB shell:
use usbakers_production

# Create admin user for the database
db.createUser({
  user: "usbakers_admin",
  pwd: "your_strong_password_here",
  roles: [{ role: "readWrite", db: "usbakers_production" }]
})

# Exit
exit
```

### 4.2 Enable MongoDB Authentication
```bash
sudo nano /etc/mongod.conf
```

Add/modify:
```yaml
security:
  authorization: enabled

net:
  bindIp: 127.0.0.1
```

Restart MongoDB:
```bash
sudo systemctl restart mongod
```

### 4.3 Update Backend .env with Credentials
```bash
nano /var/www/usbakers/backend/.env
```

Update:
```env
MONGO_URL=mongodb://usbakers_admin:your_strong_password_here@localhost:27017/usbakers_production?authSource=usbakers_production
```

---

## 🚀 Step 5: Start Backend with PM2

### 5.1 Create PM2 Ecosystem File
```bash
cd /var/www/usbakers
nano ecosystem.config.js
```

**ecosystem.config.js:**
```javascript
module.exports = {
  apps: [{
    name: 'usbakers-backend',
    script: '/var/www/usbakers/backend/venv/bin/python',
    args: '-m uvicorn server:app --host 0.0.0.0 --port 8001',
    cwd: '/var/www/usbakers/backend',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

### 5.2 Start the Backend
```bash
cd /var/www/usbakers
pm2 start ecosystem.config.js
pm2 save
pm2 startup
# Follow the command it gives you (copy-paste and run it)
```

### 5.3 Check Backend Status
```bash
pm2 status
pm2 logs usbakers-backend
```

Test backend locally:
```bash
curl http://localhost:8001/health
```

---

## 🌐 Step 6: Configure Nginx

### 6.1 Create Nginx Configuration
```bash
sudo nano /etc/nginx/sites-available/usbakers
```

**Nginx Configuration:**
```nginx
server {
    listen 80;
    server_name www.usbakers.tech usbakers.tech;

    # Frontend (React build)
    root /var/www/usbakers/frontend/build;
    index index.html;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_types text/plain text/css text/xml text/javascript application/x-javascript application/xml+rss application/javascript application/json;

    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # Backend API routes
    location /api {
        proxy_pass http://127.0.0.1:8001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Static file uploads
    location /uploads {
        alias /var/www/usbakers/backend/uploads;
        autoindex off;
    }

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header Referrer-Policy "no-referrer-when-downgrade" always;

    # Logs
    access_log /var/log/nginx/usbakers_access.log;
    error_log /var/log/nginx/usbakers_error.log;
}
```

### 6.2 Enable the Site
```bash
# Create symbolic link
sudo ln -s /etc/nginx/sites-available/usbakers /etc/nginx/sites-enabled/

# Remove default site
sudo rm /etc/nginx/sites-enabled/default

# Test configuration
sudo nginx -t

# Reload Nginx
sudo systemctl reload nginx
```

---

## 🔒 Step 7: Set Up SSL Certificate (HTTPS)

### 7.1 Point Your Domain to VPS
**In your domain registrar (Hostinger, GoDaddy, etc.):**

**Add these DNS records:**
```
Type: A Record
Host: @
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600

Type: A Record
Host: www
Value: YOUR_VPS_IP_ADDRESS
TTL: 3600
```

**Wait 5-30 minutes for DNS propagation.**

Check DNS:
```bash
nslookup www.usbakers.tech
nslookup usbakers.tech
```

### 7.2 Get SSL Certificate
```bash
sudo certbot --nginx -d usbakers.tech -d www.usbakers.tech

# Follow prompts:
# - Enter your email
# - Agree to terms
# - Choose: Redirect HTTP to HTTPS (option 2)
```

### 7.3 Auto-Renewal
```bash
# Test auto-renewal
sudo certbot renew --dry-run

# Check renewal timer
sudo systemctl status certbot.timer
```

Your site is now available at: **https://www.usbakers.tech** 🎉

---

## 🔄 Step 8: Initialize Super Admin

### 8.1 Create Super Admin via Backend Script
```bash
cd /var/www/usbakers/backend
source venv/bin/activate
python3 -c "
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
import asyncio
import os

pwd_context = CryptContext(schemes=['bcrypt'], deprecated='auto')

async def create_admin():
    client = AsyncIOMotorClient('YOUR_MONGO_URL_HERE')
    db = client['usbakers_production']
    
    existing = await db.users.find_one({'email': 'admin@usbakers.com'})
    if not existing:
        await db.users.insert_one({
            'id': '1',
            'email': 'admin@usbakers.com',
            'hashed_password': pwd_context.hash('admin123'),
            'name': 'Super Admin',
            'role': 'super_admin',
            'permissions': ['all'],
            'incentive_percentage': 0.0
        })
        print('✅ Super Admin created')
    else:
        print('⚠️ Admin already exists')
    
    client.close()

asyncio.run(create_admin())
"
```

**Or manually via mongosh:**
```bash
mongosh -u usbakers_admin -p your_strong_password_here --authenticationDatabase usbakers_production

use usbakers_production

db.users.insertOne({
  "id": "1",
  "email": "admin@usbakers.com",
  "hashed_password": "$2b$12$...", // Generate this with bcrypt
  "name": "Super Admin",
  "role": "super_admin",
  "permissions": ["all"],
  "incentive_percentage": 0.0
})
```

---

## 🎯 Step 9: Verify Deployment

### 9.1 Check All Services
```bash
# MongoDB
sudo systemctl status mongod

# Backend (PM2)
pm2 status
pm2 logs usbakers-backend --lines 50

# Nginx
sudo systemctl status nginx
sudo nginx -t
```

### 9.2 Check Logs
```bash
# Backend logs
pm2 logs usbakers-backend

# Nginx logs
sudo tail -f /var/log/nginx/usbakers_access.log
sudo tail -f /var/log/nginx/usbakers_error.log
```

### 9.3 Test the Application
1. **Open browser:** https://www.usbakers.tech
2. **Login:** admin@usbakers.com / admin123
3. **Test:** Create order, add outlet, etc.

---

## 🔄 Step 10: Update & Maintenance

### 10.1 Update Application Code

```bash
cd /var/www/usbakers

# Pull latest code (if using Git)
git pull origin main

# Or upload new files via SCP

# Update Backend
cd backend
source venv/bin/activate
pip install -r requirements.txt
cd ..

# Rebuild Frontend
cd frontend
yarn install
yarn build
cd ..

# Restart Backend
pm2 restart usbakers-backend

# Reload Nginx
sudo systemctl reload nginx
```

### 10.2 Backup Database

**Create backup script:**
```bash
nano /home/usbakers/backup.sh
```

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/usbakers/backups"
mkdir -p $BACKUP_DIR

# Backup MongoDB
mongodump --uri="mongodb://usbakers_admin:password@localhost:27017/usbakers_production?authSource=usbakers_production" --out=$BACKUP_DIR/mongo_$DATE

# Backup uploads
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz /var/www/usbakers/backend/uploads

# Delete backups older than 7 days
find $BACKUP_DIR -type f -mtime +7 -delete

echo "Backup completed: $DATE"
```

Make executable:
```bash
chmod +x /home/usbakers/backup.sh
```

**Schedule daily backup (cron):**
```bash
crontab -e

# Add this line (runs daily at 2 AM):
0 2 * * * /home/usbakers/backup.sh >> /home/usbakers/backup.log 2>&1
```

### 10.3 Monitor Application

```bash
# CPU/Memory usage
pm2 monit

# Disk usage
df -h

# Check logs
pm2 logs --lines 100
```

---

## 🐛 Troubleshooting

### Issue: "502 Bad Gateway"
```bash
# Check if backend is running
pm2 status

# Check backend logs
pm2 logs usbakers-backend

# Restart backend
pm2 restart usbakers-backend

# Check Nginx error log
sudo tail -f /var/log/nginx/usbakers_error.log
```

### Issue: "Cannot connect to MongoDB"
```bash
# Check MongoDB status
sudo systemctl status mongod

# Check MongoDB logs
sudo tail -f /var/log/mongodb/mongod.log

# Restart MongoDB
sudo systemctl restart mongod
```

### Issue: SSL Certificate Issues
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Check certificate status
sudo certbot certificates
```

### Issue: Frontend not loading
```bash
# Check if build exists
ls -la /var/www/usbakers/frontend/build/

# Rebuild frontend
cd /var/www/usbakers/frontend
yarn build

# Check Nginx config
sudo nginx -t
sudo systemctl reload nginx
```

---

## 🔐 Security Best Practices

### 1. Change Default Passwords
```bash
# Update .env files
nano /var/www/usbakers/backend/.env
# Change SECRET_KEY, MongoDB password

# Update Super Admin password via app
```

### 2. Set Up Firewall Rules
```bash
sudo ufw status
sudo ufw deny from <suspicious_ip>
```

### 3. Enable Fail2Ban (Brute Force Protection)
```bash
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 4. Regular Updates
```bash
# Weekly system updates
sudo apt update && sudo apt upgrade -y

# Monthly security audit
sudo apt install -y unattended-upgrades
```

---

## 📊 Performance Optimization

### 1. Enable Redis Caching (Optional)
```bash
sudo apt install -y redis-server
sudo systemctl enable redis-server
```

### 2. PM2 Clustering (For high traffic)
```javascript
// In ecosystem.config.js
instances: 'max',  // Use all CPU cores
exec_mode: 'cluster'
```

### 3. Nginx Caching
Add to Nginx config:
```nginx
location ~* \.(jpg|jpeg|png|gif|ico|css|js)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```

---

## ✅ Deployment Checklist

- [ ] VPS provisioned with Ubuntu 20.04/22.04
- [ ] Domain DNS records pointing to VPS IP
- [ ] All software installed (Node, Python, MongoDB, Nginx)
- [ ] Application code uploaded to `/var/www/usbakers`
- [ ] Backend .env configured with production values
- [ ] Frontend .env configured with domain URL
- [ ] MongoDB secured with authentication
- [ ] Backend running via PM2
- [ ] Frontend built and served by Nginx
- [ ] Nginx configured with correct proxy settings
- [ ] SSL certificate installed via Certbot
- [ ] HTTPS redirect enabled
- [ ] Super Admin account created
- [ ] Firewall rules configured
- [ ] Daily backup cron job set up
- [ ] Application tested end-to-end
- [ ] Monitoring set up (PM2, logs)

---

## 🎉 You're Live!

Your US Bakers CRM is now deployed at:
- **Production URL:** https://www.usbakers.tech
- **Admin Login:** admin@usbakers.com / admin123

### Next Steps:
1. Change default admin password
2. Create outlets and users
3. Configure WhatsApp templates (with active AiSensy plan)
4. Start taking orders!

---

## 📞 Quick Reference Commands

```bash
# Start/Stop Services
pm2 start usbakers-backend
pm2 stop usbakers-backend
pm2 restart usbakers-backend
sudo systemctl restart nginx
sudo systemctl restart mongod

# Logs
pm2 logs usbakers-backend
sudo tail -f /var/log/nginx/usbakers_error.log
sudo tail -f /var/log/mongodb/mongod.log

# Status
pm2 status
pm2 monit
sudo systemctl status nginx
sudo systemctl status mongod

# Update App
cd /var/www/usbakers && git pull
pm2 restart usbakers-backend
cd frontend && yarn build && cd ..
sudo systemctl reload nginx
```

---

**Deployment Guide Version:** 1.0  
**Last Updated:** February 26, 2026  
**Support:** For issues, check logs first, then troubleshooting section above.
