# US Bakers CRM - One-Command Deployment Guide

## 🚀 Deploy Everything in One Command

This script will install and configure everything needed for US Bakers CRM on a fresh Hostinger VPS.

---

## ✅ What Gets Installed

### System Dependencies:
- ✅ Node.js 20 (for frontend)
- ✅ Python 3.11 (for backend)
- ✅ MongoDB 7.0 (database)
- ✅ Nginx (web server)
- ✅ Supervisor (process manager)

### Application:
- ✅ Backend API (FastAPI)
- ✅ Frontend (React)
- ✅ Database seeded with test data
- ✅ 4 test users (Super Admin, 2 Outlet Admins, 1 Kitchen)
- ✅ 20 sample orders
- ✅ All permissions configured

### Features:
- ✅ Multi-outlet order management
- ✅ Kitchen & Delivery dashboards
- ✅ Customer management
- ✅ Payment tracking
- ✅ Reports & analytics
- ✅ Role-based access control
- ✅ Granular permission management
- ✅ WhatsApp notifications (MSG91)

---

## 📋 Prerequisites

- **Server**: Ubuntu 24.04 or Ubuntu 22.04 VPS
- **RAM**: Minimum 2GB (4GB recommended)
- **Disk**: Minimum 20GB
- **Access**: Root or sudo access
- **GitHub**: Repository must be public or SSH key configured

---

## 🎯 One-Command Deployment

### Step 1: SSH into your Hostinger VPS

```bash
ssh root@YOUR_SERVER_IP
```

### Step 2: Run the deployment script

```bash
curl -fsSL https://raw.githubusercontent.com/usbakersindia/usbakers/main/deploy-full-one-command.sh | sudo bash
```

**OR** if you want to download and review first:

```bash
wget https://raw.githubusercontent.com/usbakersindia/usbakers/main/deploy-full-one-command.sh
sudo bash deploy-full-one-command.sh
```

### Step 3: Wait for completion (5-10 minutes)

The script will:
1. Update system packages
2. Install all dependencies
3. Clone your application
4. Configure backend & frontend
5. Seed database
6. Configure Nginx
7. Start all services
8. Test everything

---

## ✨ After Deployment

### Access Your Application

Open in browser: **http://YOUR_SERVER_IP**

### Login Credentials

**Super Admin** (Full access + Permission Management):
- Email: `admin@usbakers.com`
- Password: `admin123`

**Satyam** (Dhangu Road - Outlet Admin):
- Email: `satyam@usbakers.com`
- Password: `satyam123`

**Sushant** (Railway Road - Outlet Admin):
- Email: `sushant@usbakers.com`
- Password: `sushant123`

**Factory** (Kitchen):
- Email: `factory@usbakers.com`
- Password: `factory123`

---

## 🔧 Verify Deployment

### Check Services Status

```bash
# Backend status
sudo supervisorctl status usbakers-backend

# Nginx status
sudo systemctl status nginx

# MongoDB status
sudo systemctl status mongod
```

Should all show "RUNNING" or "active"

### Check Logs

```bash
# Backend logs
tail -f /home/usbakers/logs/backend.log

# Nginx error logs
tail -f /var/log/nginx/error.log
```

### Test API

```bash
curl http://YOUR_SERVER_IP/api/health
```

Should return: `{"status":"healthy","service":"US Bakers CRM"}`

---

## 🔐 Important Security Steps (Do This First!)

### 1. Change All Default Passwords

Login as Super Admin and change:
- Your own password
- All test user passwords

### 2. Setup Domain (Optional but Recommended)

Update backend URL:
```bash
cd /home/usbakers/usbakers-crm/backend
nano .env
# Change: BACKEND_URL=http://yourdomain.com
sudo supervisorctl restart usbakers-backend
```

Update frontend URL:
```bash
cd /home/usbakers/usbakers-crm/frontend
nano .env
# Change: REACT_APP_BACKEND_URL=http://yourdomain.com
yarn build
sudo systemctl restart nginx
```

