# Cache configuration
CACHE_CONFIG = {
    "enabled": True,
    "ttl": 300,  # 5 minutes default TTL
    "max_size": 1000  # Maximum cached items
}

# In-memory cache (for production, use Redis)
_cache = {}
_cache_timestamps = {}

def get_cache(key: str):
    """Get value from cache"""
    if not CACHE_CONFIG["enabled"]:
        return None
    
    if key in _cache:
        from datetime import datetime, timedelta
        timestamp = _cache_timestamps.get(key)
        if timestamp and (datetime.now() - timestamp).seconds < CACHE_CONFIG["ttl"]:
            return _cache[key]
        else:
            # Expired
            del _cache[key]
            del _cache_timestamps[key]
    
    return None

def set_cache(key: str, value: any):
    """Set value in cache"""
    if not CACHE_CONFIG["enabled"]:
        return
    
    # Check cache size limit
    if len(_cache) >= CACHE_CONFIG["max_size"]:
        # Remove oldest entry
        oldest_key = min(_cache_timestamps, key=_cache_timestamps.get)
        del _cache[oldest_key]
        del _cache_timestamps[oldest_key]
    
    from datetime import datetime
    _cache[key] = value
    _cache_timestamps[key] = datetime.now()

def clear_cache(pattern: str = None):
    """Clear cache by pattern or all"""
    if pattern:
        keys_to_delete = [k for k in _cache.keys() if pattern in k]
        for key in keys_to_delete:
            del _cache[key]
            del _cache_timestamps[key]
    else:
        _cache.clear()
        _cache_timestamps.clear()
