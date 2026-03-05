from typing import Optional, List, Dict, Any
from datetime import datetime

class PaginationParams:
    """Pagination parameters for API endpoints"""
    def __init__(self, page: int = 1, page_size: int = 20, max_page_size: int = 100):
        self.page = max(1, page)
        self.page_size = min(max(1, page_size), max_page_size)
        self.skip = (self.page - 1) * self.page_size
        self.limit = self.page_size

class PaginatedResponse:
    """Standardized paginated response"""
    @staticmethod
    def create(
        data: List[Any],
        total: int,
        page: int,
        page_size: int,
        meta: Optional[Dict] = None
    ) -> Dict:
        total_pages = (total + page_size - 1) // page_size
        
        response = {
            "data": data,
            "pagination": {
                "total": total,
                "page": page,
                "page_size": page_size,
                "total_pages": total_pages,
                "has_next": page < total_pages,
                "has_prev": page > 1
            }
        }
        
        if meta:
            response["meta"] = meta
        
        return response

def build_query_filters(filters: Dict[str, Any]) -> Dict[str, Any]:
    """Build MongoDB query from filters, removing None values"""
    return {k: v for k, v in filters.items() if v is not None}

def format_datetime(dt: Any) -> str:
    """Convert datetime to ISO string"""
    if isinstance(dt, str):
        return dt
    if isinstance(dt, datetime):
        return dt.isoformat()
    return str(dt)
