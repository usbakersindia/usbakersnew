from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from contextlib import asynccontextmanager
import logging
import sys
import os

# Add backend to path
sys.path.append('/app/backend')

# Import database and middleware
from config.database import Database, create_indexes
from middleware.error_handler import (
    error_handler_middleware,
    validation_exception_handler,
    http_exception_handler
)

# Import routes
from routes.auth import router as auth_router
from routes.orders import router as orders_router
from routes.reports import router as reports_router

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events"""
    # Startup
    logger.info("🚀 Starting US Bakers CRM API...")
    await Database.connect_db()
    await create_indexes()
    logger.info("✅ Application started successfully")
    
    yield
    
    # Shutdown
    logger.info("👋 Shutting down...")
    await Database.close_db()
    logger.info("✅ Shutdown complete")

# Create FastAPI app
app = FastAPI(
    title="US Bakers CRM API",
    description="Scalable multi-outlet bakery management system",
    version="2.0.0",
    lifespan=lifespan
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "https://*.preview.emergentagent.com",
        "https://*.emergentagent.com"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"]
)

# Error handling middleware
app.middleware("http")(error_handler_middleware)
app.add_exception_handler(RequestValidationError, validation_exception_handler)
app.add_exception_handler(StarletteHTTPException, http_exception_handler)

# Include routers
app.include_router(auth_router, prefix="/api")
app.include_router(orders_router, prefix="/api")
app.include_router(reports_router, prefix="/api")

# Import and include remaining routes from old server
# (We'll gradually migrate all routes to separate modules)
from server import api_router as legacy_router
app.include_router(legacy_router, prefix="/api")

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "US Bakers CRM API v2.0 - Scalable Architecture",
        "status": "healthy",
        "features": [
            "Connection pooling",
            "Database indexing",
            "Query optimization",
            "Caching layer",
            "Pagination support",
            "Error handling middleware",
            "Modular architecture"
        ]
    }

@app.get("/health")
async def health_check():
    """Health check endpoint"""
    try:
        db = Database.get_db()
        # Quick DB check
        await db.command("ping")
        return {
            "status": "healthy",
            "database": "connected",
            "version": "2.0.0"
        }
    except Exception as e:
        return {
            "status": "unhealthy",
            "database": "disconnected",
            "error": str(e)
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "server_v2:app",
        host="0.0.0.0",
        port=8001,
        reload=True,
        log_level="info"
    )
