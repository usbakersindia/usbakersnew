# 📱 MSG91 WhatsApp Integration - Complete Guide

## ✅ IMPLEMENTATION COMPLETE

### 🎉 What Was Built

**MSG91 WhatsApp Business API Integration with Full Admin Control**

---

## 🆕 New Features Added

### 1. **Backend API Endpoints** ✅

**Configuration Endpoints:**
- `GET /api/msg91/config` - Get MSG91 credentials
- `POST /api/msg91/config` - Save/Update auth key & integrated number

**Template Endpoints:**
- `GET /api/msg91/templates` - Get all 5 event templates
- `POST /api/msg91/templates` - Create/Update templates

**Message Sending:**
- `send_msg91_whatsapp(order_id, event_type)` - Send WhatsApp via MSG91
- Auto-triggers on order status updates
- Fallback to AiSensy if MSG91 fails

---

### 2. **Admin Configuration Panel** ✅

**New Page:** `/msg91-settings`

**Tab 1: API Configuration**
- Auth Key input (from MSG91 dashboard)
- Integrated Number (WhatsApp Business Number)
- Save configuration button
- Helper guide for getting credentials

**Tab 2: Templates**
- 5 event template cards
- Each template has:
  - Template Name field
  - Namespace field
  - Enable/Disable toggle
  - Save button
  - Auto-populated variables (body_1 to body_4)

---

### 3. **Database Models** ✅

**Collections Created:**
- `msg91_config` - Stores API credentials
- `msg91_templates` - Stores 5 event templates

**Template Structure:**
```javascript
{
  id: "uuid",
  event_type: "order_placed",
  template_name: "order_confirmation",
  namespace: "7d362f25_30fe_479e_8b13...",
  language_code: "en",
  language_policy: "deterministic",
  variables: ["body_1", "body_2", "body_3", "body_4"],
  is_enabled: true,
  created_at: "2024-...",
  updated_at: "2024-..."
}
```

---

### 4. **Automatic WhatsApp Sending** ✅

**Priority:** MSG91 First, AiSensy Fallback

**Workflow:**
1. Order status updated
2. Try MSG91 (if configured & template enabled)
3. If MSG91 fails/not configured → Try AiSensy
4. Log all attempts to database

**Supported Events:**
- Order Placed
- Order Confirmed
- Order Ready
- Out for Delivery
- Delivered

---

## 📋 How to Use

### Step 1: Get MSG91 Credentials

**On MSG91 Dashboard:**
1. Login to https://control.msg91.com/
2. Go to **Settings** → **API Keys**
3. Copy your **Auth Key**
4. Go to **WhatsApp** → **Settings**
5. Copy your **Integrated Number** (e.g., 918699391076)

---

### Step 2: Create Templates in MSG91

**For Each Event (5 total):**

1. Go to **WhatsApp** → **Templates**
2. Click **Create Template**
3. **Template Details:**
   - Name: e.g., `order_confirmed`
   - Category: Transactional
   - Language: English
   - Body: Add your message with variables

**Example Template Body:**
```
Hi {{1}},

Your order {{2}} has been confirmed! 🎂

Delivery Details:
📅 Date: {{3}}
⏰ Time: {{4}}

Thank you for choosing US Bakers!
```

4. **Submit for Approval**
5. Wait for WhatsApp approval (24-48 hours)
6. Once approved, note the **Namespace** (found in template details)

---

### Step 3: Configure in US Bakers CRM

**Login as Super Admin:**
1. Navigate to **WhatsApp (MSG91)** in sidebar
2. Go to **API Configuration** tab
3. Enter:
   - Auth Key: `your_msg91_authkey`
   - Integrated Number: `918699391076`
4. Click **Save Configuration**

---

### Step 4: Set Up Templates

**For Each Event:**
1. Go to **Templates** tab
2. Find the event card (e.g., Order Confirmed)
3. Enter:
   - **Template Name:** The exact name from MSG91 (e.g., `order_confirmed`)
   - **Namespace:** Copy from MSG91 template details
4. Toggle **Enable** to ON
5. Click **Save Template**

**Repeat for all 5 events!**

---

## 📊 MSG91 API Format

**Payload Structure:**
```json
{
  "integrated_number": "918699391076",
  "content_type": "template",
  "payload": {
    "messaging_product": "whatsapp",
    "type": "template",
    "template": {
      "name": "order_confirmed",
      "language": {
        "code": "en",
        "policy": "deterministic"
      },
      "namespace": "7d362f25_30fe_479e_8b13_e6aa83e53359",
      "to_and_components": [
        {
          "to": ["918699391076"],
          "components": {
            "body_1": { "type": "text", "value": "Customer Name" },
            "body_2": { "type": "text", "value": "Order #ABC123" },
            "body_3": { "type": "text", "value": "2024-03-15" },
            "body_4": { "type": "text", "value": "6:00 PM" }
          }
        }
      ]
    }
  }
}
```

**Headers:**
```json
{
  "Content-Type": "application/json",
  "authkey": "your_msg91_authkey"
}
```

---

## 🔄 Auto-Population of Variables

**System automatically fills:**
- `body_1` → Customer Name (from order.customer_info.name)
- `body_2` → Order Number (from order.order_number)
- `body_3` → Delivery Date (from order.delivery_date)
- `body_4` → Delivery Time (from order.delivery_time)

**You don't need to manually set these!** ✨

---

## 🎯 Testing

