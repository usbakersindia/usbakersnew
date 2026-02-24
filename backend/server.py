from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from passlib.context import CryptContext
from jose import JWTError, jwt
from datetime import datetime, timedelta, timezone
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from enum import Enum
import os
import logging
import uuid
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Create the main app
app = FastAPI(title="US Bakers - Bakery Management System")
api_router = APIRouter(prefix="/api")

# Security
SECRET_KEY = os.environ.get("SECRET_KEY", "your-secret-key-change-in-production-2024-us-bakers")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    OUTLET_ADMIN = "outlet_admin"
    ORDER_MANAGER = "order_manager"
    KITCHEN = "kitchen"
    DELIVERY = "delivery"
    ACCOUNTS = "accounts"

class OrderStatus(str, Enum):
    CONFIRMED = "confirmed"
    READY = "ready"
    PICKED_UP = "picked_up"
    REACHED = "reached"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderType(str, Enum):
    SELF = "self"
    SOMEONE_ELSE = "someone_else"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

# ==================== MODELS ====================

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: UserRole
    password_hash: str
    outlet_id: Optional[str] = None  # For outlet_admin, order_manager, kitchen
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None  # User ID of creator

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    role: UserRole
    password: str
    outlet_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: UserRole
    outlet_id: Optional[str] = None
    is_active: bool
    created_at: datetime

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# Outlet Models
class Outlet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    city: str
    phone: str
    incentive_percentage: float = 0.0
    ready_time_buffer_minutes: int = 30  # Default 30 mins buffer
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Super admin ID

class OutletCreate(BaseModel):
    name: str
    address: str
    city: str
    phone: str
    incentive_percentage: float = 0.0
    ready_time_buffer_minutes: int = 30

class OutletResponse(BaseModel):
    id: str
    name: str
    address: str
    city: str
    phone: str
    incentive_percentage: float
    ready_time_buffer_minutes: int
    is_active: bool
    created_at: datetime

