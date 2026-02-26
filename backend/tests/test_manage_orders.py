"""
Comprehensive tests for US Bakers CRM - Manage Orders & Outlet Management
Tests cover:
- Outlet Management (CRUD with username/password)
- Branch Summary Dashboard
- Manage Orders (status workflow, search, filtering)
- Payment Recording
- Status Updates with WhatsApp triggers
"""
import pytest
import requests
import os
import time
from datetime import datetime, timezone

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL').rstrip('/')

# Test credentials
SUPER_ADMIN_EMAIL = "admin@usbakers.com"
SUPER_ADMIN_PASSWORD = "admin123"


class TestAuthAndSetup:
    """Authentication and setup tests"""
    
    def test_health_check(self):
        """Test API health endpoint"""
        response = requests.get(f"{BASE_URL}/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data['status'] == 'healthy'
        print("✓ Health check passed")
    
    def test_super_admin_login(self):
        """Test super admin login"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'access_token' in data
        assert data['user']['role'] == 'super_admin'
        print(f"✓ Super admin login successful - User: {data['user']['name']}")
        return data['access_token']


class TestOutletManagement:
    """Outlet Management tests - Create/Edit with username/password"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_outlet_with_credentials(self):
        """Test creating outlet with username/password"""
        test_outlet = {
            "name": "TEST_Downtown Bakery",
            "address": "123 Main Street",
            "city": "Mumbai",
            "phone": "+911234567890",
            "username": f"test_outlet_{int(time.time())}",
            "password": "test123secure",
            "ready_time_buffer_minutes": 45
        }
        
        response = requests.post(
            f"{BASE_URL}/api/outlets",
            json=test_outlet,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data['name'] == test_outlet['name']
        assert data['username'] == test_outlet['username']
        assert data['ready_time_buffer_minutes'] == 45
        assert 'id' in data
        print(f"✓ Outlet created with credentials - ID: {data['id']}, Username: {data['username']}")
        
        # Store for cleanup
        self.__class__.created_outlet_id = data['id']
        return data
    
    def test_get_all_outlets(self):
        """Test fetching all outlets"""
        response = requests.get(
            f"{BASE_URL}/api/outlets",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Fetched {len(data)} outlets")
        return data
    
    def test_edit_outlet_with_optional_password(self):
        """Test editing outlet - password is optional"""
        # First create an outlet
        test_outlet = {
            "name": "TEST_Edit Outlet",
            "address": "456 Test Ave",
            "city": "Delhi",
            "phone": "+919876543210",
            "username": f"test_edit_{int(time.time())}",
            "password": "initial_password",
            "ready_time_buffer_minutes": 30
        }
        
        create_response = requests.post(
            f"{BASE_URL}/api/outlets",
            json=test_outlet,
            headers=self.headers
        )
        assert create_response.status_code == 200
        created_outlet = create_response.json()
        outlet_id = created_outlet['id']
        
        # Edit WITHOUT password (should keep existing)
        edit_data = {
            "name": "TEST_Edit Outlet Updated",
            "address": "456 Test Ave Updated",
            "city": "Delhi",
            "phone": "+919876543211",
            "username": created_outlet['username'],
            "ready_time_buffer_minutes": 60
        }
        
        edit_response = requests.patch(
            f"{BASE_URL}/api/outlets/{outlet_id}",
            json=edit_data,
            headers=self.headers
        )
        
        assert edit_response.status_code == 200
        print(f"✓ Outlet edited without password change - ID: {outlet_id}")
        
        # Edit WITH new password
        edit_data_with_pwd = {
            "name": "TEST_Edit Outlet Final",
            "address": "456 Test Ave Final",
            "city": "Delhi",
            "phone": "+919876543212",
            "username": created_outlet['username'],
            "password": "new_secure_password123",
            "ready_time_buffer_minutes": 90
        }
        
        edit_response2 = requests.patch(
            f"{BASE_URL}/api/outlets/{outlet_id}",
            json=edit_data_with_pwd,
            headers=self.headers
        )
        
        assert edit_response2.status_code == 200
        print(f"✓ Outlet edited with password update - ID: {outlet_id}")
        
        # Store for cleanup
        self.__class__.edited_outlet_id = outlet_id


class TestBranchSummaryDashboard:
    """Super Admin Dashboard - Branch-wise Summary tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_branch_summary_endpoint(self):
        """Test branch-wise summary endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/branch-summary",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        
        # If outlets exist, verify structure
        if len(data) > 0:
            branch = data[0]
            assert 'outlet_id' in branch
            assert 'outlet_name' in branch
            assert 'total_orders' in branch
            assert 'todays_orders' in branch
            assert 'total_income' in branch
            assert 'pending_orders' in branch
            print(f"✓ Branch summary structure valid - {len(data)} branches found")
            for b in data:
                print(f"  - {b['outlet_name']}: Orders={b['total_orders']}, Today={b['todays_orders']}, Income=₹{b['total_income']}")
        else:
            print("✓ Branch summary endpoint working - No outlets yet")
    
    def test_dashboard_stats(self):
        """Test dashboard stats endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/dashboard/stats",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'total_orders_today' in data
        assert 'total_revenue_today' in data
        assert 'pending_orders' in data
        assert 'ready_orders' in data
        assert 'delivered_orders' in data
        assert 'total_outlets' in data
        assert 'total_users' in data
        print(f"✓ Dashboard stats valid - Orders today: {data['total_orders_today']}, Pending: {data['pending_orders']}")


class TestManageOrdersModule:
    """Manage Orders module tests - Full workflow"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_get_manage_orders(self):
        """Test fetching orders in manage (not hold)"""
        response = requests.get(
            f"{BASE_URL}/api/orders/manage",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"✓ Manage orders endpoint working - {len(data)} orders found")
        
        # Check order structure if any exist
        if len(data) > 0:
            order = data[0]
            assert 'id' in order
            assert 'order_number' in order
            assert 'customer_info' in order
            assert 'status' in order
            assert 'total_amount' in order
            assert 'paid_amount' in order
            print(f"  - Order #{order['order_number']}: Status={order['status']}")
        return data
    
    def test_create_order_for_workflow(self):
        """Create a test order to test workflow"""
        # First get or create an outlet
        outlets_response = requests.get(
            f"{BASE_URL}/api/outlets",
            headers=self.headers
        )
        outlets = outlets_response.json()
        
        if len(outlets) == 0:
            # Create outlet first
            outlet_data = {
                "name": "TEST_Workflow Outlet",
                "address": "789 Workflow St",
                "city": "Pune",
                "phone": "+911111111111",
                "username": f"workflow_outlet_{int(time.time())}",
                "password": "workflow123",
                "ready_time_buffer_minutes": 30
            }
            outlet_response = requests.post(
                f"{BASE_URL}/api/outlets",
                json=outlet_data,
                headers=self.headers
            )
            outlet = outlet_response.json()
        else:
            outlet = outlets[0]
        
        # Create order
        order_data = {
            "order_type": "self",
            "customer_info": {
                "name": "TEST_Workflow Customer",
                "phone": "+919999999999"
            },
            "needs_delivery": False,
            "flavour": "Chocolate Truffle",
            "size_pounds": 2.0,
            "cake_image_url": "https://example.com/cake.jpg",
            "delivery_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "delivery_time": "14:00",
            "outlet_id": outlet['id'],
            "total_amount": 2500.00
        }
        
        response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert 'order_id' in data
        assert 'order_number' in data
        print(f"✓ Test order created - #{data['order_number']}, ID: {data['order_id']}")
        
        self.__class__.test_order_id = data['order_id']
        self.__class__.test_order_number = data['order_number']
        return data


class TestPaymentRecording:
    """Payment recording tests"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_record_payment(self):
        """Test recording a payment for an order"""
        # Get or create an order first
        # First get an outlet
        outlets_response = requests.get(
            f"{BASE_URL}/api/outlets",
            headers=self.headers
        )
        outlets = outlets_response.json()
        
        if len(outlets) == 0:
            pytest.skip("No outlets available for payment test")
        
        outlet = outlets[0]
        
        # Create a fresh order for payment test
        order_data = {
            "order_type": "self",
            "customer_info": {
                "name": "TEST_Payment Customer",
                "phone": "+918888888888"
            },
            "needs_delivery": False,
            "flavour": "Red Velvet",
            "size_pounds": 1.5,
            "cake_image_url": "https://example.com/cake2.jpg",
            "delivery_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "delivery_time": "16:00",
            "outlet_id": outlet['id'],
            "total_amount": 1800.00
        }
        
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=self.headers
        )
        assert order_response.status_code == 200
        order = order_response.json()
        order_id = order['order_id']
        
        # Record payment (40% should move order from hold to manage)
        payment_data = {
            "order_id": order_id,
            "amount": 720.00,  # 40% of 1800
            "payment_method": "cash"
        }
        
        payment_response = requests.post(
            f"{BASE_URL}/api/payments",
            json=payment_data,
            headers=self.headers
        )
        
        assert payment_response.status_code == 200
        payment_result = payment_response.json()
        assert payment_result['paid_amount'] == 720.00
        assert payment_result['pending_amount'] == 1080.00  # 1800 - 720
        assert payment_result['moved_to_manage'] == True
        print(f"✓ Payment recorded - Paid: ₹{payment_result['paid_amount']}, Pending: ₹{payment_result['pending_amount']}")
        
        self.__class__.paid_order_id = order_id
    
    def test_get_order_payments(self):
        """Test fetching payments for an order"""
        if not hasattr(self.__class__, 'paid_order_id'):
            pytest.skip("No paid order available")
        
        response = requests.get(
            f"{BASE_URL}/api/payments/{self.__class__.paid_order_id}",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        assert len(data) > 0
        print(f"✓ Fetched {len(data)} payments for order")


class TestStatusWorkflow:
    """Order status workflow tests - Confirmed → Ready → Picked Up → Delivered"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_create_paid_order_for_status_test(self):
        """Create and pay for an order to test status workflow"""
        # Get outlet
        outlets_response = requests.get(
            f"{BASE_URL}/api/outlets",
            headers=self.headers
        )
        outlets = outlets_response.json()
        
        if len(outlets) == 0:
            pytest.skip("No outlets available")
        
        outlet = outlets[0]
        
        # Create order
        order_data = {
            "order_type": "self",
            "customer_info": {
                "name": "TEST_Status Workflow",
                "phone": "+917777777777"
            },
            "needs_delivery": True,
            "delivery_address": "123 Status Test Lane",
            "delivery_city": "Mumbai",
            "flavour": "Butterscotch",
            "size_pounds": 2.5,
            "cake_image_url": "https://example.com/cake3.jpg",
            "delivery_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
            "delivery_time": "18:00",
            "outlet_id": outlet['id'],
            "total_amount": 3000.00
        }
        
        order_response = requests.post(
            f"{BASE_URL}/api/orders",
            json=order_data,
            headers=self.headers
        )
        assert order_response.status_code == 200
        order = order_response.json()
        order_id = order['order_id']
        
        # Pay 40% to move to manage
        payment_response = requests.post(
            f"{BASE_URL}/api/payments",
            json={"order_id": order_id, "amount": 1200.00, "payment_method": "upi"},
            headers=self.headers
        )
        assert payment_response.status_code == 200
        
        self.__class__.status_test_order_id = order_id
        print(f"✓ Order created and paid for status test - ID: {order_id}")
        return order_id
    
    def test_status_update_to_ready(self):
        """Test updating status to Ready"""
        if not hasattr(self.__class__, 'status_test_order_id'):
            self.test_create_paid_order_for_status_test()
        
        order_id = self.__class__.status_test_order_id
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status?status=ready",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "ready" in data['message'].lower()
        print(f"✓ Status updated to READY - Order ID: {order_id}")
    
    def test_status_update_to_picked_up(self):
        """Test updating status to Picked Up"""
        if not hasattr(self.__class__, 'status_test_order_id'):
            pytest.skip("No order for status test")
        
        order_id = self.__class__.status_test_order_id
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status?status=picked_up",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "picked_up" in data['message'].lower()
        print(f"✓ Status updated to PICKED UP - Order ID: {order_id}")
    
    def test_status_update_to_delivered(self):
        """Test updating status to Delivered"""
        if not hasattr(self.__class__, 'status_test_order_id'):
            pytest.skip("No order for status test")
        
        order_id = self.__class__.status_test_order_id
        
        response = requests.patch(
            f"{BASE_URL}/api/orders/{order_id}/status?status=delivered",
            headers=self.headers
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "delivered" in data['message'].lower()
        print(f"✓ Status updated to DELIVERED - Order ID: {order_id}")


class TestWhatsAppIntegration:
    """WhatsApp notification trigger tests (on status update)"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_whatsapp_templates_exist(self):
        """Test that WhatsApp templates are configured"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/templates",
            headers=self.headers
        )
        
        assert response.status_code == 200
        templates = response.json()
        print(f"✓ WhatsApp templates configured: {len(templates)} templates found")
        
        for t in templates:
            status = "ENABLED" if t.get('is_enabled') else "DISABLED"
            print(f"  - {t['event_type']}: {status}")
    
    def test_whatsapp_logs(self):
        """Test WhatsApp message logs endpoint"""
        response = requests.get(
            f"{BASE_URL}/api/whatsapp/logs?limit=10",
            headers=self.headers
        )
        
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)
        print(f"✓ WhatsApp logs endpoint working - {len(logs)} recent logs")
        
        for log in logs[:3]:
            print(f"  - Order {log.get('order_id', 'N/A')}: {log.get('event_type', 'N/A')} - {log.get('status', 'N/A')}")


class TestCleanup:
    """Cleanup test data"""
    
    @pytest.fixture(autouse=True)
    def setup(self):
        """Get auth token before each test"""
        response = requests.post(
            f"{BASE_URL}/api/auth/login",
            json={"email": SUPER_ADMIN_EMAIL, "password": SUPER_ADMIN_PASSWORD}
        )
        self.token = response.json()['access_token']
        self.headers = {"Authorization": f"Bearer {self.token}"}
    
    def test_summary(self):
        """Print test summary"""
        print("\n" + "="*50)
        print("TEST SUMMARY")
        print("="*50)
        print("All backend API tests completed!")
        print("- Outlet Management: Create with credentials, Edit with optional password")
        print("- Branch Summary Dashboard: /api/dashboard/branch-summary")
        print("- Manage Orders: /api/orders/manage")
        print("- Payment Recording: /api/payments")
        print("- Status Workflow: Confirmed → Ready → Picked Up → Delivered")
        print("- WhatsApp Integration: Templates and Logs")
        print("="*50)


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
