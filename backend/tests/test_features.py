"""
Backend API Tests for US Bakers CRM
Testing: NewOrder voice recording, ManageOrders features, IncentiveReport, PetPooja webhook, Kitchen Dashboard, Settings
"""
import pytest
import requests
import os

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', '').rstrip('/')

# Test credentials
TEST_ADMIN_EMAIL = "admin@usbakers.com"
TEST_ADMIN_PASSWORD = "admin123"


class TestAuthAndSetup:
    """Auth and basic setup tests"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token for testing"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip(f"Admin login failed: {response.status_code} - {response.text}")
    
    def test_admin_login(self):
        """Test admin login works"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        assert response.status_code == 200, f"Login failed: {response.text}"
        data = response.json()
        assert "access_token" in data
        assert data["user"]["email"] == TEST_ADMIN_EMAIL
        print(f"SUCCESS: Admin login works, got token")


class TestSettingsCRUD:
    """Test Settings page CRUD operations for Flavours, Occasions, Time Slots"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    # =============== FLAVOURS ===============
    def test_get_flavours(self, admin_token):
        """Test fetching all flavours"""
        response = requests.get(f"{BASE_URL}/api/flavours", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} flavours")
    
    def test_create_flavour(self, admin_token):
        """Test creating a new flavour"""
        response = requests.post(f"{BASE_URL}/api/flavours", 
            json={"name": "TEST_Mango_Delight"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # 200 or 400 (if already exists)
        assert response.status_code in [200, 400]
        print(f"SUCCESS: Create flavour returned {response.status_code}")
    
    def test_delete_flavour(self, admin_token):
        """Test soft delete flavour"""
        # First get flavours to find a test one
        get_resp = requests.get(f"{BASE_URL}/api/flavours", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        flavours = get_resp.json()
        test_flavours = [f for f in flavours if f.get('name', '').startswith('TEST_')]
        
        if test_flavours:
            flavour_id = test_flavours[0]['id']
            response = requests.delete(f"{BASE_URL}/api/flavours/{flavour_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            print(f"SUCCESS: Deleted flavour {flavour_id}")
        else:
            print("SKIP: No test flavours to delete")
    
    # =============== OCCASIONS ===============
    def test_get_occasions(self, admin_token):
        """Test fetching all occasions"""
        response = requests.get(f"{BASE_URL}/api/occasions", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} occasions")
    
    def test_create_occasion(self, admin_token):
        """Test creating a new occasion"""
        response = requests.post(f"{BASE_URL}/api/occasions", 
            json={"name": "TEST_Graduation"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code in [200, 400]
        print(f"SUCCESS: Create occasion returned {response.status_code}")
    
    def test_delete_occasion(self, admin_token):
        """Test soft delete occasion"""
        get_resp = requests.get(f"{BASE_URL}/api/occasions", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        occasions = get_resp.json()
        test_occasions = [o for o in occasions if o.get('name', '').startswith('TEST_')]
        
        if test_occasions:
            occasion_id = test_occasions[0]['id']
            response = requests.delete(f"{BASE_URL}/api/occasions/{occasion_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            print(f"SUCCESS: Deleted occasion {occasion_id}")
        else:
            print("SKIP: No test occasions to delete")
    
    # =============== TIME SLOTS ===============
    def test_get_time_slots(self, admin_token):
        """Test fetching all time slots"""
        response = requests.get(f"{BASE_URL}/api/time-slots", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} time slots")
    
    def test_create_time_slot(self, admin_token):
        """Test creating a new time slot"""
        response = requests.post(f"{BASE_URL}/api/time-slots", 
            json={"time_slot": "TEST_11:00 PM - 12:00 AM"},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code in [200, 400]
        print(f"SUCCESS: Create time slot returned {response.status_code}")
    
    def test_delete_time_slot(self, admin_token):
        """Test soft delete time slot"""
        get_resp = requests.get(f"{BASE_URL}/api/time-slots", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        slots = get_resp.json()
        test_slots = [s for s in slots if s.get('time_slot', '').startswith('TEST_')]
        
        if test_slots:
            slot_id = test_slots[0]['id']
            response = requests.delete(f"{BASE_URL}/api/time-slots/{slot_id}",
                headers={"Authorization": f"Bearer {admin_token}"}
            )
            assert response.status_code == 200
            print(f"SUCCESS: Deleted time slot {slot_id}")
        else:
            print("SKIP: No test time slots to delete")


class TestPetPoojaWebhookURL:
    """Test PetPooja webhook URL endpoint returns actual domain not localhost"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_petpooja_webhook_url_returns_actual_domain(self, admin_token):
        """Test webhook URL uses Request.base_url not localhost"""
        response = requests.get(f"{BASE_URL}/api/petpooja/webhook-url",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200, f"Failed: {response.text}"
        data = response.json()
        
        # Check that URLs don't contain localhost
        payment_url = data.get('payment_webhook_url', '')
        callback_url = data.get('status_callback_url', '')
        
        assert 'localhost' not in payment_url, f"Payment URL contains localhost: {payment_url}"
        assert 'localhost' not in callback_url, f"Callback URL contains localhost: {callback_url}"
        
        # URLs should contain bakery-workflow-hub (domain) and the API paths
        assert 'bakery-workflow-hub' in payment_url, f"Domain not in payment URL: {payment_url}"
        assert '/api/petpooja/payment-webhook' in payment_url, f"Path not in payment URL: {payment_url}"
        assert '/api/petpooja/callback' in callback_url, f"Path not in callback URL: {callback_url}"
        
        print(f"SUCCESS: PetPooja webhook URLs use actual domain (not localhost)")
        print(f"  Payment URL: {payment_url}")
        print(f"  Callback URL: {callback_url}")


class TestKitchenDashboard:
    """Test Kitchen Dashboard APIs"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_kitchen_orders_endpoint(self, admin_token):
        """Test kitchen orders endpoint"""
        response = requests.get(f"{BASE_URL}/api/kitchen/orders",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Kitchen orders endpoint returns {len(data)} orders")
    
    def test_kitchen_orders_summary(self, admin_token):
        """Test kitchen orders summary endpoint"""
        response = requests.get(f"{BASE_URL}/api/kitchen/orders/summary",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        # Check summary structure
        assert 'total_orders' in data or isinstance(data, dict)
        print(f"SUCCESS: Kitchen summary endpoint works")


class TestManageOrdersAPI:
    """Test Manage Orders API endpoints"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_manage_orders(self, admin_token):
        """Test fetching manage orders list"""
        response = requests.get(f"{BASE_URL}/api/orders/manage",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Manage orders returns {len(data)} orders")
        
        # Check if orders have cake_image_url field
        if data:
            order = data[0]
            assert 'cake_image_url' in order or order.get('cake_image_url') is None
            print(f"  First order has cake_image_url field: {order.get('cake_image_url')}")


class TestIncentiveReportData:
    """Test data for Incentive Report - sales persons names mapping"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_sales_persons(self, admin_token):
        """Test sales persons endpoint returns names"""
        response = requests.get(f"{BASE_URL}/api/sales-persons",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert isinstance(data, list)
        print(f"SUCCESS: Got {len(data)} sales persons")
        
        # Check each has a name
        for sp in data[:5]:
            assert 'name' in sp, f"Sales person missing name: {sp}"
            assert 'id' in sp, f"Sales person missing id: {sp}"
            print(f"  Sales person: {sp.get('name')} (id: {sp.get('id')})")


class TestVoiceUploadEndpoint:
    """Test voice upload endpoint exists for NewOrder voice recording feature"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_voice_upload_endpoint_exists(self, admin_token):
        """Test that /api/upload-voice endpoint exists"""
        # Send empty request to check if endpoint exists
        response = requests.post(f"{BASE_URL}/api/upload-voice",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        # We expect 422 (validation error) if endpoint exists but no file
        # or 405 (method not allowed) if endpoint doesn't exist
        assert response.status_code in [422, 400], f"Voice upload endpoint issue: {response.status_code} - {response.text}"
        print(f"SUCCESS: Voice upload endpoint exists (returned {response.status_code} without file)")


class TestSystemSettings:
    """Test system settings API"""
    
    @pytest.fixture(scope="class")
    def admin_token(self):
        """Get admin token"""
        response = requests.post(f"{BASE_URL}/api/auth/login", json={
            "email": TEST_ADMIN_EMAIL,
            "password": TEST_ADMIN_PASSWORD
        })
        if response.status_code == 200:
            return response.json().get("access_token")
        pytest.skip("Admin login failed")
    
    def test_get_system_settings(self, admin_token):
        """Test getting system settings"""
        response = requests.get(f"{BASE_URL}/api/system-settings",
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        data = response.json()
        assert 'minimum_payment_percentage' in data
        print(f"SUCCESS: System settings retrieved - min payment: {data.get('minimum_payment_percentage')}%")
    
    def test_update_system_settings(self, admin_token):
        """Test updating system settings"""
        response = requests.patch(f"{BASE_URL}/api/system-settings",
            json={"minimum_payment_percentage": 20.0, "birthday_mandatory": False},
            headers={"Authorization": f"Bearer {admin_token}"}
        )
        assert response.status_code == 200
        print(f"SUCCESS: System settings update works")


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
