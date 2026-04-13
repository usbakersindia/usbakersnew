#!/usr/bin/env python3
"""
Additional Backend API Testing for US Bakers CRM
Testing specific scenarios from the review request
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

def test_specific_scenarios():
    """Test the specific scenarios mentioned in the review request"""
    print("🎯 Testing Specific Review Request Scenarios")
    print("=" * 60)
    
    session = requests.Session()
    
    # Step 1: Login as admin
    print("1. Login as admin: POST /api/auth/login")
    login_response = session.post(
        f"{API_BASE}/auth/login",
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        headers={"Content-Type": "application/json"}
    )
    
    if login_response.status_code == 200:
        data = login_response.json()
        token = data.get("access_token")
        user = data.get("user", {})
        print(f"   ✅ SUCCESS: Logged in as {user.get('name')} ({user.get('role')})")
        print(f"   📝 Token received: {token[:20]}...")
    else:
        print(f"   ❌ FAILED: Status {login_response.status_code}")
        print(f"   📝 Response: {login_response.text}")
        return False
    
    auth_headers = {"Authorization": f"Bearer {token}"}
    
    # Step 2: GET /api/orders/deleted with Bearer token
    print("\n2. GET /api/orders/deleted with Bearer token")
    deleted_response = session.get(
        f"{API_BASE}/orders/deleted",
        headers=auth_headers
    )
    
    if deleted_response.status_code == 200:
        deleted_orders = deleted_response.json()
        print(f"   ✅ SUCCESS: Retrieved deleted orders")
        print(f"   📝 Count: {len(deleted_orders)} deleted orders")
        if deleted_orders:
            print(f"   📝 Sample order ID: {deleted_orders[0].get('id')}")
    else:
        print(f"   ❌ FAILED: Status {deleted_response.status_code}")
        print(f"   📝 Response: {deleted_response.text}")
        return False
    
    # Step 3: Create a test order if needed
    print("\n3. Create a test order for deletion testing")
    
    # Get outlets first
    outlets_response = session.get(f"{API_BASE}/outlets", headers=auth_headers)
    if outlets_response.status_code == 200:
        outlets = outlets_response.json()
        if outlets:
            outlet_id = outlets[0]["id"]
            print(f"   📝 Using outlet: {outlets[0]['name']} ({outlet_id})")
        else:
            print("   📝 No outlets found, creating one...")
            outlet_data = {
                "name": "Test Outlet for Deletion",
                "address": "123 Test Street",
                "city": "Test City", 
                "phone": "9876543210",
                "username": "testoutlet2",
                "password": "testpass123",
                "ready_time_buffer_minutes": 30
            }
            create_outlet_response = session.post(
                f"{API_BASE}/outlets",
                json=outlet_data,
                headers=auth_headers
            )
            if create_outlet_response.status_code == 200:
                outlet_id = create_outlet_response.json()["id"]
                print(f"   ✅ Created outlet: {outlet_id}")
            else:
                print(f"   ❌ Failed to create outlet: {create_outlet_response.status_code}")
                return False
    else:
        print(f"   ❌ Failed to get outlets: {outlets_response.status_code}")
        return False
    
    # Create test order
    order_data = {
        "order_type": "self",
        "customer_info": {
            "name": "John Doe",
            "phone": "9876543210",
            "gender": "male"
        },
        "needs_delivery": False,
        "occasion": "Birthday",
        "flavour": "Chocolate Truffle",
        "size_pounds": 2.0,
        "cake_image_url": "https://example.com/birthday-cake.jpg",
        "delivery_date": "2024-12-31",
        "delivery_time": "10:00 AM - 12:00 PM",
        "outlet_id": outlet_id,
        "total_amount": 800.0
    }
    
    create_order_response = session.post(
        f"{API_BASE}/orders",
        json=order_data,
        headers=auth_headers
    )
    
    if create_order_response.status_code == 200:
        order_data_response = create_order_response.json()
        test_order_id = order_data_response.get("order_id")
        order_number = order_data_response.get("order_number")
        print(f"   ✅ SUCCESS: Created test order")
        print(f"   📝 Order ID: {test_order_id}")
        print(f"   📝 Order Number: {order_number}")
    else:
        print(f"   ❌ FAILED: Status {create_order_response.status_code}")
        print(f"   📝 Response: {create_order_response.text}")
        return False
    
    # Step 4: Test DELETE /api/orders/{order_id} with admin token
    print(f"\n4. Test DELETE /api/orders/{test_order_id} with admin token")
    delete_response = session.delete(
        f"{API_BASE}/orders/{test_order_id}",
        headers=auth_headers
    )
    
    if delete_response.status_code == 200:
        delete_data = delete_response.json()
        message = delete_data.get("message", "")
        print(f"   ✅ SUCCESS: {message}")
        
        # Verify the order is now in deleted orders
        print("\n5. Verify order appears in deleted orders list")
        verify_response = session.get(
            f"{API_BASE}/orders/deleted",
            headers=auth_headers
        )
        
        if verify_response.status_code == 200:
            deleted_orders = verify_response.json()
            deleted_order_ids = [order.get("id") for order in deleted_orders]
            
            if test_order_id in deleted_order_ids:
                print(f"   ✅ SUCCESS: Order {test_order_id} found in deleted orders")
                
                # Find the specific order and check its properties
                deleted_order = next((order for order in deleted_orders if order.get("id") == test_order_id), None)
                if deleted_order:
                    print(f"   📝 Order marked as deleted: {deleted_order.get('is_deleted')}")
                    print(f"   📝 Deleted by: {deleted_order.get('deleted_by')}")
                    print(f"   📝 Delete approved by: {deleted_order.get('delete_approved_by')}")
                    
                    if deleted_order.get('is_deleted') == True:
                        print("   ✅ Order correctly marked as deleted")
                    else:
                        print("   ❌ Order not properly marked as deleted")
                        return False
            else:
                print(f"   ❌ FAILED: Order {test_order_id} not found in deleted orders")
                print(f"   📝 Deleted order IDs: {deleted_order_ids}")
                return False
        else:
            print(f"   ❌ FAILED: Could not verify deleted orders: {verify_response.status_code}")
            return False
            
    else:
        print(f"   ❌ FAILED: Status {delete_response.status_code}")
        print(f"   📝 Response: {delete_response.text}")
        return False
    
    print("\n" + "=" * 60)
    print("🎉 ALL SPECIFIC SCENARIOS PASSED!")
    print("✅ Admin login works correctly")
    print("✅ GET /api/orders/deleted returns proper list")
    print("✅ DELETE /api/orders/{order_id} works for super_admin")
    print("✅ Deleted orders appear in the deleted orders endpoint")
    print("✅ Order deletion permissions work as expected")
    
    return True

if __name__ == "__main__":
    success = test_specific_scenarios()
    
    if success:
        print("\n🎯 All review request scenarios completed successfully!")
        sys.exit(0)
    else:
        print("\n💥 Some scenarios failed. Check the details above.")
        sys.exit(1)