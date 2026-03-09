# 📦 Deployment Files Overview

Your repository now contains everything needed for deployment:

## 🚀 Deployment Scripts

### 1. `setup-fresh.sh` ⭐ **MAIN DEPLOYMENT SCRIPT**
**Use this for:** Fresh installation on a new VPS
**What it does:**
- Creates `.env` files (asks for your domain, MongoDB URL)
- Installs all dependencies (Python, Node.js)
- Builds the frontend
- Seeds database with test data
- Configures and starts supervisor services

**How to use:**
```bash
cd /home/usbakers/usbakers-crm
chmod +x setup-fresh.sh
sudo ./setup-fresh.sh
```

---

### 2. `update-vps.sh` 🔄 **UPDATE SCRIPT**
**Use this for:** Updating existing deployment with new code
**What it does:**
- Pulls latest code from GitHub
- Installs new dependencies
- Rebuilds frontend
- Restarts services

**How to use:**
```bash
cd /home/usbakers/usbakers-crm
./update-vps.sh
```

---

### 3. `diagnose.sh` 🔍 **TROUBLESHOOTING SCRIPT**
**Use this for:** Checking system health and diagnosing issues
**What it does:**
- Checks all services (MongoDB, Nginx, Backend, Frontend)
- Verifies ports are listening
- Shows recent errors
- Provides quick fix suggestions

**How to use:**
```bash
cd /home/usbakers/usbakers-crm
sudo ./diagnose.sh
```

---

## 📚 Documentation Files

### 1. `COMPLETE_DEPLOYMENT_GUIDE.md` 📖 **FULL GUIDE**
**Contains:**
- Step-by-step deployment instructions (12 steps)
- Prerequisites and system requirements
- Nginx configuration
- SSL certificate setup
- Troubleshooting section
- Security hardening tips
- Monitoring commands

**Read this:** If you're deploying for the first time

---

### 2. `QUICK_DEPLOY.md` ⚡ **QUICK REFERENCE**
**Contains:**
- Quick deployment checklist
- Essential commands
- Test credentials
- Common troubleshooting fixes

**Read this:** If you want a quick overview (~30 min deployment)

---

### 3. `UPDATE_GUIDE.md` 🔄 **UPDATE INSTRUCTIONS**
**Contains:**
- How to update existing deployment
- Verification steps
- Test credentials

**Read this:** When updating your live application

---

## 🎯 Which Files to Use When?

### Scenario 1: Fresh VPS Setup (First Time)
1. Read `COMPLETE_DEPLOYMENT_GUIDE.md` (Steps 1-6)
2. Run `setup-fresh.sh`
3. Follow `COMPLETE_DEPLOYMENT_GUIDE.md` (Steps 9-12 for Nginx & SSL)
4. Run `diagnose.sh` to verify

**Time:** ~30-40 minutes

---

### Scenario 2: Quick Setup (Experienced)
1. Skim `QUICK_DEPLOY.md`
2. Run `setup-fresh.sh`
3. Configure Nginx (copy config from guide)
4. Setup SSL with Certbot

**Time:** ~20 minutes

---

### Scenario 3: Update Existing Deployment
1. Read `UPDATE_GUIDE.md`
2. Run `update-vps.sh`
3. Verify application works

**Time:** ~5 minutes

---

### Scenario 4: Something is Broken
1. Run `diagnose.sh` to identify issues
2. Check `COMPLETE_DEPLOYMENT_GUIDE.md` → Troubleshooting section
3. View logs:
   ```bash
   sudo tail -f /var/log/supervisor/backend.err.log
   sudo tail -f /var/log/supervisor/frontend.err.log
   ```

---

## 📂 Important Configuration Locations

Once deployed, these files will exist on your VPS:

### Backend Configuration
```
/home/usbakers/usbakers-crm/backend/.env
```
Contains: MongoDB URL, JWT secret, MSG91 keys

### Frontend Configuration
```
/home/usbakers/usbakers-crm/frontend/.env
```
Contains: Backend API URL (your domain)

### Nginx Configuration
```
/etc/nginx/sites-available/usbakers-crm
/etc/nginx/sites-enabled/usbakers-crm
```
Contains: Reverse proxy configuration

### Supervisor Configurations
```
/etc/supervisor/conf.d/usbakers-backend.conf
/etc/supervisor/conf.d/usbakers-frontend.conf
```
Contains: Process manager configurations

---

## 🔑 Test Credentials (Created by Setup Script)

After running `setup-fresh.sh`, these accounts will be available:

| Role | Email | Password | Access Level |
|------|-------|----------|--------------|
| **Super Admin** | admin@usbakers.com | admin123 | Full access to all features |
| **Dhangu Road Admin** | satyam@usbakers.com | satyam123 | Dhangu Road outlet management |
| **Railway Road Admin** | sushant@usbakers.com | sushant123 | Railway Road outlet management |
| **Factory Admin** | factory@usbakers.com | factory123 | Kitchen/Factory operations |

---

## 🎯 Deployment Checklist

Before you start, ensure you have:

- [ ] Ubuntu VPS (20.04 or 22.04)
- [ ] Root/sudo access
- [ ] Domain name pointed to VPS IP
- [ ] Minimum 2GB RAM, 2 CPU cores
- [ ] GitHub repository cloned to `/home/usbakers/usbakers-crm`

---

## 🆘 Need Help?

### Quick Commands Reference

**Check if everything is running:**
```bash
sudo ./diagnose.sh
```

**Restart services:**
```bash
supervisorctl restart usbakers-backend usbakers-frontend
```

**View errors:**
```bash
sudo tail -f /var/log/supervisor/backend.err.log
```

**Update application:**
```bash
./update-vps.sh
```

---

## 📊 Deployment Architecture

```
┌─────────────────────────────────────────┐
│         Internet (HTTPS)                │
└────────────────┬────────────────────────┘
                 │
         ┌───────▼────────┐
         │  Nginx:80/443  │  (Reverse Proxy + SSL)
         └───────┬────────┘
                 │
         ┌───────┴────────┐
         │                │
    ┌────▼─────┐    ┌────▼────────┐
    │ React    │    │  FastAPI    │
    │ :3000    │    │  :8001      │
    └──────────┘    └────┬────────┘
                         │
                    ┌────▼─────┐
                    │ MongoDB  │
                    │ :27017   │
                    └──────────┘
```

**Flow:**
1. User visits `https://crm.usbakers.com`
2. Nginx receives request and routes based on path:
   - `/api/*` → Backend (FastAPI on port 8001)
   - `/*` → Frontend (React on port 3000)
3. Backend connects to MongoDB on port 27017
4. Supervisor keeps both services running

---

## ✅ Success Indicators

After deployment, you should see:

```bash
$ supervisorctl status
usbakers-backend    RUNNING   pid 1234, uptime 0:05:23
usbakers-frontend   RUNNING   pid 1235, uptime 0:05:23
```

```bash
$ curl https://crm.usbakers.com
# Should return HTML content of your React app
```

```bash
$ curl https://crm.usbakers.com/api/health
{"status":"healthy"}
```

---

## 🎉 Ready to Deploy?

1. **New deployment?** → Start with `COMPLETE_DEPLOYMENT_GUIDE.md` or `QUICK_DEPLOY.md`
2. **Updating?** → Use `update-vps.sh`
3. **Issues?** → Run `diagnose.sh`

**Happy Deploying! 🚀**
