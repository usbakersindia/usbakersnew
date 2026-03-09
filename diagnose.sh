#!/bin/bash

# US Bakers CRM - Diagnostic & Troubleshooting Script
# This script checks all components and helps diagnose issues

echo "=========================================="
echo "  US Bakers CRM - System Diagnostic"
echo "=========================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_service() {
    local service=$1
    local name=$2
    
    if systemctl is-active --quiet $service; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT running"
        return 1
    fi
}

# Check supervisor process
check_supervisor_process() {
    local process=$1
    local name=$2
    
    if supervisorctl status $process | grep -q RUNNING; then
        echo -e "${GREEN}✓${NC} $name is running"
        return 0
    else
        echo -e "${RED}✗${NC} $name is NOT running"
        supervisorctl status $process
        return 1
    fi
}

# Check port
check_port() {
    local port=$1
    local name=$2
    
    if netstat -tlnp | grep -q ":$port"; then
        echo -e "${GREEN}✓${NC} $name (port $port) is listening"
        return 0
    else
        echo -e "${RED}✗${NC} $name (port $port) is NOT listening"
        return 1
    fi
}

echo "=== System Services ==="
check_service mongod "MongoDB"
check_service nginx "Nginx"
echo ""

echo "=== Application Services ==="
check_supervisor_process "usbakers-backend" "Backend API"
check_supervisor_process "usbakers-frontend" "Frontend React"
echo ""

echo "=== Network Ports ==="
check_port 27017 "MongoDB"
check_port 8001 "Backend API"
check_port 3000 "Frontend"
check_port 80 "Nginx HTTP"
check_port 443 "Nginx HTTPS"
echo ""

echo "=== Configuration Files ==="
if [ -f "/home/usbakers/usbakers-crm/backend/.env" ]; then
    echo -e "${GREEN}✓${NC} Backend .env exists"
else
    echo -e "${RED}✗${NC} Backend .env missing"
fi

if [ -f "/home/usbakers/usbakers-crm/frontend/.env" ]; then
    echo -e "${GREEN}✓${NC} Frontend .env exists"
else
    echo -e "${RED}✗${NC} Frontend .env missing"
fi

if [ -f "/etc/nginx/sites-enabled/usbakers-crm" ]; then
    echo -e "${GREEN}✓${NC} Nginx config exists"
else
    echo -e "${RED}✗${NC} Nginx config missing"
fi

if [ -f "/etc/supervisor/conf.d/usbakers-backend.conf" ]; then
    echo -e "${GREEN}✓${NC} Backend supervisor config exists"
else
    echo -e "${RED}✗${NC} Backend supervisor config missing"
fi

if [ -f "/etc/supervisor/conf.d/usbakers-frontend.conf" ]; then
    echo -e "${GREEN}✓${NC} Frontend supervisor config exists"
else
    echo -e "${RED}✗${NC} Frontend supervisor config missing"
fi
echo ""

echo "=== API Health Check ==="
if curl -s http://localhost:8001/api/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓${NC} Backend API is responding"
else
    echo -e "${RED}✗${NC} Backend API is not responding"
fi
echo ""

echo "=== Disk Space ==="
df -h /home/usbakers/usbakers-crm | tail -n 1 | awk '{print "Used: "$3" / "$2" ("$5")"}'
echo ""

echo "=== Memory Usage ==="
free -h | grep Mem | awk '{print "Used: "$3" / "$2}'
echo ""

echo "=== Recent Errors (Last 10 lines) ==="
echo ""
echo "--- Backend Errors ---"
if [ -f "/var/log/supervisor/backend.err.log" ]; then
    tail -n 10 /var/log/supervisor/backend.err.log
else
    echo "No backend error log found"
fi
echo ""

echo "--- Frontend Errors ---"
if [ -f "/var/log/supervisor/frontend.err.log" ]; then
    tail -n 10 /var/log/supervisor/frontend.err.log
else
    echo "No frontend error log found"
fi
echo ""

echo "=========================================="
echo "  Diagnostic Complete"
echo "=========================================="
echo ""
echo "💡 Quick Fixes:"
echo ""
echo "Restart all services:"
echo "  sudo supervisorctl restart usbakers-backend usbakers-frontend"
echo ""
echo "View live logs:"
echo "  sudo tail -f /var/log/supervisor/backend.err.log"
echo "  sudo tail -f /var/log/supervisor/frontend.err.log"
echo ""
echo "Check MongoDB:"
echo "  systemctl status mongod"
echo "  mongosh --eval 'db.version()'"
echo ""
