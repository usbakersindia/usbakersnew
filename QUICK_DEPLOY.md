# 🚀 Quick Deployment Checklist

## For Fresh VPS Deployment

### ✅ Phase 1: System Setup (15 minutes)
```bash
# 1. Update system
apt update && apt upgrade -y

# 2. Install MongoDB
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | \
   sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | \
   sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
apt update && apt install -y mongodb-org
systemctl start mongod && systemctl enable mongod

# 3. Install Node.js & Yarn
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs
npm install -g yarn

# 4. Install Python & Nginx
apt install -y python3.11 python3.11-venv python3-pip nginx

# 5. Create user and clone repo
useradd -m -s /bin/bash usbakers
su - usbakers
cd /home/usbakers
git clone https://github.com/usbakersindia/usbakers.git usbakers-crm
exit
```

### ✅ Phase 2: Run Automated Setup (5 minutes)
```bash
cd /home/usbakers/usbakers-crm
chmod +x setup-fresh.sh
sudo ./setup-fresh.sh
```
**You'll be asked for:**
- Domain (e.g., crm.usbakers.com)
- MongoDB URL (press Enter for default)
- Database name (press Enter for default)

### ✅ Phase 3: Configure Nginx (5 minutes)
```bash
nano /etc/nginx/sites-available/usbakers-crm
```
*Copy the Nginx config from COMPLETE_DEPLOYMENT_GUIDE.md*

```bash
ln -s /etc/nginx/sites-available/usbakers-crm /etc/nginx/sites-enabled/
rm /etc/nginx/sites-enabled/default
nginx -t
systemctl reload nginx
```

### ✅ Phase 4: SSL Certificate (2 minutes)
```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d crm.usbakers.com
```

### ✅ Phase 5: Verify (1 minute)
```bash
supervisorctl status
curl https://crm.usbakers.com
```

---

## For Updates to Existing Deployment

```bash
cd /home/usbakers/usbakers-crm
./update-vps.sh
```

---

## Essential Commands

### Check Status
```bash
supervisorctl status
systemctl status nginx
systemctl status mongod
```

### View Logs
```bash
sudo tail -f /var/log/supervisor/backend.err.log
sudo tail -f /var/log/supervisor/frontend.err.log
```

### Restart Services
```bash
supervisorctl restart usbakers-backend usbakers-frontend
systemctl reload nginx
```

---

## Test Credentials

| Role | Email | Password |
|------|-------|----------|
| Super Admin | admin@usbakers.com | admin123 |
| Dhangu Road | satyam@usbakers.com | satyam123 |
| Railway Road | sushant@usbakers.com | sushant123 |
| Factory | factory@usbakers.com | factory123 |

---

## Troubleshooting Quick Fixes

### Services not starting?
```bash
sudo tail -f /var/log/supervisor/backend.err.log
supervisorctl restart usbakers-backend usbakers-frontend
```

### 502 Bad Gateway?
```bash
supervisorctl status
supervisorctl restart usbakers-backend usbakers-frontend
```

### Permission errors?
```bash
chown -R usbakers:usbakers /home/usbakers/usbakers-crm
```

---

## 🎯 Total Time: ~30 minutes

**Questions?** Refer to `COMPLETE_DEPLOYMENT_GUIDE.md` for detailed explanations.
