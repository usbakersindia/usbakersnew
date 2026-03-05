#!/usr/bin/env python3
"""Fresh database seeding for US Bakers - Custom outlets and users"""

from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from datetime import datetime, timezone, timedelta
import os
import random
import sys
sys.path.append('/app/backend')

from models.schemas import UserRole, OrderStatus

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

async def clear_and_seed():
    """Clear all data and seed fresh"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("\n🧹 Clearing existing data...")
    
    # Clear all collections except admin user
    await db.users.delete_many({"email": {"$ne": "admin@usbakers.com"}})
    await db.outlets.delete_many({})
    await db.zones.delete_many({})
    await db.orders.delete_many({})
    await db.customers.delete_many({})
    await db.payments.delete_many({})
    
    print("✅ Data cleared\n")
    print("🌱 Creating fresh data...\n")
    
    # 1. Create 2 Outlets
    outlets_data = [
        {
            "id": "outlet-railway",
            "name": "US Bakers Railway Road",
            "address": "Railway Road, Near Station",
            "city": "Jammu",
            "phone": "+919876543210",
            "username": "railway_road",
            "password_hash": get_password_hash("railway123"),
            "ready_time_buffer_minutes": 60,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "outlet-dhangu",
            "name": "US Bakers Dhangu Road",
            "address": "Dhangu Road, Main Market",
            "city": "Jammu",
            "phone": "+919876543211",
            "username": "dhangu_road",
            "password_hash": get_password_hash("dhangu123"),
            "ready_time_buffer_minutes": 60,
            "is_active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for outlet in outlets_data:
        await db.outlets.insert_one(outlet)
    print(f"✅ Created {len(outlets_data)} outlets:")
    print(f"   - US Bakers Railway Road")
    print(f"   - US Bakers Dhangu Road\n")
    
    # 2. Create Zones
    zones_data = [
        {"id": "zone-railway-1", "outlet_id": "outlet-railway", "name": "Railway Road Zone A", "delivery_charge": 50.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "zone-railway-2", "outlet_id": "outlet-railway", "name": "Railway Road Zone B", "delivery_charge": 75.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "zone-dhangu-1", "outlet_id": "outlet-dhangu", "name": "Dhangu Road Zone A", "delivery_charge": 50.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "zone-dhangu-2", "outlet_id": "outlet-dhangu", "name": "Dhangu Road Zone B", "delivery_charge": 75.0, "is_active": True, "created_at": datetime.now(timezone.utc).isoformat()}
    ]
    
    for zone in zones_data:
        await db.zones.insert_one(zone)
    print(f"✅ Created {len(zones_data)} zones\n")
    
    # 3. Create Users
    users_data = [
        {
            "id": "user-satyam",
            "email": "satyam@usbakers.com",
            "name": "Satyam (Dhangu Road Admin)",
            "phone": "+919876543220",
            "role": "outlet_admin",
            "permissions": ["can_create_order", "can_view_orders", "can_edit_orders", "can_record_payment", "can_view_reports"],
            "password_hash": get_password_hash("satyam123"),
            "outlet_id": "outlet-dhangu",
            "is_active": True,
            "incentive_percentage": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "user-sushant",
            "email": "sushant@usbakers.com",
            "name": "Sushant (Railway Road Admin)",
            "phone": "+919876543221",
            "role": "outlet_admin",
            "permissions": ["can_create_order", "can_view_orders", "can_edit_orders", "can_record_payment", "can_view_reports"],
            "password_hash": get_password_hash("sushant123"),
            "outlet_id": "outlet-railway",
            "is_active": True,
            "incentive_percentage": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        },
        {
            "id": "user-factory",
            "email": "factory@usbakers.com",
            "name": "Factory Admin",
            "phone": "+919876543222",
            "role": "kitchen",
            "permissions": ["can_view_orders", "can_mark_ready", "can_view_reports"],
            "password_hash": get_password_hash("factory123"),
            "outlet_id": None,  # Can see all outlets
            "is_active": True,
            "incentive_percentage": 0.0,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
    ]
    
    for user in users_data:
        await db.users.insert_one(user)
    print(f"✅ Created {len(users_data)} users:")
    print(f"   - Satyam (Dhangu Road Admin)")
    print(f"   - Sushant (Railway Road Admin)")
    print(f"   - Factory Admin\n")
    
    # 4. Create Customers
    customers_data = [
        {"id": "cust-1", "name": "Rajesh Kumar", "phone": "+919988776655", "address": "Sector 1, Railway Road", "city": "Jammu", "gender": "male", "total_orders": 0, "total_spent": 0.0, "outlet_id": "outlet-railway", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-2", "name": "Priya Sharma", "phone": "+919988776656", "address": "Sector 2, Dhangu Road", "city": "Jammu", "gender": "female", "total_orders": 0, "total_spent": 0.0, "outlet_id": "outlet-dhangu", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-3", "name": "Amit Singh", "phone": "+919988776657", "address": "Near Railway Station", "city": "Jammu", "gender": "male", "total_orders": 0, "total_spent": 0.0, "outlet_id": "outlet-railway", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-4", "name": "Neha Gupta", "phone": "+919988776658", "address": "Main Market, Dhangu", "city": "Jammu", "gender": "female", "total_orders": 0, "total_spent": 0.0, "outlet_id": "outlet-dhangu", "created_at": datetime.now(timezone.utc).isoformat()},
        {"id": "cust-5", "name": "Vikram Rathore", "phone": "+919988776659", "address": "Canal Road", "city": "Jammu", "gender": "male", "total_orders": 0, "total_spent": 0.0, "outlet_id": "outlet-railway", "created_at": datetime.now(timezone.utc).isoformat()},
    ]
    
    for customer in customers_data:
        await db.customers.insert_one(customer)
    print(f"✅ Created {len(customers_data)} customers\n")
    
    # 5. Create 20 Orders for next 5 days
    flavours = ["Chocolate", "Vanilla", "Strawberry", "Black Forest", "Red Velvet", "Butterscotch", "Pineapple", "Mango"]
    sizes = [0.5, 1, 1.5, 2, 3, 4]
    times = ["10:00 AM", "12:00 PM", "2:00 PM", "4:00 PM", "6:00 PM", "8:00 PM"]
    
    orders_data = []
    today = datetime.now(timezone.utc)
    
    for i in range(20):
        # Random day in next 5 days
        days_ahead = random.randint(0, 4)
        order_date = today + timedelta(days=days_ahead)
        
        # Randomly assign to outlet
        outlet = random.choice(["outlet-railway", "outlet-dhangu"])
        outlet_name = "Railway Road" if outlet == "outlet-railway" else "Dhangu Road"
        created_by = "user-sushant" if outlet == "outlet-railway" else "user-satyam"
        
        # Random customer from that outlet
        outlet_customers = [c for c in customers_data if c["outlet_id"] == outlet]
        customer = random.choice(outlet_customers)
        
        needs_delivery = random.choice([True, False])
        size = random.choice(sizes)
        base_price = size * 500  # ₹500 per lb
        total_amount = base_price + (50 if needs_delivery else 0)
        
        # Random status for variety
        status_choice = random.choice(["pending", "confirmed", "confirmed", "ready", "ready", "delivered"])
        
        order = {
            "id": f"order-{i+1:03d}",
            "order_number": f"USB{(i+1):04d}",
            "order_type": "self",
            "customer_info": {
                "name": customer["name"],
                "phone": customer["phone"],
                "gender": customer.get("gender")
            },
            "needs_delivery": needs_delivery,
            "delivery_address": customer["address"] if needs_delivery else None,
            "delivery_city": customer["city"] if needs_delivery else None,
            "zone_id": f"zone-{'railway' if outlet == 'outlet-railway' else 'dhangu'}-1" if needs_delivery else None,
            "flavour": random.choice(flavours),
            "size_pounds": size,
            "cake_image_url": "https://via.placeholder.com/400x300.png?text=Cake+Image",
            "name_on_cake": random.choice(["Happy Birthday", "Congratulations", "Best Wishes", "Anniversary", None]),
            "special_instructions": random.choice(["No eggs", "Sugar-free", "Extra cream", "Less sweet", None]),
            "delivery_date": order_date.strftime("%Y-%m-%d"),
            "delivery_time": random.choice(times),
            "status": status_choice,
            "outlet_id": outlet,
            "created_by": created_by,
            "order_taken_by": created_by,
            "total_amount": round(total_amount, 2),
            "paid_amount": round(total_amount * 0.5, 2) if status_choice != "pending" else 0.0,
            "pending_amount": round(total_amount * 0.5, 2) if status_choice != "pending" else total_amount,
            "payment_synced_from_petpooja": status_choice != "pending",
            "is_hold": status_choice == "pending",
            "is_ready": status_choice in ["ready", "delivered"],
            "ready_at": order_date.isoformat() if status_choice in ["ready", "delivered"] else None,
            "delivered_at": order_date.isoformat() if status_choice == "delivered" else None,
            "delivery_otp": str(random.randint(100000, 999999)) if needs_delivery else None,
            "is_deleted": False,
            "created_at": (today - timedelta(days=random.randint(0, 2))).isoformat(),
            "updated_at": order_date.isoformat()
        }
        
        orders_data.append(order)
    
    for order in orders_data:
        await db.orders.insert_one(order)
    
    print(f"✅ Created {len(orders_data)} orders")
    print(f"   Distributed across next 5 days randomly\n")
    
    # Distribution summary
    railway_orders = sum(1 for o in orders_data if o["outlet_id"] == "outlet-railway")
    dhangu_orders = sum(1 for o in orders_data if o["outlet_id"] == "outlet-dhangu")
    
    print(f"📊 Order Distribution:")
    print(f"   - Railway Road: {railway_orders} orders")
    print(f"   - Dhangu Road: {dhangu_orders} orders\n")
    
    # 6. Create Payments for non-pending orders
    payments_data = []
    for order in orders_data:
        if order["paid_amount"] > 0:
            payment = {
                "id": f"payment-{order['id']}",
                "order_id": order["id"],
                "amount": order["paid_amount"],
                "payment_method": random.choice(["cash", "card", "upi"]),
                "recorded_by": "system",
                "paid_at": order["created_at"]
            }
            payments_data.append(payment)
    
    for payment in payments_data:
        await db.payments.insert_one(payment)
    
    print(f"✅ Created {len(payments_data)} payments\n")
    
    print("\n" + "="*60)
    print("🎉 Fresh Data Created Successfully!")
    print("="*60)
    
    print(f"\n📦 Summary:")
    print(f"   - Outlets: 2")
    print(f"   - Zones: 4")
    print(f"   - Users: 3 (+ Super Admin)")
    print(f"   - Customers: 5")
    print(f"   - Orders: {len(orders_data)}")
    print(f"   - Payments: {len(payments_data)}")
    
    print(f"\n🔑 Login Credentials:")
    print(f"\n   Super Admin:")
    print(f"   📧 admin@usbakers.com")
    print(f"   🔒 admin123")
    
    print(f"\n   Dhangu Road Admin:")
    print(f"   📧 satyam@usbakers.com")
    print(f"   🔒 satyam123")
    
    print(f"\n   Railway Road Admin:")
    print(f"   📧 sushant@usbakers.com")
    print(f"   🔒 sushant123")
    
    print(f"\n   Factory Admin:")
    print(f"   📧 factory@usbakers.com")
    print(f"   🔒 factory123")
    
    print(f"\n✅ All done! System ready for use.\n")
    
    client.close()

if __name__ == "__main__":
    import asyncio
    from dotenv import load_dotenv
    from pathlib import Path
    
    ROOT_DIR = Path("/app/backend")
    load_dotenv(ROOT_DIR / '.env')
    
    asyncio.run(clear_and_seed())
