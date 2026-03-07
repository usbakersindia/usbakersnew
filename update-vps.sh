#!/bin/bash

# US Bakers - VPS Update Script
# This script updates your existing live application with the latest code and features

set -e  # Exit on any error

echo "=========================================="
echo "  US Bakers - VPS Update Script"
echo "=========================================="
echo ""

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the project directory (assuming script is run from project root)
PROJECT_DIR=$(pwd)

echo -e "${YELLOW}📂 Project Directory: $PROJECT_DIR${NC}"
echo ""

# Step 1: Fix Git ownership and pull latest code
echo -e "${GREEN}Step 1: Pulling latest code from GitHub...${NC}"
# Add safe directory exception for Git
git config --global --add safe.directory "$PROJECT_DIR" 2>/dev/null || true

# Stash any local changes
echo "  → Stashing local changes..."
git stash --include-untracked

# Fetch and reset to match remote
echo "  → Fetching latest from GitHub..."
git fetch origin

# Reset to match remote main branch
echo "  → Updating to latest version..."
git reset --hard origin/main

echo "✅ Code updated successfully"
echo ""

# Step 2: Install backend dependencies
echo -e "${GREEN}Step 2: Installing backend dependencies...${NC}"
cd "$PROJECT_DIR/backend"
pip install -r requirements.txt
echo "✅ Backend dependencies installed"
echo ""

# Step 3: Install frontend dependencies
echo -e "${GREEN}Step 3: Installing frontend dependencies...${NC}"
cd "$PROJECT_DIR/frontend"
yarn install
echo "✅ Frontend dependencies installed"
echo ""

# Step 4: Build frontend
echo -e "${GREEN}Step 4: Building frontend...${NC}"
yarn build
echo "✅ Frontend built successfully"
echo ""

# Step 5: Run seed script
echo -e "${GREEN}Step 5: Running data seed script...${NC}"
cd "$PROJECT_DIR/backend"
python3 utils/seed_complete_data.py
echo "✅ Seed data executed"
echo ""

# Step 6: Restart services
echo -e "${GREEN}Step 6: Restarting services...${NC}"
sudo supervisorctl restart backend
sudo supervisorctl restart frontend
echo "✅ Services restarted"
echo ""

# Step 7: Check service status
echo -e "${GREEN}Step 7: Checking service status...${NC}"
sudo supervisorctl status backend frontend
echo ""

echo "=========================================="
echo -e "${GREEN}✅ Update completed successfully!${NC}"
echo "=========================================="
echo ""
echo "🔗 Your application should now be running with all new features:"
echo "   - Advanced Order Flow (Punch/Hold/Pending)"
echo "   - Sales Person Management"
echo "   - Excel Exports"
echo "   - PetPooja Payment Integration"
echo "   - Bug Fixes & Stability Improvements"
echo ""
echo "📝 Test Credentials:"
echo "   Super Admin: admin@usbakers.com / admin123"
echo "   Dhangu Road: satyam@usbakers.com / satyam123"
echo "   Railway Road: sushant@usbakers.com / sushant123"
echo "   Factory: factory@usbakers.com / factory123"
echo ""
echo "🎉 Happy Baking!"
