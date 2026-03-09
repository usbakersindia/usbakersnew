# 🔧 Complete Manual Setup Guide - US Bakers CRM
## Step-by-Step Installation on Fresh Ubuntu 20.04/22.04 VPS

---

## 📋 Prerequisites

- Fresh Ubuntu 20.04 or 22.04 VPS
- Root access
- Domain name pointed to VPS IP
- Minimum 2GB RAM, 2 CPU cores

---

## PART 1: SYSTEM SETUP

### Step 1: Connect to Your VPS

```bash
ssh root@your-server-ip
```

---

### Step 2: Update System Packages

```bash
apt update
apt upgrade -y
```

Wait for completion (~2-5 minutes)

---

### Step 3: Install Essential Tools

```bash
apt install -y git curl wget software-properties-common build-essential \
    gnupg apt-transport-https ca-certificates net-tools
```

---

### Step 4: Install MongoDB 7.0

#### 4.1 Import MongoDB GPG Key

```bash
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
```

#### 4.2 Add MongoDB Repository

```bash
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   tee /etc/apt/sources.list.d/mongodb-org-7.0.list
```

#### 4.3 Install MongoDB

```bash
apt update
apt install -y mongodb-org
```

#### 4.4 Start MongoDB

```bash
systemctl daemon-reload
systemctl start mongod
systemctl enable mongod
```

#### 4.5 Verify MongoDB

```bash
systemctl status mongod
```

Press `q` to exit status view.

You should see: **"active (running)"** in green

---

### Step 5: Install Node.js 20 & Yarn

