"""
Test new features for US Bakers CRM - Iteration 7
Tests:
1. CreditOrders page - GET /api/orders/credit
2. KitchenDashboard - GET /api/kitchen/orders
3. ManageOrders - set-pickup endpoint
4. DeliveryDashboard - available/my orders endpoints
"""
import pytest
import requests
import os
import time

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
ADMIN_EMAIL = "admin@usbakers.com"
ADMIN_PASSWORD = "admin123"
KITCHEN_EMAIL = "kitchen@usbakers.com"
KITCHEN_PASSWORD = "kitchen123"
DELIVERY_EMAIL = "delivery@usbakers.com"
DELIVERY_PASSWORD = "delivery123"


@pytest.fixture(scope="module")
def admin_token():
    """Get admin authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": ADMIN_EMAIL,
        "password": ADMIN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Admin authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def kitchen_token():
    """Get kitchen staff authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": KITCHEN_EMAIL,
        "password": KITCHEN_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Kitchen authentication failed: {response.status_code} - {response.text}")


@pytest.fixture(scope="module")
def delivery_token():
    """Get delivery person authentication token"""
    response = requests.post(f"{BASE_URL}/api/auth/login", json={
        "email": DELIVERY_EMAIL,
        "password": DELIVERY_PASSWORD
    })
    if response.status_code == 200:
        return response.json().get("access_token")
    pytest.skip(f"Delivery authentication failed: {response.status_code} - {response.text}")


