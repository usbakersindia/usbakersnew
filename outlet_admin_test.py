#!/usr/bin/env python3
"""
Test outlet_admin delete permissions for US Bakers CRM
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from environment
BACKEND_URL = "https://335fff4e-2684-4e97-8c4c-790cfa84ee6f.preview.emergentagent.com"
API_BASE = f"{BACKEND_URL}/api"

# Test credentials
ADMIN_EMAIL = "admin@usbakers.com"
ADMIN_PASSWORD = "admin123"

def test_outlet_admin_permissions():
    """Test that outlet_admin can delete orders directly"""
    print("🏪 Testing Outlet Admin Delete Permissions")
    print("=" * 60)
    
    session = requests.Session()
    
    # Step 1: Login as super admin to create outlet admin user
    print("1. Login as super admin")
    login_response = session.post(
        f"{API_BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}
    )
    
    if login_response.status_code != 200:
        print(f"   ❌ FAILED: Super admin login failed")
        return False
    
    admin_token = login_response.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("   ✅ SUCCESS: Super admin logged in")
    
    # Step 2: Get an outlet for the outlet admin
    outlets_response = session.get(f"{API_BASE}/outlets", headers=admin_headers)
    if outlets_response.status_code == 200:
        outlets = outlets_response.json()
        if outlets:
            outlet_id = outlets[0]["id"]
            print(f"   📝 Using outlet: {outlets[0]['name']}")
        else:
            print("   ❌ No outlets available")
            return False
    else:
        print("   ❌ Failed to get outlets")
        return False
    
    # Step 3: Create outlet admin user
    print("\n2. Create outlet admin user")
    outlet_admin_data = {
        "email": "outletadmin@usbakers.com",
        "name": "Outlet Admin Test",
        "phone": "9876543210",
        "role": "outlet_admin",
        "password": "outletadmin123",
        "outlet_id": outlet_id
    }
    
    create_user_response = session.post(
        f"{API_BASE}/users",
        json=outlet_admin_data,
        headers=admin_headers
    )
    
    if create_user_response.status_code == 200:
        outlet_admin_user = create_user_response.json()
        print(f"   ✅ SUCCESS: Created outlet admin user")
        print(f"   📝 User ID: {outlet_admin_user['id']}")
    else:
        print(f"   ❌ FAILED: Status {create_user_response.status_code}")
        print(f"   📝 Response: {create_user_response.text}")
        # Check if user already exists
        if "already exists" in create_user_response.text:
            print("   📝 User already exists, continuing with existing user")
        else:
            return False
    
    # Step 4: Login as outlet admin
    print("\n3. Login as outlet admin")
    outlet_login_response = session.post(
        f"{API_BASE}/auth/login",
        json={"email": "outletadmin@usbakers.com", "password": "outletadmin123"}
    )
    
    if outlet_login_response.status_code == 200:
        outlet_data = outlet_login_response.json()
        outlet_token = outlet_data["access_token"]
        outlet_user = outlet_data["user"]
        outlet_headers = {"Authorization": f"Bearer {outlet_token}"}
        print(f"   ✅ SUCCESS: Logged in as {outlet_user['name']} ({outlet_user['role']})")
    else:
        print(f"   ❌ FAILED: Status {outlet_login_response.status_code}")
        print(f"   📝 Response: {outlet_login_response.text}")
        return False
    
    # Step 5: Create a test order (as super admin)
    print("\n4. Create test order for deletion")
    order_data = {
        "order_type": "self",
        "customer_info": {
            "name": "Test Customer for Outlet Admin",
            "phone": "9876543211",
            "gender": "female"
        },
        "needs_delivery": False,
        "occasion": "Anniversary",
        "flavour": "Vanilla",
        "size_pounds": 1.5,
        "cake_image_url": "https://example.com/anniversary-cake.jpg",
        "delivery_date": "2024-12-31",
        "delivery_time": "2:00 PM - 4:00 PM",
        "outlet_id": outlet_id,
        "total_amount": 600.0
    }
    
    create_order_response = session.post(
        f"{API_BASE}/orders",
        json=order_data,
        headers=admin_headers  # Create as admin
    )
    
    if create_order_response.status_code == 200:
        order_response = create_order_response.json()
        test_order_id = order_response["order_id"]
        print(f"   ✅ SUCCESS: Created test order {test_order_id}")
    else:
        print(f"   ❌ FAILED: Status {create_order_response.status_code}")
        return False
    
    # Step 6: Test outlet admin can delete the order
    print(f"\n5. Test outlet admin can delete order {test_order_id}")
    delete_response = session.delete(
        f"{API_BASE}/orders/{test_order_id}",
        headers=outlet_headers  # Use outlet admin token
    )
    
    if delete_response.status_code == 200:
        delete_data = delete_response.json()
        message = delete_data.get("message", "")
        print(f"   ✅ SUCCESS: {message}")
        
        if "deleted successfully" in message.lower():
            print("   ✅ Outlet admin can delete orders directly")
        else:
            print("   ❌ Unexpected response message")
            return False
    else:
        print(f"   ❌ FAILED: Status {delete_response.status_code}")
        print(f"   📝 Response: {delete_response.text}")
        return False
    
    # Step 7: Verify order appears in deleted orders (as outlet admin)
    print("\n6. Verify outlet admin can see deleted orders")
    deleted_orders_response = session.get(
        f"{API_BASE}/orders/deleted",
        headers=outlet_headers
    )
    
    if deleted_orders_response.status_code == 200:
        deleted_orders = deleted_orders_response.json()
        deleted_order_ids = [order.get("id") for order in deleted_orders]
        
        if test_order_id in deleted_order_ids:
            print(f"   ✅ SUCCESS: Outlet admin can see deleted order {test_order_id}")
        else:
            print(f"   ❌ FAILED: Deleted order not visible to outlet admin")
            return False
    else:
        print(f"   ❌ FAILED: Status {deleted_orders_response.status_code}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 OUTLET ADMIN PERMISSIONS TEST PASSED!")
    print("✅ Outlet admin can delete orders directly")
    print("✅ Outlet admin can view deleted orders")
    print("✅ Delete permissions work correctly for outlet_admin role")
    
    return True

if __name__ == "__main__":
    success = test_outlet_admin_permissions()
    
    if success:
        print("\n🏪 Outlet admin permissions test completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Outlet admin permissions test failed.")
        sys.exit(1)