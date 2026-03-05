from fastapi import APIRouter, HTTPException, Depends, Query
from typing import Optional
from datetime import datetime, timezone
import sys
sys.path.append('/app/backend')

from models.schemas import User, UserRole
from routes.auth import get_current_user
from utils.cache import get_cache, set_cache
import logging

router = APIRouter(prefix="/reports", tags=["Reports"])
logger = logging.getLogger(__name__)

@router.get("/orders")
async def get_order_report(
    start_date: str,
    end_date: str,
    outlet_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Get order report with caching"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    # Check cache
    cache_key = f"report:orders:{start_date}:{end_date}:{outlet_id}:{status}:{current_user.id}"
    cached = get_cache(cache_key)
    if cached:
        return cached
    
    query = {
        "delivery_date": {"$gte": start_date, "$lte": end_date},
        "is_deleted": False
    }
    
    # Outlet filter
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query['outlet_id'] = current_user.outlet_id
    elif outlet_id:
        query['outlet_id'] = outlet_id
    
    if status:
        query['status'] = status
    
    # Optimized aggregation pipeline
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": None,
            "total_orders": {"$sum": 1},
            "total_amount": {"$sum": "$total_amount"},
            "total_paid": {"$sum": "$paid_amount"},
            "total_pending": {"$sum": "$pending_amount"},
            "orders": {"$push": "$$ROOT"}
        }},
        {"$project": {
            "_id": 0,
            "total_orders": 1,
            "total_amount": 1,
            "total_paid": 1,
            "total_pending": 1,
            "orders": {"$slice": ["$orders", 100]}  # Limit to 100 orders for performance
        }}
    ]
    
    result = await db.orders.aggregate(pipeline).to_list(1)
    
    if not result:
        response = {
            "orders": [],
            "summary": {
                "total_orders": 0,
                "total_amount": 0,
                "total_paid": 0,
                "total_pending": 0,
                "status_breakdown": {}
            }
        }
    else:
        data = result[0]
        
        # Status breakdown
        status_breakdown = {}
        for order in data.get('orders', []):
            status_val = order.get('status', 'unknown')
            status_breakdown[status_val] = status_breakdown.get(status_val, 0) + 1
            # Remove _id from orders
            order.pop('_id', None)
        
        response = {
            "orders": data.get('orders', []),
            "summary": {
                "total_orders": data.get('total_orders', 0),
                "total_amount": round(data.get('total_amount', 0), 2),
                "total_paid": round(data.get('total_paid', 0), 2),
                "total_pending": round(data.get('total_pending', 0), 2),
                "status_breakdown": status_breakdown
            }
        }
    
    # Cache result for 5 minutes
    set_cache(cache_key, response)
    
    return response

@router.get("/payments")
async def get_payment_report(
    start_date: str,
    end_date: str,
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Get payment report with optimized queries"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    try:
        # Parse dates
        if 'T' in start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_dt = datetime.fromisoformat(f"{start_date}T00:00:00+00:00")
        
        if 'T' in end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.fromisoformat(f"{end_date}T23:59:59+00:00")
        
        # Get order IDs for outlet filter
        order_query = {}
        if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
            order_query['outlet_id'] = current_user.outlet_id
        elif outlet_id:
            order_query['outlet_id'] = outlet_id
        
        if order_query:
            orders = await db.orders.find(order_query, {"_id": 0, "id": 1}).to_list(10000)
            order_ids = [o["id"] for o in orders]
            
            if not order_ids:
                return {
                    "payments": [],
                    "summary": {
                        "total_payments": 0,
                        "total_collected": 0,
                        "by_method": {}
                    }
                }
        else:
            order_ids = None
        
        # Optimized aggregation
        match_stage = {}
        if order_ids:
            match_stage["order_id"] = {"$in": order_ids}
        
        pipeline = [
            {"$match": match_stage} if match_stage else {"$match": {}},
            {"$group": {
                "_id": "$payment_method",
                "total": {"$sum": "$amount"},
                "count": {"$sum": 1},
                "payments": {"$push": "$$ROOT"}
            }}
        ]
        
        results = await db.payments.aggregate(pipeline).to_list(100)
        
        # Filter by date and format
        method_totals = {}
        filtered_payments = []
        total_count = 0
        
        for result in results:
            method = result['_id'] or 'unknown'
            method_total = 0
            
            for payment in result['payments']:
                paid_at = payment.get('paid_at')
                if isinstance(paid_at, str):
                    paid_dt = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
                else:
                    paid_dt = paid_at
                
                if start_dt <= paid_dt <= end_dt:
                    payment.pop('_id', None)
                    payment['paid_at'] = paid_dt.isoformat() if not isinstance(paid_at, str) else paid_at
                    filtered_payments.append(payment)
                    method_total += payment.get('amount', 0)
                    total_count += 1
            
            if method_total > 0:
                method_totals[method] = round(method_total, 2)
        
        total_collected = sum(method_totals.values())
        
        return {
            "payments": filtered_payments[:100],  # Limit response size
            "summary": {
                "total_payments": total_count,
                "total_collected": round(total_collected, 2),
                "by_method": method_totals
            }
        }
    
    except Exception as e:
        logger.error(f"Payment report error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate payment report: {str(e)}")

@router.get("/delivery")
async def get_delivery_report(
    start_date: str,
    end_date: str,
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db = None
):
    """Get delivery performance report"""
    if db is None:
        from config.database import Database
        db = Database.get_db()
    
    query = {
        "delivery_date": {"$gte": start_date, "$lte": end_date},
        "needs_delivery": True,
        "is_deleted": False
    }
    
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query['outlet_id'] = current_user.outlet_id
    elif outlet_id:
        query['outlet_id'] = outlet_id
    
    # Aggregation for counts
    pipeline = [
        {"$match": query},
        {"$group": {
            "_id": "$status",
            "count": {"$sum": 1}
        }}
    ]
    
    results = await db.orders.aggregate(pipeline).to_list(100)
    
    status_counts = {r['_id']: r['count'] for r in results}
    total = sum(status_counts.values())
    
    delivered = status_counts.get('delivered', 0)
    cancelled = status_counts.get('cancelled', 0)
    in_transit = status_counts.get('picked_up', 0) + status_counts.get('reached', 0)
    pending = status_counts.get('confirmed', 0) + status_counts.get('ready', 0)
    
    return {
        "summary": {
            "total_delivery_orders": total,
            "delivered": delivered,
            "cancelled": cancelled,
            "in_transit": in_transit,
            "pending_delivery": pending,
            "delivery_rate": round((delivered / total * 100) if total > 0 else 0, 2)
        }
    }
