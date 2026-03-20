# PetPooja Integration Guide - US Bakers CRM

## 📋 Current Status

✅ **Webhook Endpoint**: `https://usbakers.tech/api/petpooja/payment-webhook` is LIVE and working
✅ **Backend**: Properly configured to receive and process PetPooja data
❌ **Data Flow**: Not receiving data yet (waiting for PetPooja team configuration)

---

## 🔧 How It Works

### Current Setup (Webhook-Based Integration)

Since PetPooja hasn't provided API credentials, the integration works via **webhooks** (push-based):

1. **Customer places order** → You create order in US Bakers CRM (gets order number like `USB-20260307-006`)
2. **Bill created in PetPooja POS** → Staff creates bill with order number in comment field
3. **PetPooja sends webhook** → PetPooja automatically sends bill data to your webhook URL
4. **CRM processes payment** → Your system receives payment and updates order status

---

## ⚙️ Setup Required

### Step 1: Configure PetPooja Webhook (PetPooja Team's Job)

**Contact PetPooja support and provide them:**

```
Webhook URL: https://usbakers.tech/api/petpooja/payment-webhook
Purpose: Sync bill/payment data to US Bakers CRM
Method: POST
Content-Type: application/json
```

**Required webhook payload fields:**
- `bill_number` or `billNo` - Bill number from PetPooja
- `amount` or `totalAmount` - Bill amount
- `comment` or `remarks` - **CRITICAL**: Must contain your CRM order number
- `payment_method` - Payment method (cash/card/upi/online)

---

### Step 2: Staff Training (Your Job)

**CRITICAL WORKFLOW** for staff using PetPooja POS:

1. When customer orders custom cake:
   - First create order in **US Bakers CRM**
   - Note the order number (e.g., `USB-20260307-006`)

2. When creating bill in **PetPooja POS**:
   - **MUST add order number in Comment/Remarks field**
   - Example: In comment field type: `USB-20260307-006`
   - Without this, payment won't sync to the correct order!

3. After bill is saved:
   - PetPooja will automatically send data to your CRM
   - Check "PetPooja Sync" page in CRM to verify

---

## 📱 Using the New PetPooja Settings Page

I've created a comprehensive settings page for you:

**Location**: Sidebar → "PetPooja Sync" → Then look for new "PetPooja Settings" link

**Features:**
1. **Webhook URLs Display** - Copy and share with PetPooja team
2. **Test Webhook** - Test if webhook is working with real order numbers
3. **Setup Instructions** - Complete guide for PetPooja team
4. **Troubleshooting** - Common issues and solutions

---

## 🧪 Testing the Integration

### Before PetPooja Configures Webhook:

1. Go to **PetPooja Settings** page in your CRM
2. In "Test Payment Webhook" section:
   - Enter an actual order number from "Pending Orders" page
   - Enter test amount (e.g., 500)
   - Click "Test Webhook"
3. Expected results:
   - ✅ Success: "Payment synced successfully" - Order updated
   - ❌ Error: "Order not found" - Order number doesn't exist

### After PetPooja Configures Webhook:

1. Create a test order in your CRM
2. Note the order number
3. Create a bill in PetPooja POS with order number in comment
4. Check "PetPooja Sync" page - bill should appear
5. Check "Manage Orders" page - payment should be synced

---

## 🔍 Verifying Data Flow

### Check if PetPooja sent data:

**Option 1: PetPooja Sync Page**
- Go to "PetPooja Sync" in sidebar
- If bills appear → PetPooja is sending data ✅
- If empty → PetPooja hasn't sent data yet ❌

**Option 2: Check Logs** (Technical)
```bash
# SSH into your VPS
tail -f /var/log/supervisor/backend.out.log | grep -i "petpooja"
```

If you see log entries when bills are created, webhook is working.

---

## ⚠️ Common Issues & Solutions

### Issue 1: "Order not found" error
**Cause**: Order number in PetPooja comment doesn't match CRM order number
**Solution**: 
- Copy exact order number from CRM (e.g., `USB-20260307-006`)
- Paste into PetPooja comment field
- Don't type manually (risk of typos)

### Issue 2: No bills appearing in PetPooja Sync page
**Cause**: PetPooja team hasn't configured webhook yet
**Solution**:
- Confirm with PetPooja support
- Share webhook URL from Settings page
- Ask them to send test webhook

### Issue 3: Bills appear but don't sync to orders
**Cause**: Comment field in bill is empty or doesn't match any order
**Solution**:
- Train staff to ALWAYS add order number in comment
- Use "Sync Now" button manually if needed

### Issue 4: Payment synced but order still in "Pending"
**Cause**: Payment amount is less than minimum threshold (20% by default)
**Solution**:
- Check Settings page for payment threshold
- Make sure payment is >= threshold to move order to "Confirmed"

---

## 🎯 Next Steps

1. **Share webhook URL with PetPooja support**
   - Go to PetPooja Settings page in your CRM
   - Copy Payment Webhook URL
   - Email to PetPooja support team

2. **Train your staff**
   - Show them how to add order number in PetPooja comment field
   - Do a test run together

3. **Test with real order**
   - Create order in CRM
   - Create bill in PetPooja with order number in comment
   - Verify sync in "PetPooja Sync" page

4. **Monitor for first few days**
   - Check "PetPooja Sync" page regularly
   - Fix any issues immediately
   - Update staff training if needed

---

## 📞 If Issues Persist

If webhook still not receiving data after 48 hours:

1. Contact PetPooja support and ask:
   - "Did you configure our webhook URL?"
   - "Can you send a test webhook to our URL?"
   - "What format does your webhook payload use?"

2. In your CRM:
   - Use "Test Webhook" feature to verify your system works
   - Check if any firewalls are blocking PetPooja's requests
   - Share backend logs with developer if needed

---

## 📚 Technical Details (For Developers)

**Webhook Endpoint**: `POST /api/petpooja/payment-webhook`

**Expected Payload**:
```json
{
  "bill_number": "BILL-001",
  "amount": 500.00,
  "comment": "USB-20260307-006",
  "payment_method": "cash"
}
```

**Response**:
```json
{
  "success": true,
  "message": "Payment synced successfully",
  "order_id": "...",
  "order_number": "USB-20260307-006",
  "amount": 500.00,
  "status": "confirmed"
}
```

**What Happens When Webhook Receives Data**:
1. Validates required fields (bill_number, amount, comment)
2. Finds order by order_number in comment field
3. Records payment in payments collection
4. Updates order paid_amount and pending_amount
5. Checks if payment meets threshold
6. Moves order from "Pending" to "Confirmed" if threshold met
7. Sends WhatsApp notification to customer (if configured)
8. Logs the sync event

---

**Last Updated**: March 14, 2026
**Created By**: US Bakers CRM Development Team