### 3. Setup SSL Certificate (If using domain)

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com
```

---

## 🔄 Common Management Tasks

### Restart Backend

```bash
sudo supervisorctl restart usbakers-backend
```

### Restart Nginx

```bash
sudo systemctl restart nginx
```

### View Backend Logs

```bash
tail -f /home/usbakers/logs/backend.log
```

### Backup Database

```bash
mongodump --uri='mongodb://localhost:27017/usbakers' --out=/home/usbakers/backup-$(date +%Y%m%d)
```

### Update Application from GitHub

```bash
cd /home/usbakers/usbakers-crm
git pull

# Rebuild frontend
cd frontend
yarn build

# Restart backend
sudo supervisorctl restart usbakers-backend

# Restart nginx
sudo systemctl restart nginx
```

---

## 🐛 Troubleshooting

### If Backend Won't Start

```bash
# Check logs
tail -n 50 /home/usbakers/logs/backend.log

# Check if MongoDB is running
sudo systemctl status mongod

# Restart backend
sudo supervisorctl restart usbakers-backend
```

### If Frontend Shows 500 Error

```bash
# Check nginx error logs
tail -n 50 /var/log/nginx/error.log

# Check file permissions
ls -la /home/usbakers/usbakers-crm/frontend/build/

# Fix permissions if needed
sudo chmod -R 755 /home/usbakers
```

### If MongoDB Won't Start

```bash
# Check MongoDB logs
sudo journalctl -u mongod -n 50 --no-pager

# Try manual start
sudo systemctl start mongod
```

### If Site Not Loading

```bash
# Check all services
sudo supervisorctl status
sudo systemctl status nginx
sudo systemctl status mongod

# Test backend directly
curl http://localhost:8001/api/health

# Check nginx config
sudo nginx -t
```

---

## 📊 What's Included in Database

After deployment, you'll have:

- **4 Users**: Super Admin, Satyam, Sushant, Factory
- **2 Outlets**: US Bakers Railway Road, US Bakers Dhangu Road
- **4 Delivery Zones**
- **5 Test Customers**
- **20 Sample Orders** (distributed across next 5 days)
- **16 Payment Records**

---

## 🎯 What Each User Can Do

### Super Admin
- ✅ Full system access
- ✅ Manage users, outlets, zones
- ✅ Configure role permissions
- ✅ View all reports
- ✅ Manage orders and customers

### Outlet Admins (Satyam & Sushant)
- ✅ View dashboard for their outlet
- ✅ Create and manage orders
- ✅ Manage customers
- ✅ Record payments
- ✅ View reports

### Kitchen (Factory)
- ✅ View kitchen dashboard
- ✅ See orders assigned to kitchen
- ✅ Mark orders as ready

### Delivery
- ✅ View delivery dashboard
- ✅ See assigned deliveries
- ✅ Mark orders as delivered

---

## 📞 Support

If you encounter issues:

1. Check the logs (backend and nginx)
2. Verify all services are running
3. Check file permissions
4. Review the troubleshooting section above

---

## 📝 Files and Directories

```
/home/usbakers/
├── usbakers-crm/           # Application code
│   ├── backend/            # FastAPI backend
│   ├── frontend/           # React frontend
│   └── uploads/            # Uploaded files
└── logs/                   # Application logs
    ├── backend.log
    └── backend-error.log

/etc/nginx/
└── sites-available/
    └── usbakers            # Nginx config

/etc/supervisor/
└── conf.d/
    └── usbakers-backend.conf  # Supervisor config
```

---

## 🚀 Next Steps After Deployment

1. ✅ Login and change all passwords
2. ✅ Test order creation
3. ✅ Configure MSG91 WhatsApp settings
4. ✅ Setup domain and SSL (if applicable)
5. ✅ Configure role permissions in `/permissions`
6. ✅ Add your real outlets and zones
7. ✅ Remove test data and add real data
8. ✅ Setup automated backups

---

**Your US Bakers CRM is ready to use!** 🎉