# Zone Models
class Zone(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    outlet_id: str
    name: str
    delivery_charge: float
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ZoneCreate(BaseModel):
    outlet_id: str
    name: str
    delivery_charge: float

# Order Models
class ReceiverInfo(BaseModel):
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    address: str

class CustomerInfo(BaseModel):
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    birthday: Optional[str] = None
    gender: Optional[Gender] = None

class Order(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_number: str = Field(default_factory=lambda: str(uuid.uuid4())[:8].upper())
    
    # Order Type
    order_type: OrderType
    receiver_info: Optional[ReceiverInfo] = None
    
    # Customer Info
    customer_info: CustomerInfo
    
    # Delivery Info
    needs_delivery: bool = False
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    zone_id: Optional[str] = None
    
    # Order Details
    occasion: Optional[str] = None
    flavour: str
    size_pounds: float
    cake_image_url: str
    secondary_images: List[str] = []
    name_on_cake: Optional[str] = None
    special_instructions: Optional[str] = None
    
    # Delivery Date & Time
    delivery_date: str
    delivery_time: str
    
    # Status & Workflow
    status: OrderStatus = OrderStatus.CONFIRMED
    outlet_id: str
    created_by: str  # User ID
    order_taken_by: str  # For incentive calculation
    
    # Payment Info
    total_amount: float = 0.0
    paid_amount: float = 0.0
    pending_amount: float = 0.0
    
    # PetPooja Integration
    petpooja_bill_numbers: List[str] = []
    
    # Flags
    is_hold: bool = True  # Starts in hold
    is_ready: bool = False
    ready_at: Optional[datetime] = None
    is_deleted: bool = False
    delete_requested_by: Optional[str] = None
    delete_approved_by: Optional[str] = None
    
    # Delivery Tracking
    assigned_delivery_partner: Optional[str] = None
    picked_up_at: Optional[datetime] = None
    reached_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_code: Optional[str] = None
    
    # WhatsApp
    whatsapp_alerts: bool = True
    
    # Timestamps
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    # Modification tracking
    modified_after_ready: bool = False
    modification_count: int = 0

class OrderCreate(BaseModel):
    order_type: OrderType
    receiver_info: Optional[ReceiverInfo] = None
    customer_info: CustomerInfo
    needs_delivery: bool
    delivery_address: Optional[str] = None
    delivery_city: Optional[str] = None
    zone_id: Optional[str] = None
    occasion: Optional[str] = None
    flavour: str
    size_pounds: float
    cake_image_url: str
    secondary_images: List[str] = []
    name_on_cake: Optional[str] = None
    special_instructions: Optional[str] = None
    delivery_date: str
    delivery_time: str
    outlet_id: str
    total_amount: float = 0.0

# Payment Models
class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    amount: float
    payment_method: str
    petpooja_bill_number: Optional[str] = None
    paid_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    recorded_by: str  # User ID

class PaymentCreate(BaseModel):
    order_id: str
    amount: float
    payment_method: str
    petpooja_bill_number: Optional[str] = None

# Log Models
class Log(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    action: str
    performed_by: str  # User ID
    before_data: Optional[Dict[str, Any]] = None
    after_data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Dashboard Stats Model
class DashboardStats(BaseModel):
    total_orders_today: int = 0
    total_revenue_today: float = 0.0
    pending_orders: int = 0
    ready_orders: int = 0
    delivered_orders: int = 0
    total_outlets: int = 0
    total_users: int = 0
    orders_by_occasion: Dict[str, int] = {}

# ==================== AUTH UTILITIES ====================

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
    )
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user_doc = await db.users.find_one({"id": user_id}, {"_id": 0})
    if user_doc is None:
        raise credentials_exception
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    return User(**user_doc)

def require_role(allowed_roles: List[UserRole]):
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker

# ==================== AUTH ENDPOINTS ====================

@api_router.post("/auth/login", response_model=Token)
async def login(login_data: LoginRequest):
    """Login endpoint for all user roles"""
    user_doc = await db.users.find_one({"email": login_data.email}, {"_id": 0})
    
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    if isinstance(user_doc.get('created_at'), str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**user_doc)
    
    if not user.is_active:
        raise HTTPException(status_code=401, detail="User account is inactive")
    
    if not verify_password(login_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")
    
    access_token = create_access_token(data={"sub": user.id, "role": user.role.value})
    
    user_response = UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        outlet_id=user.outlet_id,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current logged-in user info"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        role=current_user.role,
        outlet_id=current_user.outlet_id,
        is_active=current_user.is_active,
        created_at=current_user.created_at
    )

# ==================== USER MANAGEMENT (Super Admin) ====================

@api_router.post("/users", response_model=UserResponse)
async def create_user(
    user_data: UserCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a new user (Super Admin only)"""
    # Check if user already exists
    existing_user = await db.users.find_one({"email": user_data.email})
    if existing_user:
        raise HTTPException(status_code=400, detail="User with this email already exists")
    
    # Validate outlet_id if provided
    if user_data.outlet_id:
        outlet = await db.outlets.find_one({"id": user_data.outlet_id}, {"_id": 0})
        if not outlet:
            raise HTTPException(status_code=404, detail="Outlet not found")
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role,
        password_hash=get_password_hash(user_data.password),
        outlet_id=user_data.outlet_id,
        created_by=current_user.id
    )
    
    doc = user.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.users.insert_one(doc)
    
    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        phone=user.phone,
        role=user.role,
        outlet_id=user.outlet_id,
        is_active=user.is_active,
        created_at=user.created_at
    )

@api_router.get("/users", response_model=List[UserResponse])
async def get_all_users(
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get all users (Super Admin only)"""
    users = await db.users.find({}, {"_id": 0, "password_hash": 0}).to_list(1000)
    
    for user in users:
        if isinstance(user.get('created_at'), str):
            user['created_at'] = datetime.fromisoformat(user['created_at'])
    
    return [UserResponse(**user) for user in users]

@api_router.patch("/users/{user_id}/toggle-active")
async def toggle_user_active(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Activate/Deactivate user (Super Admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_status = not user['is_active']
    await db.users.update_one({"id": user_id}, {"$set": {"is_active": new_status}})
    
    return {"message": f"User {'activated' if new_status else 'deactivated'} successfully"}

# ==================== OUTLET MANAGEMENT (Super Admin) ====================

@api_router.post("/outlets", response_model=OutletResponse)
async def create_outlet(
    outlet_data: OutletCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a new outlet (Super Admin only)"""
    outlet = Outlet(
        name=outlet_data.name,
        address=outlet_data.address,
        city=outlet_data.city,
        phone=outlet_data.phone,
        incentive_percentage=outlet_data.incentive_percentage,
        ready_time_buffer_minutes=outlet_data.ready_time_buffer_minutes,
        created_by=current_user.id
    )
    
    doc = outlet.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.outlets.insert_one(doc)
    
    return OutletResponse(**outlet.model_dump())

@api_router.get("/outlets", response_model=List[OutletResponse])
async def get_all_outlets(current_user: User = Depends(get_current_user)):
    """Get all outlets"""
    outlets = await db.outlets.find({}, {"_id": 0}).to_list(1000)
    
    for outlet in outlets:
        if isinstance(outlet.get('created_at'), str):
            outlet['created_at'] = datetime.fromisoformat(outlet['created_at'])
    
    return [OutletResponse(**outlet) for outlet in outlets]

@api_router.patch("/outlets/{outlet_id}")
async def update_outlet(
    outlet_id: str,
    outlet_data: OutletCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update outlet (Super Admin only)"""
    outlet = await db.outlets.find_one({"id": outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    update_data = outlet_data.model_dump()
    await db.outlets.update_one({"id": outlet_id}, {"$set": update_data})
    
    return {"message": "Outlet updated successfully"}

# ==================== ZONE MANAGEMENT (Super Admin) ====================

@api_router.post("/zones", response_model=Dict[str, Any])
async def create_zone(
    zone_data: ZoneCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a delivery zone (Super Admin only)"""
    # Validate outlet exists
    outlet = await db.outlets.find_one({"id": zone_data.outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    zone = Zone(
        outlet_id=zone_data.outlet_id,
        name=zone_data.name,
        delivery_charge=zone_data.delivery_charge
    )
    
    doc = zone.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.zones.insert_one(doc)
    
    return {"message": "Zone created successfully", "zone": zone.model_dump()}

@api_router.get("/zones")
async def get_zones(outlet_id: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Get all zones, optionally filtered by outlet"""
    query = {} if not outlet_id else {"outlet_id": outlet_id}
    zones = await db.zones.find(query, {"_id": 0}).to_list(1000)
    
    for zone in zones:
        if isinstance(zone.get('created_at'), str):
            zone['created_at'] = datetime.fromisoformat(zone['created_at'])
    
    return zones

# ==================== DASHBOARD (Super Admin) ====================

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get dashboard statistics (Super Admin only)"""
    today = datetime.now(timezone.utc).date().isoformat()
    
    # Total orders today
    total_orders_today = await db.orders.count_documents({
        "delivery_date": today,
        "is_deleted": False
    })
    
    # Total revenue today (only delivered orders)
    delivered_orders = await db.orders.find({
        "delivery_date": today,
        "status": OrderStatus.DELIVERED.value,
        "is_deleted": False
    }, {"_id": 0, "total_amount": 1}).to_list(1000)
    total_revenue_today = sum(order.get('total_amount', 0) for order in delivered_orders)
    
    # Pending orders (confirmed but not ready)
    pending_orders = await db.orders.count_documents({
        "status": OrderStatus.CONFIRMED.value,
        "is_deleted": False
    })
    
    # Ready orders
    ready_orders = await db.orders.count_documents({
        "status": OrderStatus.READY.value,
        "is_deleted": False
    })
    
    # Delivered orders today
    delivered_orders_count = await db.orders.count_documents({
        "delivery_date": today,
        "status": OrderStatus.DELIVERED.value,
        "is_deleted": False
    })
    
    # Total outlets
    total_outlets = await db.outlets.count_documents({"is_active": True})
    
    # Total users
    total_users = await db.users.count_documents({"is_active": True})
    
    # Orders by occasion
    orders_with_occasion = await db.orders.find({
        "occasion": {"$ne": None},
        "is_deleted": False
    }, {"_id": 0, "occasion": 1}).to_list(1000)
    
    orders_by_occasion = {}
    for order in orders_with_occasion:
        occasion = order.get('occasion', 'Other')
        orders_by_occasion[occasion] = orders_by_occasion.get(occasion, 0) + 1
    
    return DashboardStats(
        total_orders_today=total_orders_today,
        total_revenue_today=total_revenue_today,
        pending_orders=pending_orders,
        ready_orders=ready_orders,
        delivered_orders=delivered_orders_count,
        total_outlets=total_outlets,
        total_users=total_users,
        orders_by_occasion=orders_by_occasion
    )

# ==================== INITIALIZE SUPER ADMIN ====================

@app.on_event("startup")
async def create_super_admin():
    """Create default super admin if not exists"""
    existing_admin = await db.users.find_one({"role": UserRole.SUPER_ADMIN.value})
    
    if not existing_admin:
        super_admin = User(
            email="admin@usbakers.com",
            name="Super Admin",
            phone="1234567890",
            role=UserRole.SUPER_ADMIN,
            password_hash=get_password_hash("admin123"),
            is_active=True
        )
        
        doc = super_admin.model_dump()
        doc['created_at'] = doc['created_at'].isoformat()
        
        await db.users.insert_one(doc)
        logger.info("✅ Super Admin created - Email: admin@usbakers.com, Password: admin123")

# ==================== HEALTH CHECK ====================

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "service": "US Bakers CRM"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
