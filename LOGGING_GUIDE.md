# US Bakers CRM - Logging Guide

## 📊 Current Logging Setup

### **Log Levels Used:**
1. **INFO** (12 instances) - General information
2. **ERROR** (17 instances) - Errors and exceptions
3. **WARNING** (4 instances) - Warning messages

---

## 📁 Log File Locations

### **Backend Logs:**
- **Output Log**: `/var/log/supervisor/backend.out.log` (312KB)
- **Error Log**: `/var/log/supervisor/backend.err.log` (686KB)

### **Frontend Logs:**
- **Output Log**: `/var/log/supervisor/frontend.out.log`
- **Error Log**: `/var/log/supervisor/frontend.err.log`

---

## 🔍 What's Currently Being Logged

### **1. Order Management Events**
- Order creation
- Order status changes
- Order updates

### **2. PetPooja Integration**
✅ **Logged Events:**
- `logger.info` - PetPooja callback received (order ID, status)
- `logger.info` - Payment webhook received (full request data)
- `logger.info` - Payment synced for order
- `logger.info` - Order moved to active/pending status
- `logger.error` - Order not found
- `logger.error` - No comment/order ID in webhook
- `logger.error` - PetPooja webhook errors

### **3. WhatsApp Notifications**
✅ **Logged Events:**
- `logger.info` - Notification sent successfully
- `logger.info` - Template not enabled
- `logger.warning` - Failed to send notification (with status code)
- `logger.warning` - Invalid phone number
- `logger.error` - Timeout errors
- `logger.error` - General WhatsApp errors

### **4. Payment Processing**
✅ **Logged Events:**
- `logger.error` - Payment report generation errors

### **5. Image Upload**
✅ **Logged Events:**
- `logger.error` - Image upload failures

### **6. API Requests**
✅ **Logged Events:**
- All HTTP requests (GET, POST, PUT, PATCH, DELETE)
- Status codes (200, 404, 500, etc.)
- Request IPs and endpoints

---

## 🛠️ How to View Logs

### **View Last 50 Lines:**
```bash
tail -50 /var/log/supervisor/backend.out.log
```

### **View Errors Only:**
```bash
tail -50 /var/log/supervisor/backend.err.log
```

### **Follow Logs in Real-Time:**
```bash
tail -f /var/log/supervisor/backend.out.log
```

### **Search for Specific Event:**
```bash
# Search for PetPooja events
grep -i "petpooja" /var/log/supervisor/backend.out.log | tail -20

# Search for errors
grep -i "error" /var/log/supervisor/backend.out.log | tail -20

# Search for specific order
grep "USB-20260307-006" /var/log/supervisor/backend.out.log
```

### **Filter by Log Level:**
```bash
# INFO level logs
grep "INFO:" /var/log/supervisor/backend.out.log | tail -20

# ERROR level logs
grep "ERROR:" /var/log/supervisor/backend.out.log | tail -20

# WARNING level logs
grep "WARNING:" /var/log/supervisor/backend.out.log | tail -20
```

---

## 📈 What's NOT Currently Logged

### **Missing Logging:**
1. ❌ User login/logout events
2. ❌ User impersonation (Navigate feature)
3. ❌ Settings changes (Flavours, Occasions, Time Slots)
4. ❌ Customer creation/updates
5. ❌ Outlet/Zone management changes
6. ❌ Permission changes
7. ❌ Order deletion events
8. ❌ Hold/Release order events
9. ❌ Credit order releases
10. ❌ File uploads (cake images, voice recordings)

---

## 🔧 Log Format

Current format:
```
%(asctime)s - %(name)s - %(levelname)s - %(message)s
```

Example output:
```
2026-03-20 19:29:45,123 - __main__ - INFO - PetPooja callback received for order: USB-20260307-006, status: confirmed
2026-03-20 19:29:45,456 - __main__ - ERROR - Order not found: USB-20260307-999
```

---

## 📊 Log Rotation

**Status**: ⚠️ **NOT CONFIGURED**

Without log rotation, log files will grow indefinitely and can fill up disk space.

**Recommended**: Configure logrotate to:
- Rotate logs daily
- Keep last 7 days
- Compress old logs
- Max size: 100MB

---

## 🚀 Recommended Improvements

### **1. Add Comprehensive Audit Logging**
Track:
- User actions (login, logout, impersonate)
- Data modifications (create, update, delete)
- Settings changes
- Permission changes

### **2. Add Request/Response Logging**
For debugging:
- Request body for POST/PUT/PATCH
- Response body for errors
- User information (who made the request)

### **3. Add Business Event Logging**
Track:
- Order lifecycle (created → pending → confirmed → delivered)
- Payment milestones
- Inventory changes
- Customer interactions

### **4. Add Performance Logging**
Monitor:
- API response times
- Database query performance
- External API calls (PetPooja, WhatsApp)

### **5. Configure Log Rotation**
Prevent disk space issues:
```bash
# Add to /etc/logrotate.d/usbakers-crm
/var/log/supervisor/backend.*.log {
    daily
    rotate 7
    compress
    delaycompress
    missingok
    notifempty
    create 0644 root root
}
```

### **6. Centralized Logging Dashboard**
Consider adding:
- Real-time log viewer in admin panel
- Log search functionality
- Error alerting
- Log analytics

---

## 📝 Log Analysis Tips

### **Debug PetPooja Integration:**
```bash
# Check all PetPooja events today
grep "PetPooja" /var/log/supervisor/backend.out.log | grep "$(date +%Y-%m-%d)"

# Check failed webhooks
grep -i "petpooja.*error" /var/log/supervisor/backend.out.log | tail -20
```

### **Debug WhatsApp Notifications:**
```bash
# Check WhatsApp events
grep "WhatsApp" /var/log/supervisor/backend.out.log | tail -20

# Check failed notifications
grep "Failed to send WhatsApp" /var/log/supervisor/backend.out.log
```

### **Debug Order Issues:**
```bash
# Find all events for specific order
grep "USB-20260307-006" /var/log/supervisor/backend.out.log

# Check recent order errors
grep -i "order.*error" /var/log/supervisor/backend.out.log | tail -20
```

### **Monitor System Health:**
```bash
# Check recent errors (last hour)
grep "ERROR:" /var/log/supervisor/backend.out.log | tail -100

# Count errors by type
grep "ERROR:" /var/log/supervisor/backend.out.log | awk '{print $NF}' | sort | uniq -c | sort -rn
```

---

## 🎯 Quick Reference

| Event | Log Level | File | Search Term |
|-------|-----------|------|-------------|
| PetPooja webhook | INFO | backend.out.log | `grep "PetPooja"` |
| WhatsApp sent | INFO | backend.out.log | `grep "WhatsApp notification sent"` |
| Payment synced | INFO | backend.out.log | `grep "Payment synced"` |
| Order not found | ERROR | backend.out.log | `grep "Order not found"` |
| API errors | ERROR | backend.err.log | `grep "ERROR:"` |
| Invalid phone | WARNING | backend.out.log | `grep "Invalid phone"` |

---

**Last Updated**: March 20, 2026