#### 5.1 Add Node.js Repository

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
```

#### 5.2 Install Node.js

```bash
apt install -y nodejs
```

#### 5.3 Verify Node.js

```bash
node --version
```

Should show: **v20.x.x**

#### 5.4 Install Yarn

```bash
npm install -g yarn
```

#### 5.5 Verify Yarn

```bash
yarn --version
```

Should show: **1.x.x** or higher

---

### Step 6: Install Python 3.11 & pip

#### 6.1 Install Python

```bash
apt install -y python3.11 python3.11-venv python3.11-dev python3-pip
```

#### 6.2 Verify Python

```bash
python3.11 --version
```

Should show: **Python 3.11.x**

```bash
python3 --version
```

```bash
pip3 --version
```

---

### Step 7: Install Nginx

#### 7.1 Install

```bash
apt install -y nginx
```

#### 7.2 Start Nginx

```bash
systemctl start nginx
systemctl enable nginx
```

#### 7.3 Verify

```bash
systemctl status nginx
```

Should show: **"active (running)"**

---

### Step 8: Install Supervisor

```bash
apt install -y supervisor
```

#### 8.1 Start Supervisor

```bash
systemctl start supervisor
systemctl enable supervisor
```

#### 8.2 Verify

```bash
systemctl status supervisor
```

---

### Step 9: Configure Firewall

```bash
apt install -y ufw
ufw --force enable
ufw allow OpenSSH
ufw allow 'Nginx Full'
ufw allow 80/tcp
ufw allow 443/tcp
```

#### 9.1 Check Firewall Status

```bash
ufw status
```

---

### Step 10: Create Application User

```bash
useradd -m -s /bin/bash usbakers
```

#### 10.1 Verify User Created

```bash
id usbakers
```

---

## PART 2: APPLICATION SETUP

### Step 11: Clone Repository

#### 11.1 Switch to usbakers user

```bash
su - usbakers
```

#### 11.2 Clone from GitHub

```bash
git clone https://github.com/usbakersindia/usbakers.git usbakers-crm
```

**If private repository**, enter your GitHub username and Personal Access Token when prompted.

#### 11.3 Verify Clone

```bash
cd usbakers-crm
ls -la
```

You should see: `backend/`, `frontend/`, and various files

#### 11.4 Exit Back to Root

```bash
exit
```

---

### Step 12: Configure Backend Environment

#### 12.1 Create Backend .env File

```bash
nano /home/usbakers/usbakers-crm/backend/.env
```

#### 12.2 Add This Content (Replace YOUR_DOMAIN)

```env
MONGO_URL=mongodb://localhost:27017/usbakers_crm
DB_NAME=usbakers_crm
JWT_SECRET=YOUR_GENERATED_SECRET_HERE
MSG91_AUTH_KEY=your-msg91-key
MSG91_SENDER_ID=your-sender-id
```

#### 12.3 Generate JWT Secret

Open another terminal window and generate a random secret:

```bash
openssl rand -hex 32
```

Copy the output and replace `YOUR_GENERATED_SECRET_HERE` in the .env file.

#### 12.4 Save and Exit

Press `Ctrl + X`, then `Y`, then `Enter`

---

### Step 13: Configure Frontend Environment

#### 13.1 Create Frontend .env File

```bash
nano /home/usbakers/usbakers-crm/frontend/.env
```

#### 13.2 Add This Content (Replace with YOUR domain)

```env
REACT_APP_BACKEND_URL=https://crm.usbakers.com
```

**Important:** Replace `crm.usbakers.com` with your actual domain name.

#### 13.3 Save and Exit

Press `Ctrl + X`, then `Y`, then `Enter`

---

### Step 14: Install Backend Dependencies

#### 14.1 Navigate to Backend

```bash
cd /home/usbakers/usbakers-crm/backend
```

#### 14.2 Install python3-venv Package

```bash
apt install -y python3.11-venv python3-venv
```

#### 14.3 Create Virtual Environment

```bash
python3.11 -m venv venv
```

If that fails, try:
```bash
python3 -m venv venv
```

#### 14.4 Verify venv Created

```bash
ls -la venv/bin/activate
```

You should see the file listed.

#### 14.5 Activate Virtual Environment

```bash
source venv/bin/activate
```

Your prompt should now show `(venv)` at the beginning.

#### 14.6 Upgrade pip

```bash
pip install --upgrade pip
```

#### 14.7 Install Requirements

```bash
pip install -r requirements.txt
```

This takes 3-5 minutes. Wait for completion.

#### 14.8 Deactivate Virtual Environment

```bash
deactivate
```

---

### Step 15: Install Frontend Dependencies

#### 15.1 Navigate to Frontend

```bash
cd /home/usbakers/usbakers-crm/frontend
```

#### 15.2 Install Dependencies

```bash
yarn install
```

This takes 5-10 minutes. Wait for completion.

---

### Step 16: Build Frontend

```bash
yarn build
```

This takes 2-5 minutes. Wait for completion.

You should see: "Compiled successfully" at the end.

---

### Step 17: Seed Database with Test Data

#### 17.1 Navigate to Backend

```bash
cd /home/usbakers/usbakers-crm/backend
```

#### 17.2 Activate Virtual Environment

```bash
source venv/bin/activate
```

#### 17.3 Run Seed Script

```bash
python3 utils/seed_complete_data.py
```

You should see messages about creating users, outlets, orders, etc.

#### 17.4 Deactivate

```bash
deactivate
```

---

### Step 18: Fix Permissions

```bash
chown -R usbakers:usbakers /home/usbakers/usbakers-crm
```

---

## PART 3: SUPERVISOR CONFIGURATION

### Step 19: Create Backend Supervisor Config

#### 19.1 Create Config File

```bash
nano /etc/supervisor/conf.d/usbakers-backend.conf
```

#### 19.2 Add This Content

```ini
[program:usbakers-backend]
directory=/home/usbakers/usbakers-crm/backend
command=/home/usbakers/usbakers-crm/backend/venv/bin/uvicorn server:app --host 0.0.0.0 --port 8001
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/backend.err.log
stdout_logfile=/var/log/supervisor/backend.out.log
user=usbakers
environment=PATH="/home/usbakers/usbakers-crm/backend/venv/bin"
```

#### 19.3 Save and Exit

Press `Ctrl + X`, then `Y`, then `Enter`

---

### Step 20: Create Frontend Supervisor Config

#### 20.1 Create Config File

```bash
nano /etc/supervisor/conf.d/usbakers-frontend.conf
```

#### 20.2 Add This Content

```ini
[program:usbakers-frontend]
directory=/home/usbakers/usbakers-crm/frontend
command=/usr/bin/yarn start
autostart=true
autorestart=true
stderr_logfile=/var/log/supervisor/frontend.err.log
stdout_logfile=/var/log/supervisor/frontend.out.log
user=usbakers
environment=PORT="3000"
```

#### 20.3 Save and Exit

Press `Ctrl + X`, then `Y`, then `Enter`

---

### Step 21: Start Services with Supervisor

#### 21.1 Reload Supervisor

```bash
supervisorctl reread
supervisorctl update
```

#### 21.2 Start Services

```bash
supervisorctl start usbakers-backend
supervisorctl start usbakers-frontend
```

#### 21.3 Check Status

```bash
supervisorctl status
```

You should see:
```
usbakers-backend    RUNNING   pid 1234, uptime 0:00:10
usbakers-frontend   RUNNING   pid 1235, uptime 0:00:10
```

Both should say **RUNNING**.

If they show errors, check logs:
```bash
tail -n 50 /var/log/supervisor/backend.err.log
tail -n 50 /var/log/supervisor/frontend.err.log
```

---

## PART 4: NGINX CONFIGURATION

### Step 22: Create Nginx Configuration

#### 22.1 Create Config File

```bash
nano /etc/nginx/sites-available/usbakers-crm
```

#### 22.2 Add This Configuration

**IMPORTANT:** Replace `crm.usbakers.com` with your actual domain in the `server_name` line.

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
    server_name crm.usbakers.com;  # 👈 CHANGE THIS to your domain

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

    # Frontend - Proxy to React
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

    # Error pages
    error_page 500 502 503 504 /50x.html;
    location = /50x.html {
        root /usr/share/nginx/html;
    }
}
```

