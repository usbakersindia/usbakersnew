# US Bakers CRM - Product Requirements Document

## Tech Stack
- Frontend: React, Tailwind CSS, shadcn/ui
- Backend: FastAPI, MongoDB (Motor), Pydantic, ReportLab (PDF)
- Auth: JWT with multi-role RBAC (super_admin, outlet_admin, kitchen, order_manager, delivery, factory_manager)
- 3rd Party: PetPooja POS Webhook, MSG91/AiSensy (WhatsApp)

## Core Features (Implemented)
- Multi-outlet order management with full lifecycle
- Kitchen Dashboard (sidebar-less, time-slot grouping)
- Factory Dashboard with PDF export (all outlets, all orders, cake images)
- Delivery Dashboard (mobile-optimized, payment status, address navigation)
- Credit Orders with Complementary toggle
- Payments tracking with pagination
- Zone management with edit/delete
- Camera capture with Deliver vs Customer Pickup branching
- KOT print (80mm thermal, PetPooja billing, delivery status, name on cake)
- Reports and Incentive Reports
- System Reset with auto re-seed of flavours/occasions
- Branch-specific payment thresholds (enforced in PetPooja webhooks)

## Latest Changes (April 9, 2026)
1. **Factory Dashboard (NEW)** - `/factory` route with full order table, date/outlet filters, stats cards, Download PDF button. Factory can see ALL outlets.
2. **Factory PDF Export** - `GET /api/factory/orders/pdf` generates A4 PDF with order summary table + detailed per-order section with cake images
3. **Double Order Entry Fix** - Prevent double-click submission in NewOrder form. Button disabled during `loading` and navigate immediately after success
4. **Flavours/Occasions Fix** - System reset now re-seeds default flavours and occasions so New Order form always has options
5. **Time Slot → Time Picker** - Replaced dropdown with native `<input type="time">` in New Order form
6. **Payment Threshold Bug** - Fixed two PetPooja webhook handlers that bypassed branch-specific thresholds
7. **Image Upload Fix** - Static files served via `/api/uploads/` for ingress compatibility

## Key API Endpoints
- `GET /api/factory/orders` - All orders for factory (cross-outlet)
- `GET /api/factory/orders/pdf` - PDF export with details + images
- `POST /api/orders/{id}/set-pickup` - Toggle pickup (also updates needs_delivery)
- `POST /api/upload-image` - Returns `/api/uploads/filename`
- `POST /api/system-reset` - Clears data, re-seeds flavours/occasions

## Credentials
- Super Admin: admin@usbakers.com / admin123
- Kitchen: kitchen@usbakers.com / kitchen123
- Outlet: outlet@usbakers.com / outlet123
- Manager: manager@usbakers.com / manager123
- Delivery: delivery@usbakers.com / delivery123
- Factory: factory@usbakers.com / factory123

## Backlog
- P1: KOT thermal print end-to-end testing
- P1: PetPooja auto-sync verification on VPS
- P3: Backend refactoring (server.py ~5000 lines → modular routes)
