"""Seed script to populate the database with dummy data for US Bakers CRM"""
import asyncio
import os
import uuid
import random
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
import bcrypt

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def gen_id():
    return str(uuid.uuid4())

async def seed():
    now = datetime.now(timezone.utc)
    today = now.strftime("%Y-%m-%d")
    tomorrow = (now + timedelta(days=1)).strftime("%Y-%m-%d")
    day3 = (now + timedelta(days=2)).strftime("%Y-%m-%d")
    day4 = (now + timedelta(days=3)).strftime("%Y-%m-%d")

    # Get existing super admin
    admin = await db.users.find_one({"role": "super_admin"}, {"_id": 0})
    admin_id = admin["id"] if admin else "admin-001"

    # ========== OUTLETS ==========
    outlets = [
        {
            "id": gen_id(), "name": "US Bakers - Andheri", "address": "Shop 12, Andheri West",
            "city": "Mumbai", "phone": "9876543210", "username": "andheri_outlet",
            "password_hash": hash_password("outlet123"), "ready_time_buffer_minutes": 30,
            "is_active": True, "created_at": now.isoformat(), "created_by": admin_id
        },
        {
            "id": gen_id(), "name": "US Bakers - Bandra", "address": "Hill Road, Bandra West",
            "city": "Mumbai", "phone": "9876543211", "username": "bandra_outlet",
            "password_hash": hash_password("outlet123"), "ready_time_buffer_minutes": 45,
            "is_active": True, "created_at": now.isoformat(), "created_by": admin_id
        },
        {
            "id": gen_id(), "name": "US Bakers - Juhu", "address": "Juhu Tara Road",
            "city": "Mumbai", "phone": "9876543212", "username": "juhu_outlet",
            "password_hash": hash_password("outlet123"), "ready_time_buffer_minutes": 30,
            "is_active": True, "created_at": now.isoformat(), "created_by": admin_id
        },
    ]
    await db.outlets.delete_many({})
    await db.outlets.insert_many(outlets)
    print(f"Created {len(outlets)} outlets")

    # ========== ZONES ==========
    zones = []
    for outlet in outlets:
        for z_name, charge, desc in [("Zone A - Nearby", 50.0, "Within 3 km radius"), ("Zone B - Medium", 100.0, "3-7 km radius"), ("Zone C - Far", 200.0, "7+ km radius")]:
            zones.append({
                "id": gen_id(), "outlet_id": outlet["id"], "name": z_name,
                "description": desc, "delivery_charge": charge,
                "is_active": True, "created_at": now.isoformat()
            })
    await db.zones.delete_many({})
    await db.zones.insert_many(zones)
    print(f"Created {len(zones)} zones")

    # ========== USERS ==========
    users_to_create = [
        {"email": "kitchen@usbakers.com", "name": "Kitchen Staff", "phone": "9800000001", "role": "kitchen", "password": "kitchen123", "outlet_id": outlets[0]["id"]},
        {"email": "outlet@usbakers.com", "name": "Outlet Admin", "phone": "9800000002", "role": "outlet_admin", "password": "outlet123", "outlet_id": outlets[0]["id"]},
        {"email": "manager@usbakers.com", "name": "Order Manager", "phone": "9800000003", "role": "order_manager", "password": "manager123", "outlet_id": outlets[0]["id"]},
        {"email": "factory@usbakers.com", "name": "Factory Manager", "phone": "9800000004", "role": "factory_manager", "password": "factory123", "outlet_id": None},
    ]
    # Remove old non-admin users
    await db.users.delete_many({"role": {"$ne": "super_admin"}})
    for u in users_to_create:
        user_doc = {
            "id": gen_id(), "email": u["email"], "name": u["name"], "phone": u["phone"],
            "role": u["role"], "permissions": [], "incentive_percentage": 0.0,
            "password_hash": hash_password(u["password"]), "outlet_id": u["outlet_id"],
            "is_active": True, "created_at": now.isoformat(), "created_by": admin_id
        }
        await db.users.insert_one(user_doc)
    print(f"Created {len(users_to_create)} users")

    # ========== SALES PERSONS ==========
    sales_persons = [
        {"id": gen_id(), "name": "Rahul Sharma", "phone": "9700000001", "outlet_id": outlets[0]["id"], "incentive_percentage": 5.0, "is_active": True, "created_at": now.isoformat()},
        {"id": gen_id(), "name": "Priya Patel", "phone": "9700000002", "outlet_id": outlets[1]["id"], "incentive_percentage": 5.0, "is_active": True, "created_at": now.isoformat()},
    ]
    await db.sales_persons.delete_many({})
    await db.sales_persons.insert_many(sales_persons)
    print(f"Created {len(sales_persons)} sales persons")

    # ========== FLAVOURS ==========
    await db.cake_flavours.delete_many({})
    flavours = []
    for fname in ["Chocolate Truffle", "Vanilla", "Red Velvet", "Butterscotch", "Black Forest", "Pineapple", "Mango", "Strawberry"]:
        flavours.append({"id": gen_id(), "name": fname, "is_active": True, "created_by": "user-admin", "created_at": now.isoformat()})
    await db.cake_flavours.insert_many(flavours)
    print(f"Created {len(flavours)} flavours")

    # ========== OCCASIONS ==========
    await db.occasions.delete_many({})
    occasions = []
    for oname in ["Birthday", "Anniversary", "Wedding", "Baby Shower", "Corporate Event"]:
        occasions.append({"id": gen_id(), "name": oname, "is_active": True, "created_by": "user-admin", "created_at": now.isoformat()})
    await db.occasions.insert_many(occasions)
    print(f"Created {len(occasions)} occasions")

    # ========== TIME SLOTS ==========
    await db.delivery_time_slots.delete_many({})
    time_slots = []
    for ts in ["09:00 AM - 11:00 AM", "11:00 AM - 01:00 PM", "01:00 PM - 03:00 PM", "03:00 PM - 05:00 PM", "05:00 PM - 07:00 PM", "07:00 PM - 09:00 PM"]:
        time_slots.append({"id": gen_id(), "time_slot": ts, "is_active": True, "created_by": "user-admin", "created_at": now.isoformat()})
    await db.delivery_time_slots.insert_many(time_slots)
    print(f"Created {len(time_slots)} time slots")

    # ========== DUMMY ORDERS ==========
    await db.orders.delete_many({})
    await db.payments.delete_many({})

    customers = [
        {"name": "Amit Kumar", "phone": "9100000001", "email": "amit@gmail.com", "birthday": "1990-05-15"},
        {"name": "Sneha Reddy", "phone": "9100000002", "email": "sneha@gmail.com", "birthday": "1995-08-22"},
        {"name": "Raj Malhotra", "phone": "9100000003", "email": "raj@gmail.com", "birthday": "1988-12-10"},
        {"name": "Pooja Singh", "phone": "9100000004", "email": "pooja@gmail.com", "birthday": "1992-03-28"},
        {"name": "Vikram Desai", "phone": "9100000005", "email": "vikram@gmail.com", "birthday": "1985-07-04"},
        {"name": "Neha Joshi", "phone": "9100000006", "email": "neha@gmail.com", "birthday": "1998-01-18"},
        {"name": "Karan Mehta", "phone": "9100000007", "email": "karan@gmail.com", "birthday": "1993-11-30"},
        {"name": "Anita Verma", "phone": "9100000008", "email": "anita@gmail.com", "birthday": "1996-06-25"},
    ]

    flavour_names = [f["name"] for f in flavours]
    occasion_names = [o["name"] for o in occasions]
    time_slot_names = [t["time_slot"] for t in time_slots]
    cake_messages = ["Happy Birthday!", "Congratulations!", "Best Wishes", "With Love", "Happy Anniversary!", "You're Special", None]
    instructions = ["Extra cream on top", "No fondant please", "Sugar-free option", "Add fresh fruits", "Write in red color", None, None]
    statuses = ["pending", "confirmed", "in_progress", "ready", "delivered"]
    sizes = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0]

    order_configs = [
        # Today's orders - mixed statuses
        {"date": today, "count": 6, "statuses": ["pending", "confirmed", "in_progress", "ready", "delivered", "confirmed"]},
        # Tomorrow's orders - mostly pending/confirmed
        {"date": tomorrow, "count": 4, "statuses": ["pending", "pending", "confirmed", "confirmed"]},
        # Day after tomorrow
        {"date": day3, "count": 3, "statuses": ["pending", "pending", "confirmed"]},
        # 3 days later
        {"date": day4, "count": 2, "statuses": ["pending", "pending"]},
    ]

    all_orders = []
    all_payments = []
    order_counter = 1001

    for config in order_configs:
        for i in range(config["count"]):
            cust = random.choice(customers)
            outlet = random.choice(outlets)
            zone = random.choice([z for z in zones if z["outlet_id"] == outlet["id"]])
            size = random.choice(sizes)
            total = size * random.choice([500, 600, 700, 800, 900, 1000, 1200])
            status = config["statuses"][i % len(config["statuses"])]
            needs_delivery = random.choice([True, False])

            paid_amount = 0.0
            lifecycle = "pending_payment"
            is_ready = False

            if status in ["confirmed", "in_progress", "ready", "delivered"]:
                paid_amount = round(total * 0.2, 2)  # 20% advance
                lifecycle = "active"
            if status == "ready":
                is_ready = True
                paid_amount = total
            if status == "delivered":
                is_ready = True
                paid_amount = total
                lifecycle = "completed"

            order_id = gen_id()
            order = {
                "id": order_id,
                "order_number": str(order_counter),
                "order_type": random.choice(["regular", "custom"]),
                "receiver_info": None,
                "customer_info": {
                    "name": cust["name"], "phone": cust["phone"],
                    "email": cust["email"], "birthday": cust["birthday"]
                },
                "needs_delivery": needs_delivery,
                "delivery_address": "123 Main Street, Apt 4B" if needs_delivery else None,
                "delivery_city": "Mumbai" if needs_delivery else None,
                "zone_id": zone["id"] if needs_delivery else None,
                "occasion": random.choice(occasion_names),
                "flavour": random.choice(flavour_names),
                "size_pounds": size,
                "cake_image_url": "https://placehold.co/400x400/e92587/white?text=Cake",
                "actual_cake_image_url": None,
                "secondary_images": [],
                "name_on_cake": random.choice(cake_messages),
                "special_instructions": random.choice(instructions),
                "voice_instruction_url": None,
                "delivery_date": config["date"],
                "delivery_time": random.choice(time_slot_names),
                "status": status,
                "lifecycle_status": lifecycle,
                "outlet_id": outlet["id"],
                "created_by": admin_id,
                "order_taken_by": random.choice(sales_persons)["id"],
                "is_punch_order": status != "pending",
                "total_amount": round(total, 2),
                "paid_amount": round(paid_amount, 2),
                "pending_amount": round(total - paid_amount, 2),
                "payment_synced_from_petpooja": False,
                "petpooja_bill_numbers": [],
                "petpooja_comment": None,
                "is_credit_order": False,
                "credit_released_by": None,
                "credit_released_at": None,
                "is_hold": False,
                "is_ready": is_ready,
                "ready_at": now.isoformat() if is_ready else None,
                "transfer_to_outlet_id": None,
                "is_deleted": False,
                "delete_requested_by": None,
                "delete_approved_by": None,
                "assigned_delivery_partner": None,
                "picked_up_at": None, "reached_at": None, "delivered_at": now.isoformat() if status == "delivered" else None,
                "delivery_code": None, "delivery_otp": None,
                "whatsapp_alerts": True,
                "created_at": now.isoformat(),
                "updated_at": now.isoformat(),
                "modified_after_ready": False,
                "modification_count": 0,
            }
            all_orders.append(order)

            # Create payments for orders that have paid
            if paid_amount > 0:
                payment = {
                    "id": gen_id(), "order_id": order_id,
                    "amount": round(paid_amount, 2),
                    "payment_method": random.choice(["cash", "upi", "card", "bank_transfer"]),
                    "petpooja_bill_number": None,
                    "paid_at": now.isoformat(), "recorded_by": admin_id
                }
                all_payments.append(payment)

            order_counter += 1

    await db.orders.insert_many(all_orders)
    if all_payments:
        await db.payments.insert_many(all_payments)
    print(f"Created {len(all_orders)} orders and {len(all_payments)} payments")

    # ========== SYSTEM SETTINGS ==========
    await db.system_settings.delete_many({})
    await db.system_settings.insert_one({
        "id": "system-settings",
        "minimum_payment_percentage": 20.0,
        "birthday_mandatory": False,
        "updated_at": now.isoformat()
    })
    print("System settings initialized")

    print("\n=== SEED COMPLETE ===")
    print(f"Outlets: {len(outlets)}")
    print(f"Zones: {len(zones)}")
    print(f"Users: {len(users_to_create)} + 1 super admin")
    print(f"Orders: {len(all_orders)}")
    print(f"Payments: {len(all_payments)}")
    print("\n--- LOGIN CREDENTIALS ---")
    print("Super Admin: admin@usbakers.com / admin123")
    print("Kitchen:     kitchen@usbakers.com / kitchen123")
    print("Outlet Admin: outlet@usbakers.com / outlet123")
    print("Order Manager: manager@usbakers.com / manager123")
    print("Factory Manager: factory@usbakers.com / factory123")

if __name__ == "__main__":
    asyncio.run(seed())
