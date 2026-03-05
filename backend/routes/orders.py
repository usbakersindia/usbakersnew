from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional, List
from datetime import datetime, timezone
import sys
sys.path.append('/app/backend')

from models.schemas import Order, OrderCreate, OrderStatus, User
from routes.auth import get_current_user
from utils.helpers import PaginationParams, PaginatedResponse, build_query_filters
from utils.cache import get_cache, set_cache, clear_cache
import random

router = APIRouter(prefix="/orders", tags=["Orders"])

@router.get("")
async def get_orders(
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    status: Optional[str] = None,
    outlet_id: Optional[str] = None,
    delivery_date: Optional[str] = None,
    is_hold: Optional[bool] = None,
    search: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Get orders with pagination and filters"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    # Build query
    query = {"is_deleted": False}
    
    # Role-based filtering
    if current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    elif outlet_id:
        query["outlet_id"] = outlet_id
    
    # Status filter
    if status:
        query["status"] = status
    
    # Date filter
    if delivery_date:
        query["delivery_date"] = delivery_date
    
    # Hold filter
    if is_hold is not None:
        query["is_hold"] = is_hold
    
    # Search by order number or customer phone
    if search:
        query["$or"] = [
            {"order_number": {"$regex": search, "$options": "i"}},
            {"customer_info.phone": {"$regex": search, "$options": "i"}},
            {"customer_info.name": {"$regex": search, "$options": "i"}}
        ]
    
    # Pagination
    pagination = PaginationParams(page, page_size)
    
    # Get total count
    total = await db.orders.count_documents(query)
    
    # Get paginated data
    orders = await db.orders.find(query, {"_id": 0})\
        .sort("created_at", -1)\
        .skip(pagination.skip)\
        .limit(pagination.limit)\
        .to_list(pagination.limit)
    
    return PaginatedResponse.create(
        data=orders,
        total=total,
        page=page,
        page_size=page_size
    )

@router.post("", response_model=Order)
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Create a new order"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    # Create order
    order = Order(
        order_type=order_data.order_type,
        receiver_info=order_data.receiver_info,
        customer_info=order_data.customer_info,
        needs_delivery=order_data.needs_delivery,
        delivery_address=order_data.delivery_address,
        delivery_city=order_data.delivery_city,
        zone_id=order_data.zone_id,
        occasion=order_data.occasion,
        flavour=order_data.flavour,
        size_pounds=order_data.size_pounds,
        cake_image_url=order_data.cake_image_url,
        secondary_images=order_data.secondary_images,
        name_on_cake=order_data.name_on_cake,
        special_instructions=order_data.special_instructions,
        delivery_date=order_data.delivery_date,
        delivery_time=order_data.delivery_time,
        outlet_id=order_data.outlet_id,
        created_by=current_user.id,
        order_taken_by=current_user.id,
        total_amount=order_data.total_amount,
        pending_amount=order_data.total_amount,
        is_hold=True,
        delivery_otp=str(random.randint(100000, 999999)) if order_data.needs_delivery else None
    )
    
    # Convert to dict
    order_dict = order.model_dump()
    order_dict['created_at'] = order_dict['created_at'].isoformat()
    order_dict['updated_at'] = order_dict['updated_at'].isoformat()
    
    # Insert to database
    await db.orders.insert_one(order_dict)
    
    # Clear cache
    clear_cache("orders")
    
    return order

@router.get("/{order_id}")
async def get_order(
    order_id: str,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Get single order by ID"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    # Check cache
    cache_key = f"order:{order_id}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check access
    if current_user.outlet_id and order.get('outlet_id') != current_user.outlet_id:
        raise HTTPException(status_code=403, detail="Access forbidden")
    
    # Cache result
    set_cache(cache_key, order)
    
    return order

@router.patch("/{order_id}/status")
async def update_order_status(
    order_id: str,
    status_data: dict,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Update order status"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    new_status = status_data.get('status')
    
    if not new_status:
        raise HTTPException(status_code=400, detail="Status is required")
    
    # Validate status
    try:
        OrderStatus(new_status)
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Update order
    update_data = {
        "status": new_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add timestamps based on status
    if new_status == OrderStatus.READY.value:
        update_data["is_ready"] = True
        update_data["ready_at"] = datetime.now(timezone.utc).isoformat()
    elif new_status == OrderStatus.PICKED_UP.value:
        update_data["picked_up_at"] = datetime.now(timezone.utc).isoformat()
    elif new_status == OrderStatus.REACHED.value:
        update_data["reached_at"] = datetime.now(timezone.utc).isoformat()
    elif new_status == OrderStatus.DELIVERED.value:
        update_data["delivered_at"] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Clear cache
    clear_cache(f"order:{order_id}")
    clear_cache("orders")
    
    return {"message": "Order status updated", "status": new_status}
