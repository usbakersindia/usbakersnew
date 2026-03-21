# Kitchen Dashboard & Factory Manager Implementation Plan

## Production Implementation Strategy

### Phase 1: Backend Role & Permissions (PRIORITY)
1. Add FACTORY_MANAGER role
2. Update order endpoints for factory_manager access
3. Add PDF generation endpoint
4. Add photo upload endpoint
5. Update incentive calculation trigger

### Phase 2: Kitchen Dashboard Redesign
1. 80/20 split layout
2. Auto-refresh every 30 seconds
3. Show cake image + chef-relevant details
4. Mark ready + transfer to branch
5. Real-time order sequencing by delivery time

### Phase 3: Photo Upload & Cake Report
1. Upload actual cake photo after marking ready
2. Cake Image Report page (customer ref vs actual)
3. Trigger incentive calculation

### Phase 4: Delivery Assignment
1. Assign to delivery after photo upload

## Technical Decisions (Production Best Practices)

### Auto-refresh vs WebSockets
**Decision**: Polling with 30-second auto-refresh
- More reliable
- Easier to deploy
- No connection management issues
- Works with load balancers

### Roles
- **factory_manager**: New role with full order access + PDF download
- **kitchen**: Existing role for chefs (photo upload capability)
- No separate counter manager role (keeps it simple)

### PDF Generation
- Use HTML template → PDF conversion
- Include: Order #, Customer, Cake details, Delivery info
- Filter by date range

### Order Lifecycle Enforcement
```
Order Placed
  ├─ Details Incomplete → HOLD (Hold Orders)
  └─ Details Complete → PENDING (Pending Orders)
        └─ Payment >= 20% → ACTIVE (Manage Orders)
              └─ Visible to Factory Manager
                    └─ Kitchen Dashboard (by delivery time)
                          └─ Mark Ready → Upload Photo
                                └─ Calculate Incentive
                                      └─ Assign Delivery
```

## Implementation Order
1. ✅ Add factory_manager role
2. ✅ Update permissions for orders
3. ✅ Create PDF download endpoint
4. ✅ Redesign Kitchen Dashboard
5. ✅ Add photo upload flow
6. ✅ Create Cake Image Report
7. ✅ Update incentive calculation
