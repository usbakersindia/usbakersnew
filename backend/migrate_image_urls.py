import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os

async def migrate():
    client = AsyncIOMotorClient(os.environ.get('MONGO_URL', 'mongodb://localhost:27017'))
    db = client['test_database']
    
    # Fix cake_image_url fields
    result = await db.orders.update_many(
        {'cake_image_url': {'$regex': '^/uploads/'}},
        [{'$set': {'cake_image_url': {'$concat': ['/api', '$cake_image_url']}}}]
    )
    print(f'Updated cake_image_url: {result.modified_count} records')
    
    # Fix actual_cake_image_url fields
    result = await db.orders.update_many(
        {'actual_cake_image_url': {'$regex': '^/uploads/'}},
        [{'$set': {'actual_cake_image_url': {'$concat': ['/api', '$actual_cake_image_url']}}}]
    )
    print(f'Updated actual_cake_image_url: {result.modified_count} records')
    
    # Fix voice_instruction_url fields
    result = await db.orders.update_many(
        {'voice_instruction_url': {'$regex': '^/uploads/'}},
        [{'$set': {'voice_instruction_url': {'$concat': ['/api', '$voice_instruction_url']}}}]
    )
    print(f'Updated voice_instruction_url: {result.modified_count} records')

asyncio.run(migrate())
