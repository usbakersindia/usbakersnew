"""
Test Order Lifecycle: New Order → Kitchen Start Preparing → Mark Ready → Ready to Deliver → Assign Delivery
Tests the complete order flow as specified in the requirements.
"""
import pytest
import requests
import os
from datetime import datetime

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://bakery-system-build.preview.emergentagent.com')

# Test credentials
ADMIN_EMAIL = "admin@usbakers.com"
ADMIN_PASSWORD = "admin123"
KITCHEN_EMAIL = "kitchen@usbakers.com"
KITCHEN_PASSWORD = "kitchen123"
DELIVERY_EMAIL = "delivery@usbakers.com"
DELIVERY_PASSWORD = "delivery123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    assert response.status_code == 200, f"Admin login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def kitchen_token():
    """Get kitchen token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": KITCHEN_EMAIL,
        "password": KITCHEN_PASSWORD
    })
    assert response.status_code == 200, f"Kitchen login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def delivery_token():
    """Get delivery token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DELIVERY_EMAIL,
        "password": DELIVERY_PASSWORD
    })
    assert response.status_code == 200, f"Delivery login failed: {response.text}"
    return response.json()["access_token"]


@pytest.fixture(scope="module")
def outlet_id(admin_token):
    """Get first outlet ID"""
    response = requests.get(
        f"{BASE_URL}/api/outlets",
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert response.status_code == 200, f"Failed to get outlets: {response.text}"
    outlets = response.json()
    assert len(outlets) > 0, "No outlets found"
    return outlets[0]["id"]


class TestAuth:
    """Test authentication for all user roles"""
    
    def test_admin_login(self):
        """Test admin login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": ADMIN_EMAIL,
            "password": ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Admin login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == ADMIN_EMAIL
        assert data["user"]["role"] == "super_admin"
        print(f"✓ Admin login successful - Role: {data['user']['role']}")
    
    def test_kitchen_login(self):
        """Test kitchen user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": KITCHEN_EMAIL,
            "password": KITCHEN_PASSWORD
        })
        assert response.status_code == 200, f"Kitchen login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "kitchen"
        print(f"✓ Kitchen login successful - Role: {data['user']['role']}")
    
    def test_delivery_login(self):
        """Test delivery user login"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": DELIVERY_EMAIL,
            "password": DELIVERY_PASSWORD
        })
        assert response.status_code == 200, f"Delivery login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["role"] == "delivery"
        print(f"✓ Delivery login successful - Role: {data['user']['role']}")


class TestMasterData:
    """Test master data endpoints"""
    
    def test_get_outlets(self, admin_token):
        """Get outlets"""
        response = requests.get(
            f"{BASE_URL}/api/outlets",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get outlets: {response.text}"
        outlets = response.json()
        assert len(outlets) > 0, "No outlets found"
        print(f"✓ Found {len(outlets)} outlets")
    
    def test_get_time_slots(self, admin_token):
        """Get time slots"""
        response = requests.get(
            f"{BASE_URL}/api/time-slots",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get time slots: {response.text}"
        slots = response.json()
        print(f"✓ Found {len(slots)} time slots")
    
    def test_get_flavours(self, admin_token):
        """Get flavours"""
        response = requests.get(
            f"{BASE_URL}/api/flavours",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get flavours: {response.text}"
        flavours = response.json()
        print(f"✓ Found {len(flavours)} flavours")
    
    def test_get_delivery_persons(self, admin_token):
        """Get delivery persons"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/persons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to get delivery persons: {response.text}"
        persons = response.json()
        print(f"✓ Found {len(persons)} delivery persons")