#### 22.3 Save and Exit

Press `Ctrl + X`, then `Y`, then `Enter`

---

### Step 23: Enable Site

#### 23.1 Create Symbolic Link

```bash
ln -s /etc/nginx/sites-available/usbakers-crm /etc/nginx/sites-enabled/
```

#### 23.2 Remove Default Site

```bash
rm /etc/nginx/sites-enabled/default
```

#### 23.3 Test Configuration

```bash
nginx -t
```

You should see:
```
nginx: the configuration file /etc/nginx/nginx.conf syntax is ok
nginx: configuration file /etc/nginx/nginx.conf test is successful
```

#### 23.4 Reload Nginx

```bash
systemctl reload nginx
```

---

## PART 5: SSL CERTIFICATE

### Step 24: Install Certbot

```bash
apt install -y certbot python3-certbot-nginx
```

---

### Step 25: Obtain SSL Certificate

```bash
certbot --nginx -d crm.usbakers.com
```

**Replace `crm.usbakers.com` with your domain**

#### Follow the prompts:

1. **Enter email address:** Type your email and press Enter
2. **Agree to terms:** Type `Y` and press Enter
3. **Share email with EFF:** Type `N` or `Y` (your choice)
4. Certbot will automatically configure HTTPS

You should see: **"Successfully deployed certificate"**

---

## PART 6: VERIFICATION

### Step 26: Check All Services

```bash
supervisorctl status
```

Expected output:
```
usbakers-backend    RUNNING   pid 1234, uptime 0:10:23
usbakers-frontend   RUNNING   pid 1235, uptime 0:10:23
```

```bash
systemctl status mongod
```

Should show: **active (running)**

```bash
systemctl status nginx
```

Should show: **active (running)**

---

### Step 27: Test Backend API

```bash
curl http://localhost:8001/api/health
```

or

```bash
curl https://crm.usbakers.com/api/health
```

Should return some JSON response.

---

### Step 28: Test Frontend

```bash
curl http://localhost:3000
```

Should return HTML content.

---

### Step 29: Access Your Application

Open your web browser and visit:

```
https://crm.usbakers.com
```

Replace with your actual domain.

---

### Step 30: Login with Test Credentials

Try logging in with:

**Email:** `admin@usbakers.com`  
**Password:** `admin123`

---

## ✅ SUCCESS CHECKLIST

- [ ] MongoDB running
- [ ] Nginx running
- [ ] Backend service running
- [ ] Frontend service running
- [ ] SSL certificate installed
- [ ] Website accessible via HTTPS
- [ ] Login working
- [ ] Dashboard loading

---

## 🐛 TROUBLESHOOTING

### If Backend Not Starting

```bash
tail -n 100 /var/log/supervisor/backend.err.log
```

Look for errors and fix them.

### If Frontend Not Starting

```bash
tail -n 100 /var/log/supervisor/frontend.err.log
```

### Restart Services

```bash
supervisorctl restart usbakers-backend
supervisorctl restart usbakers-frontend
```

### Check MongoDB

```bash
systemctl status mongod
mongosh --eval "db.version()"
```

### Check Ports

```bash
netstat -tlnp | grep -E '27017|8001|3000|80|443'
```

You should see all these ports listening.

---

## 📊 USEFUL COMMANDS

### View Live Logs

```bash
# Backend logs
tail -f /var/log/supervisor/backend.out.log

# Frontend logs
tail -f /var/log/supervisor/frontend.out.log

# Backend errors
tail -f /var/log/supervisor/backend.err.log

# Frontend errors
tail -f /var/log/supervisor/frontend.err.log
```

### Restart Everything

```bash
supervisorctl restart usbakers-backend usbakers-frontend
systemctl restart nginx
```

### Check Service Status

```bash
supervisorctl status
systemctl status mongod
systemctl status nginx
systemctl status supervisor
```

---

## 🎉 DEPLOYMENT COMPLETE!

Your US Bakers CRM is now live and running!

**Access:** https://your-domain.com  
**Super Admin:** admin@usbakers.com / admin123

---

## 📝 NOTES

- All services will auto-restart on server reboot
- Logs are in `/var/log/supervisor/`
- SSL certificate auto-renews every 90 days
- MongoDB data is in `/var/lib/mongodb/`

---

## 🔄 FUTURE UPDATES

When you push new code to GitHub:

```bash
cd /home/usbakers/usbakers-crm
git pull origin main

# Backend updates
cd backend
source venv/bin/activate
pip install -r requirements.txt
deactivate

# Frontend updates
cd ../frontend
yarn install
yarn build

# Restart services
supervisorctl restart usbakers-backend usbakers-frontend
```

---

**Total Time:** 45-60 minutes  
**Difficulty:** Intermediate

**Congratulations on your successful deployment! 🎊**
