#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================


user_problem_statement: "Multiple fixes for US Bakers CRM: 1) NewOrder page crash 2) Delete orders from pending/hold 3) Show all images in manage orders 4) Voice instructions accessible 5) PetPooja sync default filter 6) Phone 10 digit restriction 7) Gender mandatory"

backend:
  - task: "Deleted orders endpoint"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Added GET /api/orders/deleted endpoint and modified DELETE /api/orders/{order_id} to allow outlet_admin direct delete"
        - working: true
          agent: "testing"
          comment: "✅ TESTED: GET /api/orders/deleted endpoint working correctly. Returns empty list initially, populates with deleted orders after deletion. Proper authentication required. Outlet admins can see their outlet's deleted orders."

  - task: "Delete order - outlet admin direct delete"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Modified delete_order endpoint to allow outlet_admin to delete directly (not just super_admin)"
        - working: true
          agent: "testing"
          comment: "✅ TESTED: DELETE /api/orders/{order_id} working correctly for both super_admin and outlet_admin roles. Orders are properly marked as deleted (is_deleted: true) with audit trail (deleted_by, delete_approved_by). Deleted orders appear in GET /api/orders/deleted endpoint."

  - task: "Branch-specific threshold in release hold order"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Fixed /orders/{order_id}/release to check branch-specific threshold first then global. Was only using global threshold causing conflict."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Branch-specific threshold functionality working correctly. Set 10% threshold for outlet, created hold orders, released and recorded payments. Order with 10% payment (₹100/₹1000) correctly moved to 'active' status. Order with 5% payment (₹50/₹1000) correctly stayed in 'pending_payment'. Branch threshold (10%) properly overrides global threshold (20%). Payment recording endpoint (/api/payments) correctly implements branch-specific logic."

  - task: "Order amount change recalculates pending"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "PATCH /api/orders/{id} endpoint updated to recalculate pending_amount when total_amount changes. Formula: pending_amount = new_total - paid_amount"
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Order amount change correctly recalculates pending amount. Created order with ₹1000, recorded ₹500 payment (pending=₹500), updated total to ₹1200, verified pending correctly recalculated to ₹700 (1200-500). PATCH /api/orders/{id} endpoint working correctly."

  - task: "PetPooja webhook - cake only amount sync"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/petpooja/payment-webhook updated to sync only cake/pastry item amounts, not full bill total. Filters items by name/category containing 'cake', 'pastry', 'custom' keywords"
        - working: true
          agent: "testing"
          comment: "✅ TESTED: PetPooja webhook correctly syncs only cake amount. Sent bill with Custom Cake (₹1000) + Coffee (₹100) = ₹1100 total. Only ₹1000 (cake amount) was synced to order payment, not ₹1100 full total. Filtering logic working correctly."

  - task: "PetPooja webhook - bill edit handling"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/petpooja/payment-webhook updated to handle bill edits. Same bill_number updates existing payment instead of creating duplicate. Uses upsert logic."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Bill edit handling working correctly. Sent same bill (TEST-BILL-002) twice with different amounts (₹1000→₹800). Payment was updated to ₹800, not doubled to ₹1800. No duplicate payments created."

  - task: "PetPooja webhook - cancelled bill reversal"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "POST /api/petpooja/payment-webhook updated to handle cancelled bills. Status 'cancelled' removes existing payment and recalculates order totals."
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Cancelled bill reversal working correctly. Sent active bill (₹1000 payment synced), then sent same bill with status='cancelled'. Payment was properly reversed (confirmed by webhook response message). Order pending amounts recalculated correctly."

  - task: "Order pending recalculation after cancellation"
    implemented: true
    working: true
    file: "backend/server.py"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: "NA"
          agent: "main"
          comment: "Payment cancellation logic updated to recalculate order paid_amount and pending_amount from remaining payments after deletion"
        - working: true
          agent: "testing"
          comment: "✅ TESTED: Order pending recalculation after cancellation working correctly. Created order (₹1000), recorded manual payment (₹300), added PetPooja payment (₹500), then cancelled PetPooja bill. Order correctly reverted to manual payment only (₹300 paid, ₹700 pending). Recalculation logic working properly."


frontend:
  - task: "NewOrder page crash fix"
    implemented: true
    working: true
    file: "frontend/src/pages/NewOrder.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Fixed React.useRef to useRef import. Page loads correctly now."

  - task: "Phone number 10 digit restriction"
    implemented: true
    working: true
    file: "frontend/src/pages/NewOrder.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Added maxLength=10, regex to strip non-digits, validation message"

  - task: "Gender mandatory"
    implemented: true
    working: true
    file: "frontend/src/pages/NewOrder.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Made gender required with validation in submit and red border + error message"

  - task: "Deleted Orders page and sidebar"
    implemented: true
    working: true
    file: "frontend/src/pages/DeletedOrders.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Created DeletedOrders.js page, added route in App.js, added sidebar link"

  - task: "Delete button on Pending Orders"
    implemented: true
    working: true
    file: "frontend/src/pages/PendingOrders.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Added delete button for super_admin and outlet_admin on pending order cards"

  - task: "ManageOrders show all images"
    implemented: true
    working: true
    file: "frontend/src/pages/ManageOrders.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Image column now shows primary, secondary, and actual cake photos. Preview dialog has gallery thumbnails."

  - task: "Voice instructions in ManageOrders"
    implemented: true
    working: true
    file: "frontend/src/pages/ManageOrders.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Added voice instruction audio player in order details dialog. Mic icon indicator on order number."

  - task: "PetPooja Sync default synced filter"
    implemented: true
    working: true
    file: "frontend/src/pages/PetPoojaSync.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
        - working: true
          agent: "main"
          comment: "Default filter shows synced only. Toggle buttons for Synced Only / View All."

metadata:
  created_by: "main_agent"
  version: "1.0"
  test_sequence: 2
  run_ui: false

test_plan:
  current_focus:
    - "Payment sync - only cake amount"
    - "Payment sync - bill edit handling"
    - "Payment sync - cancelled bill reversal"
    - "Payment sync - prevent phone matching non-cake items"
    - "Order amount change recalculates pending"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
    - agent: "main"
      message: "Major payment sync fixes. Test: 1) PATCH /api/orders/{id} with new total_amount should recalculate pending 2) POST /api/petpooja/payment-webhook with cake+coffee items should only sync cake amount 3) Bill edit scenario - same bill_number should update not duplicate 4) Cancelled bill should reverse payment. Auth: admin@usbakers.com/admin123"
    - agent: "testing"
      message: "✅ COMPREHENSIVE PAYMENT SYNC TESTING COMPLETED - ALL 5 TESTS PASSED! 1) Order amount change correctly recalculates pending amount (₹1000→₹1200, pending ₹500→₹700) 2) PetPooja webhook syncs only cake amount (₹1000) not full bill total (₹1100) 3) Bill edit updates existing payment (₹1000→₹800) without duplication 4) Cancelled bill properly reverses payment (confirmed by webhook response) 5) Order pending recalculation after cancellation works correctly. Payment sync functionality is working as expected."