class TestOrderLifecycle:
    """Test the complete order lifecycle flow"""
    
    def test_full_order_lifecycle(self, admin_token, kitchen_token, delivery_token, outlet_id):
        """Test complete order lifecycle: Create → Payment → Kitchen Prepare → Ready → Ready to Deliver → Assign Delivery → Delivered"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Step 1: Create order
        print("\n=== Step 1: Create Order ===")
        order_data = {
            "order_type": "self",
            "customer_info": {
                "name": "TEST_Lifecycle_Customer",
                "phone": "9876543210"
            },
            "needs_delivery": True,
            "delivery_address": "123 Test Street",
            "delivery_city": "Mumbai",
            "occasion": "Birthday",
            "flavour": "Chocolate",
            "size_pounds": 2.0,
            "cake_image_url": "/uploads/test-cake.jpg",
            "name_on_cake": "Happy Birthday",
            "delivery_date": today,
            "delivery_time": "05:00 PM - 07:00 PM",
            "outlet_id": outlet_id,
            "total_amount": 1500.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders?is_punch_order=true",
            json=order_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        data = response.json()
        order_id = data["order_id"]
        order_number = data["order_number"]
        print(f"✓ Order created - ID: {order_id}, Number: {order_number}")
        
        # Step 2: Verify order in pending
        print("\n=== Step 2: Verify Order in Pending ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/pending",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        order_ids = [o["id"] for o in orders]
        assert order_id in order_ids, "Order not found in pending orders"
        print(f"✓ Order found in pending orders")
        
        # Step 3: Add payment to confirm order
        print("\n=== Step 3: Add Payment ===")
        payment_data = {
            "order_id": order_id,
            "amount": 500.0,
            "payment_method": "cash"
        }
        response = requests.post(
            f"{BASE_URL}/api/payments",
            json=payment_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to add payment: {response.text}"
        print(f"✓ Payment of ₹500 added")
        
        # Step 4: Verify order in manage orders with confirmed status
        print("\n=== Step 4: Verify Order Confirmed ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        assert test_order is not None, "Order not found in manage orders"
        assert test_order["status"] == "confirmed", f"Expected 'confirmed', got '{test_order['status']}'"
        print(f"✓ Order confirmed in manage orders")
        
        # Step 5: Kitchen starts preparing
        print("\n=== Step 5: Kitchen Starts Preparing ===")
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "in_progress"},
            headers={"Authorization": f"Bearer {kitchen_token}"}
        )
        assert response.status_code == 200, f"Failed to start preparing: {response.text}"
        print(f"✓ Order status changed to 'in_progress'")
        
        # Step 6: Verify preparing status
        print("\n=== Step 6: Verify Preparing Status ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        assert test_order["status"] == "in_progress", f"Expected 'in_progress', got '{test_order['status']}'"
        print(f"✓ Order verified in 'in_progress' status")
        
        # Step 7: Kitchen marks ready
        print("\n=== Step 7: Kitchen Marks Ready ===")
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "ready"},
            headers={"Authorization": f"Bearer {kitchen_token}"}
        )
        assert response.status_code == 200, f"Failed to mark ready: {response.text}"
        print(f"✓ Order status changed to 'ready'")
        
        # Step 8: Verify ready status
        print("\n=== Step 8: Verify Ready Status ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        assert test_order["status"] == "ready", f"Expected 'ready', got '{test_order['status']}'"
        assert test_order["is_ready"] == True, "is_ready should be True"
        print(f"✓ Order verified in 'ready' status")
        
        # Step 9: Counter marks ready to deliver with photo
        print("\n=== Step 9: Counter Marks Ready to Deliver ===")
        response = requests.post(
            f"{BASE_URL}/api/orders/{order_id}/ready-to-deliver?image_url=/uploads/actual-cake.jpg",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to mark ready to deliver: {response.text}"
        print(f"✓ Order marked as 'ready_to_deliver' with photo")
        
        # Step 10: Verify ready_to_deliver status
        print("\n=== Step 10: Verify Ready to Deliver Status ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        assert test_order["status"] == "ready_to_deliver", f"Expected 'ready_to_deliver', got '{test_order['status']}'"
        assert test_order.get("actual_cake_image_url") is not None, "actual_cake_image_url should be set"
        print(f"✓ Order verified in 'ready_to_deliver' status")
        
        # Step 11: Get delivery persons and assign
        print("\n=== Step 11: Assign Delivery Person ===")
        response = requests.get(
            f"{BASE_URL}/api/delivery/persons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        persons = response.json()
        assert len(persons) > 0, "No delivery persons available"
        delivery_person_id = persons[0]["id"]
        
        response = requests.post(
            f"{BASE_URL}/api/delivery/assign-order/{order_id}?delivery_person_id={delivery_person_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to assign delivery: {response.text}"
        print(f"✓ Delivery person assigned: {persons[0]['name']}")
        
        # Step 12: Verify picked_up status
        print("\n=== Step 12: Verify Picked Up Status ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        assert test_order["status"] == "picked_up", f"Expected 'picked_up', got '{test_order['status']}'"
        assert test_order.get("assigned_delivery_partner") is not None, "assigned_delivery_partner should be set"
        print(f"✓ Order verified in 'picked_up' status")
        
        # Step 13: Delivery marks delivered
        print("\n=== Step 13: Delivery Marks Delivered ===")
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status",
            json={"status": "delivered"},
            headers={"Authorization": f"Bearer {delivery_token}"}
        )
        assert response.status_code == 200, f"Failed to mark delivered: {response.text}"
        print(f"✓ Order marked as 'delivered'")
        
        # Step 14: Verify delivered status
        print("\n=== Step 14: Verify Delivered Status ===")
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        orders = response.json()
        test_order = next((o for o in orders if o["id"] == order_id), None)
        assert test_order["status"] == "delivered", f"Expected 'delivered', got '{test_order['status']}'"
        print(f"✓ Order verified in 'delivered' status - LIFECYCLE COMPLETE!")
        
        # Cleanup
        print("\n=== Cleanup ===")
        response = requests.delete(
            f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200:
            print(f"✓ Test order cleaned up")


class TestEditOrder:
    """Test order editing functionality"""
    
    def test_edit_order(self, admin_token, outlet_id):
        """Test editing an order"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        # Create order
        order_data = {
            "order_type": "self",
            "customer_info": {
                "name": "TEST_Edit_Customer",
                "phone": "9876543211"
            },
            "needs_delivery": False,
            "occasion": "Anniversary",
            "flavour": "Vanilla",
            "size_pounds": 1.5,
            "cake_image_url": "/uploads/test-cake.jpg",
            "delivery_date": today,
            "delivery_time": "09:00 AM - 11:00 AM",
            "outlet_id": outlet_id,
            "total_amount": 1000.0
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders?is_punch_order=false",
            json=order_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to create order: {response.text}"
        order_id = response.json()["order_id"]
        print(f"✓ Order created for edit test: {order_id}")
        
        # Edit the order
        edit_data = {
            "customer_info": {
                "name": "TEST_Edit_Customer_Updated",
                "phone": "9876543211"
            },
            "special_instructions": "Updated instructions"
        }
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}",
            json=edit_data,
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed to edit order: {response.text}"
        print(f"✓ Order edited successfully")
        
        # Cleanup
        requests.delete(
            f"{BASE_URL}/api/orders/{order_id}",
            headers={"Authorization": f"Bearer {admin_token}"}
        )


class TestKitchenDashboard:
    """Test kitchen dashboard functionality"""
    
    def test_kitchen_orders(self, kitchen_token):
        """Test getting kitchen orders"""
        today = datetime.now().strftime('%Y-%m-%d')
        
        response = requests.get(
            f"{BASE_URL}/api/kitchen/orders?date={today}",
            headers={"Authorization": f"Bearer {kitchen_token}"}
        )
        assert response.status_code == 200, f"Failed to get kitchen orders: {response.text}"
        orders = response.json()
        print(f"✓ Kitchen sees {len(orders)} orders for today")


class TestDeliveryDashboard:
    """Test delivery dashboard functionality"""
    
    def test_delivery_my_orders(self, delivery_token):
        """Test getting delivery person's orders"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-orders",
            headers={"Authorization": f"Bearer {delivery_token}"}
        )
        assert response.status_code == 200, f"Failed to get delivery orders: {response.text}"
        orders = response.json()
        print(f"✓ Delivery person sees {len(orders)} assigned orders")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
