# US Bakers CRM - Product Requirements Document

## Original Problem Statement
Comprehensive CRM and management system for a multi-outlet bakery chain named "US Bakers". Includes order management, kitchen dashboard, payments tracking, zone management, PetPooja POS integration, customer management, and more.

## Tech Stack
- Frontend: React, Tailwind CSS, shadcn/ui, Craco
- Backend: FastAPI, MongoDB (Motor), Pydantic
- Authentication: JWT with multi-role RBAC (super_admin, outlet_admin, kitchen, order_manager, delivery, factory)
- 3rd Party: PetPooja POS Webhook, MSG91/AiSensy (WhatsApp)

## Core Features (Implemented)
- Multi-outlet order management (New Order, Pending, Hold, Manage)
- Kitchen Dashboard (sidebar-less, dedicated API, time-slot grouping, individual prepare buttons)
- Payments tracking with pagination
- Customer management
- Zone management with edit/delete/description
- User & Role management (Super Admin, Admin, Kitchen, Sales, Delivery, Factory)
- Settings: System settings, Branch thresholds, Flavours, Occasions, Time Slots (clock picker)
- KOT print (80mm thermal printer compatible, monospace, dashed lines)
- PetPooja sync integration
- Reports and Incentive Reports
- Cake Image Reports with filters
- Credit Orders page with Complementary toggle
- ManageOrders: Status dropdown, Edit dialog, More actions menu, Pagination, Bulk KOT print
- Ready to Deliver flow: Kitchen marks ready -> Counter captures photo -> Deliver or Pickup choice -> Incentive calculated
- Delivery Dashboard: Mobile-optimized, payment status display, address card with navigation, accept/deliver flow
- Camera capture with Deliver vs Customer Pickup branching
- Image uploads served via `/api/uploads/` static mount (ingress-compatible)

## What's Been Implemented (Latest Session - April 7, 2026)
- **BUGFIX: Broken Image Upload** — Root cause: Static files were mounted at `/uploads` but Kubernetes ingress only routes `/api/*` to backend. Fixed by:
  1. Changed static mount from `/uploads` to `/api/uploads` in server.py
  2. Upload endpoint now returns `/api/uploads/filename.jpg` URLs
  3. Added `getImageUrl()` normalizer in all frontend pages (ManageOrders, DeliveryDashboard, KitchenDashboard, CakeImageReport, NewOrder, HoldOrders)
  4. Migrated existing DB records from `/uploads/` to `/api/uploads/` paths
- Photo Upload Branching: After counter captures cake photo, dialog asks "Send for Delivery" or "Customer Will Pickup" (if order has delivery)
- DeliveryDashboard: Added payment status banner (FULLY PAID / PAYMENT PENDING with collect amount), delivery address card with navigation
- Backend: Updated `set-pickup` endpoint to also toggle `needs_delivery` field

## IMPORTANT: VPS Deployment Note
When deploying to VPS, run the migration script to fix old image URLs:
```bash
cd backend && python3 migrate_image_urls.py
```

## Prioritized Backlog
### P1
- Test KOT print functionality end-to-end
- PetPooja auto-sync verification (user must test on VPS)

### P3
- Backend refactoring: Break `server.py` (~4500 lines) into modular `/routes`, `/models`, `/utils`

## Key API Endpoints
- `PATCH /api/orders/{order_id}` - Update order details
- `PATCH /api/zones/{zone_id}` - Update zone details
- `POST /api/orders/{order_id}/mark-credit` - Move pending order to credit
- `POST /api/orders/{order_id}/set-pickup` - Set as customer pickup (also toggles needs_delivery)
- `POST /api/orders/{order_id}/ready-to-deliver` - Mark ready to deliver with photo
- `POST /api/orders/{order_id}/mark-complementary` - Toggle complementary status
- `GET /api/orders/credit` - Get credit orders
- `GET /api/delivery/available-orders` - Available orders for delivery
- `POST /api/upload-image` - Upload image (returns `/api/uploads/filename`)

## Key Credentials
- Super Admin: admin@usbakers.com / admin123
- Kitchen: kitchen@usbakers.com / kitchen123
- Outlet: outlet@usbakers.com / outlet123
- Manager: manager@usbakers.com / manager123
- Delivery: delivery@usbakers.com / delivery123
- Factory: factory@usbakers.com / factory123
