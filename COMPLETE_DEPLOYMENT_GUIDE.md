# 🚀 Complete Deployment Guide - US Bakers CRM

## 📋 Prerequisites Checklist

Before starting deployment, ensure you have:

- ✅ Ubuntu VPS (20.04 or 22.04) with root/sudo access
- ✅ Domain name pointed to your VPS IP (e.g., crm.usbakers.com)
- ✅ Minimum 2GB RAM, 2 CPU cores, 20GB storage
- ✅ SSH access to your server

---

## 🎯 Deployment Overview

This guide will install and configure:
1. **MongoDB** - Database
2. **Node.js & Yarn** - Frontend dependencies
3. **Python 3.11+** - Backend runtime
4. **Nginx** - Web server & reverse proxy
5. **Supervisor** - Process manager
6. **SSL Certificate** (Let's Encrypt) - HTTPS

---

## 📦 Step 1: Initial Server Setup

### 1.1 Connect to Your VPS

```bash
ssh root@your-server-ip
```

### 1.2 Update System Packages

```bash
apt update && apt upgrade -y
```

### 1.3 Install Essential Tools

```bash
apt install -y git curl wget software-properties-common build-essential
```

---

## 🗄️ Step 2: Install MongoDB

### 2.1 Import MongoDB GPG Key

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
```

### 2.2 Add MongoDB Repository

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

### 2.3 Install MongoDB

```bash
apt update
apt install -y mongodb-org
```

### 2.4 Start and Enable MongoDB

```bash
systemctl start mongod
systemctl enable mongod
systemctl status mongod
```

**Verify MongoDB is running:**
```bash
mongosh --eval "db.version()"
```

---

## 🟢 Step 3: Install Node.js & Yarn

### 3.1 Install Node.js (v20 LTS)

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
```

### 3.2 Install Yarn

```bash
npm install -g yarn
```

### 3.3 Verify Installation

```bash
node --version   # Should show v20.x.x
yarn --version   # Should show 1.x.x or higher
```

---

## 🐍 Step 4: Install Python & Pip

### 4.1 Install Python 3.11

```bash
apt install -y python3.11 python3.11-venv python3-pip
```

### 4.2 Verify Installation

```bash
python3 --version  # Should show 3.11.x
pip3 --version
```

---

## 🌐 Step 5: Install Nginx

### 5.1 Install Nginx

```bash
apt install -y nginx
```

### 5.2 Start and Enable Nginx

```bash
systemctl start nginx
systemctl enable nginx
systemctl status nginx
```

---

## 👤 Step 6: Create Application User

### 6.1 Create User

```bash
useradd -m -s /bin/bash usbakers
```

### 6.2 Add to Sudo Group (Optional)

```bash
usermod -aG sudo usbakers
```

---

## 📂 Step 7: Clone Your Repository

### 7.1 Switch to Application User

```bash
su - usbakers
```

### 7.2 Clone Repository

```bash
cd /home/usbakers
git clone https://github.com/usbakersindia/usbakers.git usbakers-crm
cd usbakers-crm
```

### 7.3 Exit Back to Root

```bash
exit
```

---

## ⚙️ Step 8: Run Automated Setup Script

### 8.1 Make Script Executable

```bash
cd /home/usbakers/usbakers-crm
chmod +x setup-fresh.sh
```

### 8.2 Run Setup Script

```bash
sudo ./setup-fresh.sh
```

**When prompted, provide:**
- **Domain**: `crm.usbakers.com` (or your domain)
- **MongoDB URL**: Press Enter for default `mongodb://localhost:27017/usbakers_crm`
- **Database Name**: Press Enter for default `usbakers_crm`
- **MSG91 Keys**: Press Enter to skip (can add later)

**The script will automatically:**
- ✅ Create backend and frontend `.env` files
- ✅ Generate secure JWT secret
- ✅ Create/update supervisor configurations
- ✅ Create Python virtual environment
- ✅ Install all backend dependencies
- ✅ Install all frontend dependencies
- ✅ Build production frontend
- ✅ Seed database with test data
- ✅ Start services

---

## 🔧 Step 9: Configure Nginx Reverse Proxy

### 9.1 Create Nginx Configuration

```bash
nano /etc/nginx/sites-available/usbakers-crm
```

**Paste this configuration:**

```nginx
# Backend API server
upstream backend {
    server 127.0.0.1:8001;
}

# Frontend React server
upstream frontend {
    server 127.0.0.1:3000;
}

server {
    listen 80;
    server_name crm.usbakers.com;  # Replace with your domain

    # Redirect HTTP to HTTPS (will be enabled after SSL)
    # return 301 https://$server_name$request_uri;

    # Client max body size (for file uploads)
    client_max_body_size 50M;

    # API Routes - Proxy to Backend
    location /api/ {
        proxy_pass http://backend;
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

    # Frontend - Proxy to React Dev Server or Serve Static Build
    location / {
        proxy_pass http://frontend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Optional: Serve static files directly (if using production build)
    # location / {
    #     root /home/usbakers/usbakers-crm/frontend/build;
    #     try_files $uri $uri/ /index.html;
    # }

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

### 9.2 Enable Site

```bash
ln -s /etc/nginx/sites-available/usbakers-crm /etc/nginx/sites-enabled/
```

### 9.3 Remove Default Site

```bash
rm /etc/nginx/sites-enabled/default
```

### 9.4 Test Nginx Configuration

```bash
nginx -t
```

### 9.5 Reload Nginx

```bash
systemctl reload nginx
```

---

## 🔒 Step 10: Install SSL Certificate (HTTPS)

### 10.1 Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

### 10.2 Obtain SSL Certificate

```bash
certbot --nginx -d crm.usbakers.com
```

**Follow the prompts:**
- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (option 2)

### 10.3 Auto-Renewal Setup

Certbot automatically sets up renewal. Verify with:

```bash
certbot renew --dry-run
```

---

## 🔄 Step 11: Configure Supervisor

Supervisor configurations should already be created by the setup script. Verify:

### 11.1 Check Supervisor Configs

```bash
ls -la /etc/supervisor/conf.d/ | grep usbakers
```

You should see:
- `usbakers-backend.conf`
- `usbakers-frontend.conf`

### 11.2 Reload Supervisor

```bash
supervisorctl reread
supervisorctl update
```

### 11.3 Check Service Status

```bash
supervisorctl status
```

**Expected output:**
```
usbakers-backend    RUNNING   pid 1234, uptime 0:01:23
usbakers-frontend   RUNNING   pid 1235, uptime 0:01:23
```

### 11.4 Restart Services (if needed)

```bash
supervisorctl restart usbakers-backend
supervisorctl restart usbakers-frontend
```

---

## ✅ Step 12: Verify Deployment

### 12.1 Check All Services

```bash
# MongoDB
systemctl status mongod

# Nginx
systemctl status nginx

# Application
supervisorctl status
```

### 12.2 Test Backend API

```bash
curl http://localhost:8001/api/health
```

**Expected response:** `{"status": "healthy"}` or similar

### 12.3 Test Frontend

```bash
curl http://localhost:3000
```

**Expected response:** HTML content of React app

### 12.4 Access Your Application

Open your browser and visit:
```
https://crm.usbakers.com
```

### 12.5 Login with Test Credentials

| Role | Email | Password |
|------|-------|----------|
| **Super Admin** | admin@usbakers.com | admin123 |
| **Dhangu Road** | satyam@usbakers.com | satyam123 |
| **Railway Road** | sushant@usbakers.com | sushant123 |
| **Factory** | factory@usbakers.com | factory123 |

---

## 🐛 Troubleshooting

### Issue 1: Services Not Starting

**Check logs:**
```bash
# Backend logs
sudo tail -f /var/log/supervisor/backend.err.log

# Frontend logs
sudo tail -f /var/log/supervisor/frontend.err.log
```

**Common fixes:**
```bash
# Restart services
supervisorctl restart usbakers-backend usbakers-frontend

# Check if ports are in use
netstat -tlnp | grep -E '8001|3000'
```

### Issue 2: MongoDB Connection Failed

**Check MongoDB status:**
```bash
systemctl status mongod
sudo tail -f /var/log/mongodb/mongod.log
```

**Start MongoDB:**
```bash
systemctl start mongod
```

### Issue 3: Nginx 502 Bad Gateway

**Cause:** Backend/Frontend not running

**Fix:**
```bash
supervisorctl status
supervisorctl restart usbakers-backend usbakers-frontend
```

### Issue 4: Permission Denied Errors

**Fix ownership:**
```bash
chown -R usbakers:usbakers /home/usbakers/usbakers-crm
```

### Issue 5: Port Already in Use

**Find process using port:**
```bash
lsof -i :8001  # Backend
lsof -i :3000  # Frontend
```

**Kill process:**
```bash
kill -9 <PID>
supervisorctl restart usbakers-backend usbakers-frontend
```

### Issue 6: Frontend Build Fails

**Clear cache and rebuild:**
```bash
cd /home/usbakers/usbakers-crm/frontend
rm -rf node_modules yarn.lock
yarn install
yarn build
```

### Issue 7: Database Connection Timeout

**Check MongoDB is listening:**
```bash
netstat -tlnp | grep 27017
```

**Update MongoDB bind IP (if needed):**
```bash
nano /etc/mongod.conf
# Change bindIp: 127.0.0.1
systemctl restart mongod
```

---

## 🔄 Post-Deployment Updates

When you push new code to GitHub, use the update script:

```bash
cd /home/usbakers/usbakers-crm
git pull origin main
sudo supervisorctl restart usbakers-backend usbakers-frontend
```

Or use the automated update script:

```bash
cd /home/usbakers/usbakers-crm
./update-vps.sh
```

---

## 📊 Monitoring & Maintenance

### View Application Logs

```bash
# Real-time backend logs
sudo tail -f /var/log/supervisor/backend.out.log

# Real-time frontend logs
sudo tail -f /var/log/supervisor/frontend.out.log

# Error logs
sudo tail -f /var/log/supervisor/backend.err.log
sudo tail -f /var/log/supervisor/frontend.err.log
```

### Check Resource Usage

```bash
# CPU and Memory
htop

# Disk usage
df -h

# MongoDB stats
mongosh --eval "db.stats()"
```

### Backup Database

```bash
# Create backup
mongodump --db usbakers_crm --out /home/usbakers/backups/$(date +%Y%m%d)

# Restore backup
mongorestore --db usbakers_crm /home/usbakers/backups/20250307
```

---

## 🔐 Security Hardening (Optional but Recommended)

### 1. Configure Firewall

```bash
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw enable
ufw status
```

### 2. Disable Root SSH Login

```bash
nano /etc/ssh/sshd_config
# Set: PermitRootLogin no
systemctl restart sshd
```

### 3. Change Default SSH Port

```bash
nano /etc/ssh/sshd_config
# Set: Port 2222
ufw allow 2222/tcp
systemctl restart sshd
```

### 4. Set Up Fail2Ban

```bash
apt install -y fail2ban
systemctl enable fail2ban
systemctl start fail2ban
```

---

## 📞 Support & Next Steps

### ✅ Deployment Complete!

Your US Bakers CRM is now live at: `https://crm.usbakers.com`

### 🎯 Next Features to Implement:

**Phase 2 (Priority 1):**
- 🔔 Real-time notifications system
- 📜 Activity logs for Super Admin

**Phase 3 (Priority 2):**
- 📄 PDF generation for orders
- 🔍 Advanced filtering

**Backlog:**
- 📦 Inventory management
- 💰 Staff incentive system

---

## 📝 Configuration Files Reference

| File | Purpose |
|------|---------|
| `/etc/nginx/sites-available/usbakers-crm` | Nginx web server config |
| `/etc/supervisor/conf.d/usbakers-backend.conf` | Backend process manager |
| `/etc/supervisor/conf.d/usbakers-frontend.conf` | Frontend process manager |
| `/home/usbakers/usbakers-crm/backend/.env` | Backend environment variables |
| `/home/usbakers/usbakers-crm/frontend/.env` | Frontend environment variables |

---

## 🎉 Congratulations!

Your US Bakers CRM is successfully deployed and running in production!

**Quick Access Commands:**
```bash
# Check status
supervisorctl status

# View logs
sudo tail -f /var/log/supervisor/backend.err.log

# Restart services
supervisorctl restart usbakers-backend usbakers-frontend

# Update application
cd /home/usbakers/usbakers-crm && git pull && supervisorctl restart usbakers-backend usbakers-frontend
```

---

**Need help?** Check the troubleshooting section or refer to the logs for detailed error messages.

**Last Updated:** December 2025  
**Version:** 2.0 (Advanced Order Flow)
