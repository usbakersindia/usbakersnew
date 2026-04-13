#!/usr/bin/env python3
"""
Backend API Testing for US Bakers CRM
Testing deleted orders functionality and admin permissions
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

class BackendTester:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test result"""
        result = {
            "test": test_name,
            "success": success,
            "message": message,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.test_results.append(result)
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details and not success:
            print(f"   Details: {details}")
    
    def test_admin_login(self):
        """Test admin login and get auth token"""
        try:
            response = self.session.post(
                f"{API_BASE}/auth/login",
                json={
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD
                },
                headers={"Content-Type": "application/json"}
            )
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get("access_token")
                user_info = data.get("user", {})
                
                if self.auth_token and user_info.get("role") == "super_admin":
                    self.log_test(
                        "Admin Login", 
                        True, 
                        f"Successfully logged in as {user_info.get('name')} (super_admin)"
                    )
                    return True
                else:
                    self.log_test(
                        "Admin Login", 
                        False, 
                        "Login successful but missing token or wrong role",
                        {"response": data}
                    )
                    return False
            else:
                self.log_test(
                    "Admin Login", 
                    False, 
                    f"Login failed with status {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Exception during login: {str(e)}")
            return False
    
    def get_auth_headers(self):
        """Get authorization headers"""
        if not self.auth_token:
            return {}
        return {"Authorization": f"Bearer {self.auth_token}"}
    
    def test_get_deleted_orders_empty(self):
        """Test GET /api/orders/deleted - should return empty list initially"""
        try:
            response = self.session.get(
                f"{API_BASE}/orders/deleted",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list):
                    self.log_test(
                        "GET Deleted Orders (Empty)", 
                        True, 
                        f"Successfully retrieved deleted orders list (count: {len(data)})"
                    )
                    return True
                else:
                    self.log_test(
                        "GET Deleted Orders (Empty)", 
                        False, 
                        "Response is not a list",
                        {"response": data}
                    )
                    return False
            else:
                self.log_test(
                    "GET Deleted Orders (Empty)", 
                    False, 
                    f"Failed with status {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test("GET Deleted Orders (Empty)", False, f"Exception: {str(e)}")
            return False
    
    def create_test_outlet(self):
        """Create a test outlet for testing"""
        try:
            outlet_data = {
                "name": "Test Outlet",
                "address": "123 Test Street",
                "city": "Test City",
                "phone": "9876543210",
                "username": "testoutlet",
                "password": "testpass123",
                "ready_time_buffer_minutes": 30
            }
            
            response = self.session.post(
                f"{API_BASE}/outlets",
                json=outlet_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                outlet_id = data.get("id")
                if outlet_id:
                    self.log_test(
                        "Create Test Outlet", 
                        True, 
                        f"Successfully created test outlet {outlet_id}"
                    )
                    return outlet_id
                else:
                    self.log_test(
                        "Create Test Outlet", 
                        False, 
                        "Outlet created but no ID returned",
                        {"response": data}
                    )
                    return None
            else:
                self.log_test(
                    "Create Test Outlet", 
                    False, 
                    f"Failed with status {response.status_code}",
                    {"response": response.text}
                )
                return None
                
        except Exception as e:
            self.log_test("Create Test Outlet", False, f"Exception: {str(e)}")
            return None

    def test_create_test_order(self):
        """Create a test order to test deletion"""
        try:
            # First get outlets to use a valid outlet_id
            outlets_response = self.session.get(
                f"{API_BASE}/outlets",
                headers=self.get_auth_headers()
            )
            
            if outlets_response.status_code != 200:
                self.log_test(
                    "Create Test Order", 
                    False, 
                    "Failed to get outlets for test order creation"
                )
                return None
            
            outlets = outlets_response.json()
            outlet_id = None
            
            if not outlets:
                # Create a test outlet
                outlet_id = self.create_test_outlet()
                if not outlet_id:
                    return None
            else:
                outlet_id = outlets[0]["id"]
            
            # Create test order
            order_data = {
                "order_type": "self",
                "customer_info": {
                    "name": "Test Customer",
                    "phone": "9876543210",
                    "gender": "male"
                },
                "needs_delivery": False,
                "occasion": "Birthday",
                "flavour": "Chocolate Truffle",
                "size_pounds": 1.0,
                "cake_image_url": "https://example.com/test-cake.jpg",
                "delivery_date": "2024-12-31",
                "delivery_time": "10:00 AM - 12:00 PM",
                "outlet_id": outlet_id,
                "total_amount": 500.0
            }
            
            response = self.session.post(
                f"{API_BASE}/orders",
                json=order_data,
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                order_id = data.get("order_id")
                if order_id:
                    self.log_test(
                        "Create Test Order", 
                        True, 
                        f"Successfully created test order {order_id}"
                    )
                    return order_id
                else:
                    self.log_test(
                        "Create Test Order", 
                        False, 
                        "Order created but no order_id returned",
                        {"response": data}
                    )
                    return None
            else:
                self.log_test(
                    "Create Test Order", 
                    False, 
                    f"Failed with status {response.status_code}",
                    {"response": response.text}
                )
                return None
                
        except Exception as e:
            self.log_test("Create Test Order", False, f"Exception: {str(e)}")
            return None
    
    def test_delete_order(self, order_id):
        """Test DELETE /api/orders/{order_id} - admin should be able to delete directly"""
        try:
            response = self.session.delete(
                f"{API_BASE}/orders/{order_id}",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                message = data.get("message", "")
                if "deleted successfully" in message.lower():
                    self.log_test(
                        "DELETE Order (Admin)", 
                        True, 
                        f"Successfully deleted order {order_id}"
                    )
                    return True
                else:
                    self.log_test(
                        "DELETE Order (Admin)", 
                        False, 
                        f"Unexpected response message: {message}",
                        {"response": data}
                    )
                    return False
            else:
                self.log_test(
                    "DELETE Order (Admin)", 
                    False, 
                    f"Failed with status {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test("DELETE Order (Admin)", False, f"Exception: {str(e)}")
            return False
    
    def test_get_deleted_orders_with_data(self):
        """Test GET /api/orders/deleted - should now contain the deleted order"""
        try:
            response = self.session.get(
                f"{API_BASE}/orders/deleted",
                headers=self.get_auth_headers()
            )
            
            if response.status_code == 200:
                data = response.json()
                if isinstance(data, list) and len(data) > 0:
                    deleted_order = data[0]
                    if deleted_order.get("is_deleted") == True:
                        self.log_test(
                            "GET Deleted Orders (With Data)", 
                            True, 
                            f"Successfully retrieved {len(data)} deleted order(s)"
                        )
                        return True
                    else:
                        self.log_test(
                            "GET Deleted Orders (With Data)", 
                            False, 
                            "Order in deleted list is not marked as deleted",
                            {"order": deleted_order}
                        )
                        return False
                else:
                    self.log_test(
                        "GET Deleted Orders (With Data)", 
                        False, 
                        "Expected deleted orders but got empty list",
                        {"response": data}
                    )
                    return False
            else:
                self.log_test(
                    "GET Deleted Orders (With Data)", 
                    False, 
                    f"Failed with status {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test("GET Deleted Orders (With Data)", False, f"Exception: {str(e)}")
            return False
    
    def test_auth_required(self):
        """Test that endpoints require authentication"""
        try:
            # Test without auth token
            response = self.session.get(f"{API_BASE}/orders/deleted")
            
            if response.status_code in [401, 403]:  # Both are acceptable for auth failure
                self.log_test(
                    "Auth Required", 
                    True, 
                    f"Correctly requires authentication ({response.status_code})"
                )
                return True
            else:
                self.log_test(
                    "Auth Required", 
                    False, 
                    f"Expected 401/403 but got {response.status_code}",
                    {"response": response.text}
                )
                return False
                
        except Exception as e:
            self.log_test("Auth Required", False, f"Exception: {str(e)}")
            return False
    
    def run_all_tests(self):
        """Run all backend tests"""
        print("🚀 Starting US Bakers CRM Backend API Tests")
        print("=" * 60)
        
        # Test 1: Authentication required
        self.test_auth_required()
        
        # Test 2: Admin login
        if not self.test_admin_login():
            print("❌ Cannot proceed without admin login")
            return False
        
        # Test 3: Get deleted orders (empty initially)
        self.test_get_deleted_orders_empty()
        
        # Test 4: Create test order
        test_order_id = self.test_create_test_order()
        
        if test_order_id:
            # Test 5: Delete the test order
            if self.test_delete_order(test_order_id):
                # Test 6: Verify order appears in deleted orders
                self.test_get_deleted_orders_with_data()
        
        # Summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["success"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        
        if failed_tests > 0:
            print("\n❌ FAILED TESTS:")
            for result in self.test_results:
                if not result["success"]:
                    print(f"  - {result['test']}: {result['message']}")
        
        success_rate = (passed_tests / total_tests) * 100 if total_tests > 0 else 0
        print(f"\nSuccess Rate: {success_rate:.1f}%")
        
        return failed_tests == 0

if __name__ == "__main__":
    tester = BackendTester()
    success = tester.run_all_tests()
    
    if success:
        print("\n🎉 All tests passed! Backend API is working correctly.")
        sys.exit(0)
    else:
        print("\n💥 Some tests failed. Check the details above.")
        sys.exit(1)