### Test Configuration:
```bash
# 1. Test API config endpoint
curl -X GET https://www.usbakers.tech/api/msg91/config \
  -H "Authorization: Bearer YOUR_TOKEN"

# 2. Save config
curl -X POST https://www.usbakers.tech/api/msg91/config \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "auth_key": "your_authkey",
    "integrated_number": "918699391076"
  }'

# 3. Test template save
curl -X POST https://www.usbakers.tech/api/msg91/templates \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "event_type": "order_confirmed",
    "template_name": "order_confirmed",
    "namespace": "7d362f25_30fe_479e_8b13_e6aa83e53359",
    "language_code": "en",
    "language_policy": "deterministic",
    "variables": ["body_1", "body_2", "body_3", "body_4"],
    "is_enabled": true
  }'
```

### Test Order Flow:
1. Create new order
2. Update status to "Confirmed"
3. Check WhatsApp logs:
   ```bash
   curl -X GET https://www.usbakers.tech/api/whatsapp/logs \
     -H "Authorization: Bearer YOUR_TOKEN"
   ```
4. Verify customer received WhatsApp message

---

## 📱 Phone Number Format

**Important:** MSG91 expects phone numbers **without** the `+` sign

**Correct Formats:**
- ✅ `918699391076` (India)
- ✅ `19876543210` (USA)
- ✅ `447123456789` (UK)

**Incorrect:**
- ❌ `+918699391076`
- ❌ `+1-987-654-3210`
- ❌ `91 8699391076`

**System automatically removes + and spaces!**

---

## 🔐 Security

**Credentials Storage:**
- Auth key stored in MongoDB
- Not exposed in frontend
- Only Super Admin can access

**API Security:**
- All endpoints require authentication
- JWT token validation
- Super Admin role check

---

## 🆚 MSG91 vs AiSensy

| Feature | MSG91 | AiSensy |
|---------|-------|---------|
| **Setup** | Manual templates in dashboard | Template strings in CRM |
| **Approval** | WhatsApp approval needed | WhatsApp approval needed |
| **Variables** | body_1, body_2, etc. | {{1}}, {{2}}, etc. |
| **Namespace** | Required | Not required |
| **Phone Format** | Without + | With + |
| **Fallback** | Falls back to AiSensy | Primary option |
| **Cost** | MSG91 pricing | AiSensy pricing |

**System Preference:** MSG91 is tried first, AiSensy is backup

---

## 🎨 UI Features

**MSG91 Settings Page:**
- ✅ Two-tab interface (Config + Templates)
- ✅ Color-coded event cards
- ✅ Active/Inactive badges
- ✅ Enable/Disable toggles
- ✅ Helper instructions
- ✅ Form validation
- ✅ Success/Error messages

**Sidebar:**
- ✅ Two WhatsApp menu items:
  - "WhatsApp (AiSensy)"
  - "WhatsApp (MSG91)"

---

## 📚 Documentation Links

**MSG91 Resources:**
- Dashboard: https://control.msg91.com/
- API Docs: https://docs.msg91.com/
- WhatsApp Docs: https://docs.msg91.com/p/whatsapp-api
- Support: https://msg91.com/help

---

## ✅ Deployment Checklist

- [ ] MSG91 account created
- [ ] WhatsApp Business API activated
- [ ] 5 templates created in MSG91
- [ ] Templates approved by WhatsApp
- [ ] Auth Key obtained
- [ ] Integrated Number noted
- [ ] Configuration saved in CRM
- [ ] All 5 templates configured in CRM
- [ ] Templates enabled
- [ ] Test order created
- [ ] WhatsApp message received

---

## 🐛 Troubleshooting

### Issue: "Template not found"
**Solution:** Check template name matches exactly (case-sensitive)

### Issue: "Invalid namespace"
**Solution:** Copy namespace from MSG91 template details page

### Issue: "Message not sent"
**Solution:** 
1. Check auth key is correct
2. Verify template is approved by WhatsApp
3. Check template is enabled in CRM
4. Verify phone number has country code
5. Check MSG91 account balance

### Issue: "No MSG91 config found"
**Solution:** Save configuration in API Configuration tab first

---

## 📊 System Flow

```
Order Status Updated
        ↓
System checks MSG91 config
        ↓
    Is Active?
   ↙        ↘
  NO         YES
   ↓          ↓
Try      Get Template
AiSensy       ↓
          Is Enabled?
         ↙        ↘
        NO        YES
         ↓         ↓
    Try      Send MSG91
  AiSensy     WhatsApp
                 ↓
            Log Result
```

---

## 🎉 Summary

**What You Have Now:**
✅ Full MSG91 WhatsApp integration  
✅ Admin panel to configure credentials  
✅ Template management for 5 events  
✅ Automatic message sending  
✅ Fallback to AiSensy  
✅ Message logging  
✅ User-friendly UI  

**What Admin Can Do:**
✅ Add/Update MSG91 auth key  
✅ Set WhatsApp Business Number  
✅ Configure 5 event templates  
✅ Enable/Disable per template  
✅ View message logs  

**What Happens Automatically:**
✅ Order status change → WhatsApp sent  
✅ Variables auto-filled from order data  
✅ Logs stored in database  
✅ Fallback if MSG91 unavailable  

---

## 🚀 Quick Start

**5-Minute Setup:**
1. Get MSG91 credentials (2 mins)
2. Enter in CRM Settings (1 min)
3. Configure one template (2 mins)
4. Enable template
5. Test with real order!

**Your MSG91 WhatsApp Integration is READY! 🎉**

---

**Files Modified:**
- `/app/backend/server.py` - Added MSG91 models, endpoints, send function
- `/app/frontend/src/pages/MSG91Settings.js` - NEW admin panel
- `/app/frontend/src/App.js` - Added route
- `/app/frontend/src/components/Sidebar.js` - Added menu item

**Test Access:** https://www.usbakers.tech/msg91-settings  
**Admin Required:** Super Admin only