class TestHealthCheck:
    """Basic health check"""
    
    def test_api_health(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data.get("status") == "healthy"
        print(f"✓ Health check passed: {data}")


class TestCreditOrdersAPI:
    """Test Credit Orders page API - GET /api/orders/credit"""
    
    def test_get_credit_orders_authenticated(self, admin_token):
        """Test fetching credit orders with admin token"""
        response = requests.get(
            f"{BASE_URL}/api/orders/credit",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Credit orders endpoint returned {len(data)} orders")
        
        # Validate structure if orders exist
        if len(data) > 0:
            order = data[0]
            assert "id" in order
            assert "order_number" in order
            print(f"✓ Credit order structure validated: #{order.get('order_number')}")
    
    def test_get_credit_orders_unauthenticated(self):
        """Test credit orders endpoint without auth - should fail"""
        response = requests.get(f"{BASE_URL}/api/orders/credit")
        assert response.status_code in [401, 403]
        print("✓ Credit orders endpoint correctly requires authentication")


class TestMarkComplementaryAPI:
    """Test mark-complementary endpoint"""
    
    def test_mark_complementary_endpoint_exists(self, admin_token):
        """Test that mark-complementary endpoint exists (may fail if no credit orders)"""
        # First get credit orders
        response = requests.get(
            f"{BASE_URL}/api/orders/credit",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            order_id = response.json()[0]["id"]
            # Try to mark as complementary
            mark_response = requests.post(
                f"{BASE_URL}/api/orders/{order_id}/mark-complementary?is_complementary=true",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            # Should succeed or fail with valid error (not 404 for endpoint)
            assert mark_response.status_code in [200, 400, 403]
            print(f"✓ Mark complementary endpoint exists and responds: {mark_response.status_code}")
        else:
            print("⚠ No credit orders to test mark-complementary")


class TestKitchenDashboardAPI:
    """Test Kitchen Dashboard API - GET /api/kitchen/orders"""
    
    def test_get_kitchen_orders_authenticated(self, kitchen_token):
        """Test fetching kitchen orders with kitchen staff token"""
        response = requests.get(
            f"{BASE_URL}/api/kitchen/orders",
            headers={"Authorization": f"Bearer {kitchen_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Kitchen orders endpoint returned {len(data)} orders")
        
        # Validate structure if orders exist
        if len(data) > 0:
            order = data[0]
            assert "id" in order
            assert "order_number" in order
            assert "status" in order
            print(f"✓ Kitchen order structure validated: #{order.get('order_number')} - {order.get('status')}")
    
    def test_get_kitchen_orders_unauthenticated(self):
        """Test kitchen orders endpoint without auth - should fail"""
        response = requests.get(f"{BASE_URL}/api/kitchen/orders")
        assert response.status_code in [401, 403]
        print("✓ Kitchen orders endpoint correctly requires authentication")


class TestSetPickupAPI:
    """Test set-pickup endpoint - POST /api/orders/{id}/set-pickup"""
    
    def test_set_pickup_endpoint_structure(self, admin_token):
        """Test set-pickup endpoint exists and has correct structure"""
        # First get an order to test with
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        if response.status_code == 200 and len(response.json()) > 0:
            order_id = response.json()[0]["id"]
            
            # Test set pickup=true
            pickup_response = requests.post(
                f"{BASE_URL}/api/orders/{order_id}/set-pickup?pickup=true",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            # Should succeed or fail with valid error
            assert pickup_response.status_code in [200, 400, 403, 404]
            print(f"✓ Set pickup endpoint responds: {pickup_response.status_code}")
            
            if pickup_response.status_code == 200:
                data = pickup_response.json()
                assert "message" in data
                print(f"✓ Set pickup response: {data.get('message')}")
                
                # Verify the order was updated
                verify_response = requests.get(
                    f"{BASE_URL}/api/orders/{order_id}",
                    headers={"Authorization": f"Bearer {admin_token}"}
                )
                if verify_response.status_code == 200:
                    order_data = verify_response.json()
                    assert order_data.get("pickup_by_customer") == True
                    assert order_data.get("needs_delivery") == False
                    print("✓ Order pickup_by_customer and needs_delivery fields updated correctly")
        else:
            print("⚠ No orders available to test set-pickup")


class TestDeliveryDashboardAPI:
    """Test Delivery Dashboard APIs"""
    
    def test_get_available_orders(self, delivery_token):
        """Test fetching available orders for delivery"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/available-orders",
            headers={"Authorization": f"Bearer {delivery_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Available orders endpoint returned {len(data)} orders")
        
        # Validate structure if orders exist
        if len(data) > 0:
            order = data[0]
            assert "id" in order
            assert "order_number" in order
            # Check for payment fields needed for payment status banner
            assert "total_amount" in order or order.get("total_amount") is not None
            print(f"✓ Available order structure validated: #{order.get('order_number')}")
    
    def test_get_my_orders(self, delivery_token):
        """Test fetching my orders for delivery person"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/my-orders",
            headers={"Authorization": f"Bearer {delivery_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ My orders endpoint returned {len(data)} orders")
    
    def test_delivery_endpoints_unauthenticated(self):
        """Test delivery endpoints without auth - should fail"""
        available_response = requests.get(f"{BASE_URL}/api/delivery/available-orders")
        my_response = requests.get(f"{BASE_URL}/api/delivery/my-orders")
        
        assert available_response.status_code in [401, 403]
        assert my_response.status_code in [401, 403]
        print("✓ Delivery endpoints correctly require authentication")


class TestManageOrdersAPI:
    """Test Manage Orders API - GET /api/orders/manage"""
    
    def test_get_manage_orders(self, admin_token):
        """Test fetching orders for manage orders page"""
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Manage orders endpoint returned {len(data)} orders")
        
        # Validate structure if orders exist
        if len(data) > 0:
            order = data[0]
            assert "id" in order
            assert "order_number" in order
            assert "status" in order
            assert "customer_info" in order
            print(f"✓ Manage order structure validated: #{order.get('order_number')}")


class TestTimeSlotsAPI:
    """Test Time Slots API used by Kitchen Dashboard"""
    
    def test_get_time_slots(self, kitchen_token):
        """Test fetching time slots"""
        response = requests.get(
            f"{BASE_URL}/api/time-slots",
            headers={"Authorization": f"Bearer {kitchen_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Time slots endpoint returned {len(data)} slots")
        
        if len(data) > 0:
            slot = data[0]
            assert "time_slot" in slot
            print(f"✓ Time slot structure validated: {slot.get('time_slot')}")


class TestDeliveryPersonsAPI:
    """Test Delivery Persons API used by ManageOrders"""
    
    def test_get_delivery_persons(self, admin_token):
        """Test fetching delivery persons list"""
        response = requests.get(
            f"{BASE_URL}/api/delivery/persons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Delivery persons endpoint returned {len(data)} persons")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
