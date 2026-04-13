#!/usr/bin/env python3
"""
Backend Test Suite for US Bakers CRM - Branch-Specific Threshold Testing
Testing the branch-specific threshold functionality in release hold order
"""

import requests
import json
import sys
from datetime import datetime

# Backend URL from frontend .env
BASE_URL = "https://335fff4e-2684-4e97-8c4c-790cfa84ee6f.preview.emergentagent.com/api"

class TestRunner:
    def __init__(self):
        self.session = requests.Session()
        self.auth_token = None
        self.test_results = []
        
    def log_test(self, test_name, success, message, details=None):
        """Log test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status}: {test_name} - {message}")
        if details:
            print(f"   Details: {details}")
        
        self.test_results.append({
            'test': test_name,
            'success': success,
            'message': message,
            'details': details
        })
    
    def login_admin(self):
        """Login as admin user"""
        try:
            response = self.session.post(f"{BASE_URL}/auth/login", json={
                "email": "admin@usbakers.com",
                "password": "admin123"
            })
            
            if response.status_code == 200:
                data = response.json()
                self.auth_token = data.get('access_token')
                self.session.headers.update({'Authorization': f'Bearer {self.auth_token}'})
                self.log_test("Admin Login", True, "Successfully logged in as admin")
                return True
            else:
                self.log_test("Admin Login", False, f"Login failed: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Admin Login", False, f"Login error: {str(e)}")
            return False
    
    def get_outlets(self):
        """Get list of outlets"""
        try:
            response = self.session.get(f"{BASE_URL}/outlets")
            
            if response.status_code == 200:
                outlets = response.json()
                if outlets:
                    outlet_id = outlets[0]['id']
                    outlet_name = outlets[0]['name']
                    self.log_test("Get Outlets", True, f"Retrieved outlets, using outlet: {outlet_name} (ID: {outlet_id})")
                    return outlet_id
                else:
                    self.log_test("Get Outlets", False, "No outlets found")
                    return None
            else:
                self.log_test("Get Outlets", False, f"Failed to get outlets: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Get Outlets", False, f"Error getting outlets: {str(e)}")
            return None
    
    def set_branch_threshold(self, outlet_id, threshold_percentage):
        """Set branch-specific payment threshold"""
        try:
            response = self.session.post(f"{BASE_URL}/branch-payment-threshold", json={
                "outlet_id": outlet_id,
                "minimum_payment_percentage": threshold_percentage
            })
            
            if response.status_code == 200:
                self.log_test("Set Branch Threshold", True, f"Set branch threshold to {threshold_percentage}% for outlet {outlet_id}")
                return True
            else:
                self.log_test("Set Branch Threshold", False, f"Failed to set threshold: {response.status_code}", response.text)
                return False
                
        except Exception as e:
            self.log_test("Set Branch Threshold", False, f"Error setting threshold: {str(e)}")
            return False
    
    def get_branch_threshold(self, outlet_id):
        """Get branch-specific payment threshold"""
        try:
            response = self.session.get(f"{BASE_URL}/branch-payment-threshold/{outlet_id}")
            
            if response.status_code == 200:
                threshold_data = response.json()
                threshold = threshold_data.get('minimum_payment_percentage', 'Not found')
                self.log_test("Get Branch Threshold", True, f"Retrieved branch threshold: {threshold}%")
                return threshold_data
            else:
                self.log_test("Get Branch Threshold", False, f"Failed to get threshold: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Get Branch Threshold", False, f"Error getting threshold: {str(e)}")
            return None
    
    def create_hold_order(self, outlet_id):
        """Create a hold order for testing"""
        try:
            # Create an incomplete order to force hold status
            order_data = {
                "order_type": "self",
                "customer_info": {
                    "name": "Test Customer",
                    "phone": "9876543210",
                    "gender": "male"
                },
                "needs_delivery": False,
                "flavour": "",  # Empty to make it incomplete
                "size_pounds": 1.0,
                "cake_image_url": "https://example.com/cake.jpg",
                "delivery_date": "2024-12-31",
                "delivery_time": "10:00",
                "outlet_id": outlet_id,
                "total_amount": 1000.0
            }
            
            response = self.session.post(f"{BASE_URL}/orders", json=order_data)
            
            if response.status_code == 200:
                order = response.json()
                order_id = order.get('order_id') or order.get('id')  # Try both keys
                lifecycle_status = order.get('lifecycle_status', 'unknown')
                self.log_test("Create Hold Order", True, f"Created order with ID: {order_id}, Status: {lifecycle_status}, Total: ₹{order_data['total_amount']}")
                return order_id
            else:
                self.log_test("Create Hold Order", False, f"Failed to create order: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Create Hold Order", False, f"Error creating order: {str(e)}")
            return None
    
    def record_payment(self, order_id, amount):
        """Record payment for an order"""
        try:
            payment_data = {
                "order_id": order_id,
                "amount": amount,
                "payment_method": "cash"
            }
            
            response = self.session.post(f"{BASE_URL}/payments", json=payment_data)
            
            if response.status_code == 200:
                result = response.json()
                moved_to_manage = result.get('moved_to_manage', False)
                threshold_percentage = result.get('threshold_percentage', 0)
                threshold_amount = result.get('threshold_amount', 0)
                paid_amount = result.get('paid_amount', 0)
                
                self.log_test("Record Payment", True, 
                    f"Recorded ₹{amount} payment. Total paid: ₹{paid_amount}. Threshold: {threshold_percentage}% (₹{threshold_amount}). Moved to manage: {moved_to_manage}")
                return result
            else:
                self.log_test("Record Payment", False, f"Failed to record payment: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Record Payment", False, f"Error recording payment: {str(e)}")
            return None
    
    def release_hold_order(self, order_id, paid_amount):
        """Release hold order with payment"""
        try:
            # First, complete the order info to release it from hold
            release_data = {
                "flavour": "Chocolate",  # Complete the missing info
                "paid_amount": paid_amount
            }
            
            response = self.session.post(f"{BASE_URL}/orders/{order_id}/release", json=release_data)
            
            if response.status_code == 200:
                result = response.json()
                lifecycle_status = result.get('lifecycle_status')
                payment_percentage = result.get('payment_percentage', 0)
                
                self.log_test("Release Hold Order", True, 
                    f"Released order with ₹{paid_amount} payment. Payment %: {payment_percentage}%. New status: {lifecycle_status}")
                return result
            else:
                self.log_test("Release Hold Order", False, f"Failed to release order: {response.status_code}", response.text)
                return None
                
        except Exception as e:
            self.log_test("Release Hold Order", False, f"Error releasing order: {str(e)}")
            return None
    
    def get_order_details(self, order_id):
        """Get order details to verify status"""
        try:
            # Check multiple order lists to find our order
            endpoints = ["/orders/hold", "/orders/manage", "/orders/pending"]
            
            for endpoint in endpoints:
                response = self.session.get(f"{BASE_URL}{endpoint}")
                
                if response.status_code == 200:
                    orders = response.json()
                    for order in orders:
                        if order.get('id') == order_id:
                            lifecycle_status = order.get('lifecycle_status')
                            is_hold = order.get('is_hold')
                            paid_amount = order.get('paid_amount')
                            
                            self.log_test("Get Order Details", True, 
                                f"Order found in {endpoint}. Status: {lifecycle_status}, Hold: {is_hold}, Paid: ₹{paid_amount}")
                            return order
            
            self.log_test("Get Order Details", False, f"Order {order_id} not found in any order list")
            return None
                
        except Exception as e:
            self.log_test("Get Order Details", False, f"Error getting order: {str(e)}")
            return None
    
    def run_branch_threshold_test(self):
        """Run the complete branch-specific threshold test"""
        print("=" * 80)
        print("TESTING: Branch-Specific Threshold in Release Hold Order")
        print("=" * 80)
        
        # Step 1: Login as admin
        if not self.login_admin():
            return False
        
        # Step 2: Get outlets list
        outlet_id = self.get_outlets()
        if not outlet_id:
            return False
        
        # Step 3: Set branch-specific threshold to 10%
        if not self.set_branch_threshold(outlet_id, 10.0):
            return False
        
        # Step 4: Verify threshold was set
        threshold_data = self.get_branch_threshold(outlet_id)
        if not threshold_data or threshold_data.get('minimum_payment_percentage') != 10.0:
            self.log_test("Verify Threshold", False, "Branch threshold not set correctly")
            return False
        
        # Step 5: Create a hold order
        order_id = self.create_hold_order(outlet_id)
        if not order_id:
            self.log_test("Hold Order Creation", False, "Failed to create hold order - no order ID returned")
            return False
        
        # Step 6: Release order from hold (complete missing info)
        release_result = self.release_hold_order(order_id, 0)  # Release without payment first
        if not release_result:
            return False
        
        # Step 7: Record payment (10% = ₹100)
        payment_result = self.record_payment(order_id, 100.0)
        if not payment_result:
            return False
        
        # Step 8: Verify order moved to active status
        order_details = self.get_order_details(order_id)
        if not order_details:
            return False
        
        # Check if the order correctly moved to active with 10% threshold
        lifecycle_status = order_details.get('lifecycle_status')
        is_hold = order_details.get('is_hold')
        
        if lifecycle_status == 'active' and not is_hold:
            self.log_test("Branch Threshold Logic", True, 
                "✅ CRITICAL TEST PASSED: Order correctly moved to 'active' with 10% branch-specific threshold")
        else:
            self.log_test("Branch Threshold Logic", False, 
                f"❌ CRITICAL TEST FAILED: Order should be 'active' but is '{lifecycle_status}', hold status: {is_hold}")
            return False
        
        # Step 9: Test with payment below threshold (5% = ₹50)
        print("\n" + "=" * 60)
        print("TESTING: Payment Below Branch Threshold")
        print("=" * 60)
        
        # Create another hold order
        order_id_2 = self.create_hold_order(outlet_id)
        if not order_id_2:
            return False
        
        # Release from hold
        release_result_2 = self.release_hold_order(order_id_2, 0)
        if not release_result_2:
            return False
        
        # Record payment below threshold (5% = ₹50)
        payment_result_2 = self.record_payment(order_id_2, 50.0)
        if not payment_result_2:
            return False
        
        # Verify order stays in pending_payment
        order_details_2 = self.get_order_details(order_id_2)
        if not order_details_2:
            return False
        
        lifecycle_status_2 = order_details_2.get('lifecycle_status')
        is_hold_2 = order_details_2.get('is_hold')
        
        if lifecycle_status_2 == 'pending_payment' and not is_hold_2:
            self.log_test("Below Threshold Logic", True, 
                "✅ Order correctly stayed in 'pending_payment' with payment below 10% threshold")
        else:
            self.log_test("Below Threshold Logic", False, 
                f"❌ Order should stay in 'pending_payment' but is '{lifecycle_status_2}', hold status: {is_hold_2}")
            return False
        
        return True
    
    def print_summary(self):
        """Print test summary"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)
        
        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result['success'])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if failed_tests > 0:
            print("\nFAILED TESTS:")
            for result in self.test_results:
                if not result['success']:
                    print(f"  ❌ {result['test']}: {result['message']}")
        
        return failed_tests == 0

def main():
    """Main test execution"""
    tester = TestRunner()
    
    try:
        success = tester.run_branch_threshold_test()
        tester.print_summary()
        
        if success:
            print("\n🎉 ALL TESTS PASSED! Branch-specific threshold functionality is working correctly.")
            sys.exit(0)
        else:
            print("\n💥 SOME TESTS FAILED! Check the details above.")
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n\nTest interrupted by user")
        sys.exit(1)
    except Exception as e:
        print(f"\n\nUnexpected error during testing: {str(e)}")
        sys.exit(1)

if __name__ == "__main__":
    main()