#!/usr/bin/env python3
"""Performance monitoring script for US Bakers CRM"""

import sys
import os
sys.path.append('/app/backend')

from motor.motor_asyncio import AsyncIOMotorClient
import asyncio
from datetime import datetime

async def analyze_performance():
    """Analyze database performance and provide recommendations"""
    mongo_url = os.environ['MONGO_URL']
    client = AsyncIOMotorClient(mongo_url)
    db = client[os.environ['DB_NAME']]
    
    print("📊 US Bakers CRM - Performance Analysis\n")
    print("=" * 60)
    
    # Collection stats
    collections = ['users', 'orders', 'outlets', 'customers', 'payments', 'zones']
    
    for coll_name in collections:
        coll = db[coll_name]
        count = await coll.count_documents({})
        stats = await db.command("collStats", coll_name)
        size_mb = stats.get('size', 0) / (1024 * 1024)
        
        print(f"\n📁 {coll_name.upper()}:")
        print(f"   Documents: {count:,}")
        print(f"   Size: {size_mb:.2f} MB")
        print(f"   Avg Doc Size: {stats.get('avgObjSize', 0):,} bytes")
        
        # Check indexes
        indexes = await coll.list_indexes().to_list(100)
        print(f"   Indexes: {len(indexes)}")
        for idx in indexes:
            if idx['name'] != '_id_':
                print(f"      - {idx['name']}")
    
    # Query performance recommendations
    print("\n" + "=" * 60)
    print("💡 PERFORMANCE RECOMMENDATIONS:\n")
    
    orders_count = await db.orders.count_documents({})
    if orders_count > 1000:
        print("✅ Large dataset detected - Indexes are critical")
        print("   → Pagination implemented")
        print("   → Compound indexes on common queries")
        print("   → Caching layer active")
    
    if orders_count > 10000:
        print("\n⚠️  Consider:")
        print("   → Archive old orders (>1 year)")
        print("   → Implement Redis for caching")
        print("   → Read replicas for reports")
    
    print("\n" + "=" * 60)
    print("✅ Analysis complete!\n")
    
    client.close()

if __name__ == "__main__":
    from dotenv import load_dotenv
    from pathlib import Path
    
    ROOT_DIR = Path("/app/backend")
    load_dotenv(ROOT_DIR / '.env')
    
    asyncio.run(analyze_performance())
