from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import os
import random
import sys
sys.path.append('/app/backend')

from models.schemas import UserRole, OrderStatus, OrderType, Gender

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def seed_database():
    """Seed database with comprehensive test data"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("🌱 Starting database seeding...")
    
    # Clear existing data (optional - comment out if you want to keep existing data)
    # await db.users.delete_many({"email": {"$ne": "admin@usbakers.com"}})
    # await db.outlets.delete_many({})
    # await db.zones.delete_many({})
    # await db.orders.delete_many({})
    # await db.customers.delete_many({})
    # await db.payments.delete_many({})
    
    # 1. Create Outlets
    outlets_data = [
        {"id": "outlet-1", "name": "US Bakers - Koramangala", "address": "123 Main Street", "city": "Bangalore", "phone": "+919876543210", "username": "koramangala", "password_hash": get_password_hash("outlet123"), "ready_time_buffer_minutes": 60, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "outlet-2", "name": "US Bakers - Indiranagar", "address": "456 Second Street", "city": "Bangalore", "phone": "+919876543211", "username": "indiranagar", "password_hash": get_password_hash("outlet123"), "ready_time_buffer_minutes": 60, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "outlet-3", "name": "US Bakers - Whitefield", "address": "789 Third Avenue", "city": "Bangalore", "phone": "+919876543212", "username": "whitefield", "password_hash": get_password_hash("outlet123"), "ready_time_buffer_minutes": 60, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    
    for outlet in outlets_data:
        await db.outlets.update_one({"id": outlet["id"]}, {"$set": outlet}, upsert=True)
    print(f"✅ Created {len(outlets_data)} outlets")
    
    # 2. Create Zones
    zones_data = [
        {"id": "zone-1", "outlet_id": "outlet-1", "name": "Zone A - Koramangala", "delivery_charge": 50.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "zone-2", "outlet_id": "outlet-1", "name": "Zone B - BTM", "delivery_charge": 75.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "zone-3", "outlet_id": "outlet-2", "name": "Zone C - Indiranagar", "delivery_charge": 50.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "zone-4", "outlet_id": "outlet-3", "name": "Zone D - Whitefield", "delivery_charge": 100.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    
    for zone in zones_data:
        await db.zones.update_one({"id": zone["id"]}, {"$set": zone}, upsert=True)
    print(f"✅ Created {len(zones_data)} zones")
    
    # 3. Create Users
    users_data = [
        {"id": "user-kitchen-1", "email": "kitchen1@usbakers.com", "name": "Ravi Kumar (Kitchen)", "phone": "+919876543220", "role": "kitchen", "permissions": ["can_view_orders", "can_mark_ready"], "password_hash": get_password_hash("kitchen123"), "outlet_id": "outlet-1", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "user-delivery-1", "email": "delivery1@usbakers.com", "name": "Suresh (Delivery)", "phone": "+919876543221", "role": "delivery", "permissions": ["can_view_orders", "can_update_delivery"], "password_hash": get_password_hash("delivery123"), "outlet_id": "outlet-1", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "user-manager-1", "email": "manager1@usbakers.com", "name": "Priya Sharma (Manager)", "phone": "+919876543222", "role": "order_manager", "permissions": ["can_create_order", "can_view_orders", "can_edit_orders", "can_record_payment"], "password_hash": get_password_hash("manager123"), "outlet_id": "outlet-1", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "user-kitchen-2", "email": "kitchen2@usbakers.com", "name": "Amit (Kitchen)", "phone": "+919876543223", "role": "kitchen", "permissions": ["can_view_orders", "can_mark_ready"], "password_hash": get_password_hash("kitchen123"), "outlet_id": "outlet-2", "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    
    for user in users_data:
        await db.users.update_one({"id": user["id"]}, {"$set": user}, upsert=True)
    print(f"✅ Created {len(users_data)} users")
    
    # 4. Create Customers
    customers_data = [
        {"id": "cust-1", "name": "Rajesh Kumar", "phone": "+919988776655", "email": "rajesh@example.com", "address": "123 MG Road", "city": "Bangalore", "gender": "male", "birthday": "1990-05-15", "total_orders": 5, "total_spent": 2500.0, "outlet_id": "outlet-1", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-2", "name": "Priya Reddy", "phone": "+919988776656", "email": "priya@example.com", "address": "456 Brigade Road", "city": "Bangalore", "gender": "female", "birthday": "1992-08-20", "total_orders": 3, "total_spent": 1800.0, "outlet_id": "outlet-1", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-3", "name": "Vikram Singh", "phone": "+919988776657", "email": "vikram@example.com", "address": "789 Whitefield Main Road", "city": "Bangalore", "gender": "male", "total_orders": 2, "total_spent": 1200.0, "outlet_id": "outlet-3", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-4", "name": "Anita Desai", "phone": "+919988776658", "email": "anita@example.com", "address": "321 Indiranagar", "city": "Bangalore", "gender": "female", "birthday": "1988-12-10", "total_orders": 4, "total_spent": 2000.0, "outlet_id": "outlet-2", "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    
    for customer in customers_data:
        await db.customers.update_one({"id": customer["id"]}, {"$set": customer}, upsert=True)
    print(f"✅ Created {len(customers_data)} customers")
    
    # 5. Create Orders with various statuses
    flavours = ["Chocolate", "Vanilla", "Strawberry", "Black Forest", "Red Velvet", "Butterscotch", "Pineapple"]
    sizes = [0.5, 1, 1.5, 2, 3]
    statuses = [OrderStatus.PENDING, OrderStatus.CONFIRMED, OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]
    
    orders_data = []
    for i in range(30):
        order_date = datetime.now(timezone.utc) + timedelta(days=random.randint(-5, 5))
        status = random.choice(statuses)
        outlet_id = random.choice(["outlet-1", "outlet-2", "outlet-3"])
        customer = random.choice(customers_data)
        needs_delivery = random.choice([True, False])
        
        order = {
            "id": f"order-{i+1}",
            "order_number": f"USB{str(i+1).zfill(4)}",
            "order_type": "self",
            "customer_info": {"name": customer["name"], "phone": customer["phone"], "gender": customer.get("gender")},
            "needs_delivery": needs_delivery,
            "delivery_address": customer["address"] if needs_delivery else None,
            "delivery_city": customer["city"] if needs_delivery else None,
            "zone_id": f"zone-{random.randint(1, 4)}" if needs_delivery else None,
            "flavour": random.choice(flavours),
            "size_pounds": random.choice(sizes),
            "cake_image_url": "https://via.placeholder.com/400x300.png?text=Cake+Image",
            "name_on_cake": random.choice(["Happy Birthday", "Congratulations", "Best Wishes", None]),
            "special_instructions": random.choice(["No eggs", "Sugar-free", "Extra cream", None]),
            "delivery_date": order_date.strftime("%Y-%m-%d"),
            "delivery_time": random.choice(["10:00 AM", "2:00 PM", "5:00 PM", "7:00 PM"]),
            "status": status.value,
            "outlet_id": outlet_id,
            "created_by": "user-manager-1",
            "order_taken_by": "user-manager-1",
            "total_amount": round(random.uniform(500, 3000), 2),
            "paid_amount": 0.0,
            "pending_amount": 0.0,
            "payment_synced_from_petpooja": False,
            "is_hold": status == OrderStatus.PENDING,
            "is_ready": status in [OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED],
            "ready_at": order_date.isoformat() if status in [OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED] else None,
            "delivered_at": order_date.isoformat() if status == OrderStatus.DELIVERED else None,
            "delivery_otp": str(random.randint(100000, 999999)) if needs_delivery else None,
            "is_deleted": False,
            "created_at": order_date.isoformat(),
            "updated_at": order_date.isoformat()
        }
        
        # Set paid amounts for confirmed/delivered orders
        if status in [OrderStatus.CONFIRMED, OrderStatus.READY, OrderStatus.PICKED_UP, OrderStatus.DELIVERED]:
            paid = round(order["total_amount"] * random.uniform(0.5, 1.0), 2)
            order["paid_amount"] = paid
            order["pending_amount"] = round(order["total_amount"] - paid, 2)
            order["payment_synced_from_petpooja"] = True
        else:
            order["pending_amount"] = order["total_amount"]
        
        orders_data.append(order)
    
    for order in orders_data:
        await db.orders.update_one({"id": order["id"]}, {"$set": order}, upsert=True)
    print(f"✅ Created {len(orders_data)} orders")
    
    # 6. Create Payments
    payments_data = []
    for order in orders_data:
        if order["paid_amount"] > 0:
            payment = {
                "id": f"payment-{order['id']}",
                "order_id": order["id"],
                "amount": order["paid_amount"],
                "payment_method": random.choice(["cash", "card", "upi", "online"]),
                "petpooja_bill_number": f"BILL{random.randint(1000, 9999)}",
                "recorded_by": "system",
                "paid_at": order["created_at"]
            }
            payments_data.append(payment)
    
    for payment in payments_data:
        await db.payments.update_one({"id": payment["id"]}, {"$set": payment}, upsert=True)
    print(f"✅ Created {len(payments_data)} payments")
    
    print("\n🎉 Database seeding completed!")
    print(f"\n📊 Summary:")
    print(f"   - Outlets: {len(outlets_data)}")
    print(f"   - Zones: {len(zones_data)}")
    print(f"   - Users: {len(users_data)}")
    print(f"   - Customers: {len(customers_data)}")
    print(f"   - Orders: {len(orders_data)}")
    print(f"   - Payments: {len(payments_data)}")
    print(f"\n🔐 Test Credentials:")
    print(f"   Super Admin: admin@usbakers.com / admin123")
    print(f"   Kitchen Staff: kitchen1@usbakers.com / kitchen123")
    print(f"   Delivery Staff: delivery1@usbakers.com / delivery123")
    print(f"   Manager: manager1@usbakers.com / manager123")
    print(f"   Outlet Login: koramangala / outlet123")
    
    client.close()

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    from pathlib import Path
    
    ROOT_DIR = Path("/app/backend")
    load_dotenv(ROOT_DIR / '.env')
    
    asyncio.run(seed_database())
