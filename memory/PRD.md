# US Bakers CRM - Product Requirements Document

## Original Problem Statement
Comprehensive CRM and management system for a multi-outlet bakery chain named "US Bakers". Includes order management, kitchen dashboard, payments tracking, zone management, PetPooja POS integration, customer management, and more.

## Tech Stack
- Frontend: React, Tailwind CSS, shadcn/ui, Craco
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Authentication: JWT with multi-role RBAC
- 3rd Party: PetPooja POS Webhook, MSG91 (WhatsApp)

## Core Features (Implemented)
- Multi-outlet order management (New Order, Pending, Hold, Manage)
- Kitchen Dashboard (sidebar-less, dedicated API)
- Payments tracking with pagination
- Customer management
- Zone management with edit/delete/description
- User & Role management (Super Admin, Admin, Kitchen, Sales)
- Settings: System settings, Branch thresholds, Flavours, Occasions, Time Slots (clock picker)
- KOT print with QR code and PetPooja billing info
- PetPooja sync integration
- Reports and Incentive Reports
- Cake Image Reports
- Credit order workflow (via Pending Orders)
- ManageOrders: Status dropdown, Edit dialog, More actions menu, Pagination

## What's Been Implemented (Latest Session - March 28-30, 2026)
- Fixed Payments.js JSX syntax error (missing React fragment wrapper for pagination)
- Implemented Clock/Time Picker for Delivery Time Slots in Settings
- Fixed Kitchen Dashboard logout button missing in empty state (no orders) view
- Created seed script (`backend/seed_data.py`) with dummy data: 3 outlets, 9 zones, 5 users, 15 orders (today/tomorrow/+2/+3 days), 8 flavours, 5 occasions, 6 time slots, 2 sales persons
- Added "Reset System" button in Settings (Danger Zone) with confirmation dialog — clears all data except super admin
- Added `POST /api/system-reset` backend endpoint (replaced text input with hour/minute/AM-PM selectors)

## Prioritized Backlog
### P1
- Test KOT print functionality end-to-end
- PetPooja auto-sync verification (user must test on VPS)

### P3
- Backend refactoring: Break `server.py` (~4350 lines) into modular `/routes`, `/models`, `/utils`

## Key API Endpoints
- `PATCH /api/orders/{order_id}` - Update order details
- `PATCH /api/zones/{zone_id}` - Update zone details
- `POST /api/orders/{order_id}/mark-credit` - Move pending order to credit
- `POST /api/time-slots` - Create delivery time slot
- `GET /api/time-slots` - Get active time slots
- `DELETE /api/time-slots/{slot_id}` - Soft delete time slot

## Key Credentials
- Admin: admin@usbakers.com / admin123
- Kitchen: kitchen@usbakers.com / kitchen123
