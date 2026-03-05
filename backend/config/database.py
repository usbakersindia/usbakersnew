from motor.motor_asyncio import AsyncIOMotorClient
import os

class Database:
    client: AsyncIOMotorClient = None
    
    @classmethod
    async def connect_db(cls):
        """Create database connection pool"""
        mongo_url = os.environ['MONGO_URL']
        cls.client = AsyncIOMotorClient(
            mongo_url,
            maxPoolSize=50,  # Maximum 50 connections
            minPoolSize=10,  # Minimum 10 connections
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
        )
        print("✅ Database connection pool established")
    
    @classmethod
    async def close_db(cls):
        """Close database connection pool"""
        if cls.client:
            cls.client.close()
            print("✅ Database connection closed")
    
    @classmethod
    def get_db(cls):
        """Get database instance"""
        if cls.client is None:
            raise Exception("Database not connected")
        return cls.client[os.environ['DB_NAME']]

# Database indexes for performance
INDEXES = {
    "users": [
        {"keys": [("email", 1)], "unique": True},
        {"keys": [("role", 1), ("is_active", 1)]},
        {"keys": [("outlet_id", 1)]}
    ],
    "orders": [
        {"keys": [("order_number", 1)], "unique": True},
        {"keys": [("outlet_id", 1), ("status", 1)]},
        {"keys": [("delivery_date", 1), ("status", 1)]},
        {"keys": [("created_at", -1)]},
        {"keys": [("customer_info.phone", 1)]},
        {"keys": [("is_deleted", 1), ("is_hold", 1)]}
    ],
    "outlets": [
        {"keys": [("username", 1)], "unique": True},
        {"keys": [("is_active", 1)]}
    ],
    "payments": [
        {"keys": [("order_id", 1)]},
        {"keys": [("paid_at", -1)]}
    ],
    "customers": [
        {"keys": [("phone", 1)]},
        {"keys": [("email", 1)]},
        {"keys": [("outlet_id", 1)]}
    ],
    "zones": [
        {"keys": [("outlet_id", 1), ("is_active", 1)]}
    ]
}

async def create_indexes():
    """Create database indexes for performance"""
    db = Database.get_db()
    
    for collection_name, indexes in INDEXES.items():
        collection = db[collection_name]
        for index in indexes:
            try:
                await collection.create_index(
                    index["keys"],
                    unique=index.get("unique", False),
                    background=True
                )
            except Exception as e:
                print(f"⚠️  Index creation warning for {collection_name}: {e}")
    
    print("✅ Database indexes created")
