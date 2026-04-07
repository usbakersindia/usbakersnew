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

## What's Been Implemented (Latest Session - April 7, 2026)
- Photo Upload Branching: After counter captures cake photo, dialog asks "Send for Delivery" or "Customer Will Pickup" (if order has delivery). Pickup sets needs_delivery=false.
- DeliveryDashboard: Added payment status banner (FULLY PAID / PAYMENT PENDING with collect amount), prominent delivery address card with inline Google Maps navigation button
- Backend: Updated `set-pickup` endpoint to also toggle `needs_delivery` field

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
- `GET /api/delivery/my-orders` - Delivery person's assigned orders
- `POST /api/time-slots` - Create delivery time slot
- `GET /api/time-slots` - Get active time slots

## Key Credentials
- Super Admin: admin@usbakers.com / admin123
- Kitchen: kitchen@usbakers.com / kitchen123
- Outlet: outlet@usbakers.com / outlet123
- Manager: manager@usbakers.com / manager123
- Delivery: delivery@usbakers.com / delivery123
- Factory: factory@usbakers.com / factory123
