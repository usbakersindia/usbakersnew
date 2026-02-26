from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
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
import requests
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

# AiSensy WhatsApp Configuration
AISENSY_API_KEY = os.environ.get("AISENSY_API_KEY", "")
AISENSY_API_ENDPOINT = os.environ.get("AISENSY_API_ENDPOINT", "https://backend.aisensy.com/campaign/t1/api/v2")

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

# ==================== PERMISSIONS ====================
# Define all available permissions in the system
AVAILABLE_PERMISSIONS = {
    "orders": {
        "can_create_order": "Create new orders",
        "can_view_orders": "View orders",
        "can_edit_orders": "Edit orders",
        "can_delete_orders": "Delete orders",
        "can_mark_ready": "Mark orders as ready"
    },
    "order_fields": {
        "can_edit_customer_info": "Edit customer information",
        "can_edit_flavour": "Edit cake flavour",
        "can_edit_size": "Edit cake size",
        "can_edit_delivery_date": "Edit delivery date",
        "can_edit_delivery_time": "Edit delivery time",
        "can_edit_total_amount": "Edit total amount",
        "can_edit_special_instructions": "Edit special instructions",
        "can_edit_cake_image": "Edit cake image",
        "can_edit_name_on_cake": "Edit name on cake"
    },
    "payments": {
        "can_record_payment": "Record payments",
        "can_view_payments": "View payments",
        "can_refund": "Process refunds"
    },
    "management": {
        "can_manage_outlets": "Manage outlets",
        "can_manage_zones": "Manage delivery zones",
        "can_manage_users": "Manage users",
        "can_view_reports": "View reports",
        "can_manage_settings": "Manage settings"
    },
    "delivery": {
        "can_assign_delivery": "Assign delivery partners",
        "can_view_delivery_orders": "View delivery orders",
        "can_mark_delivered": "Mark orders as delivered"
    }
}

# ==================== MODELS ====================

# User Models
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: UserRole  # Keep for backward compatibility, but permissions take precedence
    permissions: List[str] = []  # New: List of permission strings
    incentive_percentage: float = 0.0  # Incentive for this user
    password_hash: str
    outlet_id: Optional[str] = None  # Can be assigned to specific outlet
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: Optional[str] = None  # User ID of creator

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    role: UserRole = UserRole.ORDER_MANAGER  # Default role for compatibility
    permissions: List[str] = []
    incentive_percentage: float = 0.0
    password: str
    outlet_id: Optional[str] = None

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    phone: str
    role: UserRole
    permissions: List[str]
    incentive_percentage: float
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
    username: str  # Outlet login username
    password_hash: str  # Outlet login password
    ready_time_buffer_minutes: int = 30  # Default 30 mins buffer
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    created_by: str  # Super admin ID

class OutletCreate(BaseModel):
    name: str
    address: str
    city: str
    phone: str
    username: str
    password: str
    ready_time_buffer_minutes: int = 30

class OutletResponse(BaseModel):
    id: str
    name: str
    address: str
    city: str
    phone: str
    username: str
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

# ==================== WHATSAPP TEMPLATE MODELS ====================

class WhatsAppTemplateEvent(str, Enum):
    """WhatsApp notification events for order lifecycle"""
    ORDER_PLACED = "order_placed"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_READY = "order_ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"

class WhatsAppTemplate(BaseModel):
    """Configuration for a WhatsApp template for a specific event"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: WhatsAppTemplateEvent
    campaign_name: str  # AiSensy campaign name
    template_message: str  # Message with {{1}}, {{2}} placeholders
    is_enabled: bool = False  # Disabled by default
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WhatsAppTemplateCreate(BaseModel):
    event_type: WhatsAppTemplateEvent
    campaign_name: str
    template_message: str
    is_enabled: bool = False

class WhatsAppTemplateUpdate(BaseModel):
    campaign_name: Optional[str] = None
    template_message: Optional[str] = None
    is_enabled: Optional[bool] = None

class WhatsAppTemplateResponse(BaseModel):
    id: str
    event_type: WhatsAppTemplateEvent
    campaign_name: str
    template_message: str
    is_enabled: bool
    created_at: datetime
    updated_at: datetime

class WhatsAppMessageLog(BaseModel):
    """Log for sent WhatsApp messages"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    event_type: WhatsAppTemplateEvent
    recipient_phone: str
    recipient_name: str
    campaign_name: str
    status: str  # sent, failed
    response_code: int
    response_message: Optional[str] = None
    message_id: Optional[str] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    """Legacy role-based access control - kept for backward compatibility"""
    async def role_checker(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required roles: {[r.value for r in allowed_roles]}"
            )
        return current_user
    return role_checker

def require_permission(required_permissions: List[str]):
    """New permission-based access control"""
    async def permission_checker(current_user: User = Depends(get_current_user)):
        # Super admin has all permissions
        if current_user.role == UserRole.SUPER_ADMIN:
            return current_user
        
        # Check if user has any of the required permissions
        user_permissions = set(current_user.permissions)
        required_perms = set(required_permissions)
        
        if not user_permissions.intersection(required_perms):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Access denied. Required permissions: {required_permissions}"
            )
        return current_user
    return permission_checker

def has_permission(user: User, permission: str) -> bool:
    """Check if user has a specific permission"""
    if user.role == UserRole.SUPER_ADMIN:
        return True
    return permission in user.permissions

# ==================== AUTH ENDPOINTS ====================

@api_router.get("/permissions/available")
async def get_available_permissions(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get all available permissions in the system (Super Admin only)"""
    return AVAILABLE_PERMISSIONS

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
        permissions=user.permissions,
        incentive_percentage=user.incentive_percentage,
        outlet_id=user.outlet_id,
        is_active=user.is_active,
        created_at=user.created_at
    )
    
    return Token(access_token=access_token, token_type="bearer", user=user_response)

@api_router.post("/auth/outlet-login", response_model=Token)
async def outlet_login(login_data: LoginRequest):
    """Login endpoint for outlets"""
    outlet_doc = await db.outlets.find_one({"username": login_data.email}, {"_id": 0})
    
    if not outlet_doc:
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    if isinstance(outlet_doc.get('created_at'), str):
        outlet_doc['created_at'] = datetime.fromisoformat(outlet_doc['created_at'])
    
    if not outlet_doc.get('is_active'):
        raise HTTPException(status_code=401, detail="Outlet account is inactive")
    
    if not verify_password(login_data.password, outlet_doc.get('password_hash')):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    
    # Create a special outlet user response
    outlet_user = UserResponse(
        id=outlet_doc['id'],
        email=outlet_doc['username'],
        name=outlet_doc['name'],
        phone=outlet_doc['phone'],
        role=UserRole.OUTLET_ADMIN,
        permissions=["can_create_order", "can_view_orders", "can_edit_orders", "can_record_payment"],
        incentive_percentage=0.0,
        outlet_id=outlet_doc['id'],
        is_active=True,
        created_at=outlet_doc['created_at']
    )
    
    access_token = create_access_token(data={"sub": outlet_doc['id'], "role": "outlet", "outlet_id": outlet_doc['id']})
    
    return Token(access_token=access_token, token_type="bearer", user=outlet_user)

@api_router.get("/auth/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current logged-in user info"""
    return UserResponse(
        id=current_user.id,
        email=current_user.email,
        name=current_user.name,
        phone=current_user.phone,
        role=current_user.role,
        permissions=current_user.permissions if current_user.permissions else [],
        incentive_percentage=getattr(current_user, 'incentive_percentage', 0.0),
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
        permissions=user_data.permissions,
        incentive_percentage=user_data.incentive_percentage,
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
        permissions=user.permissions,
        incentive_percentage=user.incentive_percentage,
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
    # Check if username already exists
    existing = await db.outlets.find_one({"username": outlet_data.username})
    if existing:
        raise HTTPException(status_code=400, detail="Username already exists")
    
    outlet = Outlet(
        name=outlet_data.name,
        address=outlet_data.address,
        city=outlet_data.city,
        phone=outlet_data.phone,
        username=outlet_data.username,
        password_hash=get_password_hash(outlet_data.password),
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
    
    # Prepare update data
    update_data = {
        "name": outlet_data.name,
        "address": outlet_data.address,
        "city": outlet_data.city,
        "phone": outlet_data.phone,
        "username": outlet_data.username,
        "ready_time_buffer_minutes": outlet_data.ready_time_buffer_minutes
    }
    
    # Only update password if provided
    if outlet_data.password:
        update_data['password_hash'] = get_password_hash(outlet_data.password)
    
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

# ==================== IMAGE UPLOAD ====================

@api_router.post("/upload-image")
async def upload_image(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload an image and return the URL"""
    try:
        # Validate file type
        if not file.content_type.startswith('image/'):
            raise HTTPException(status_code=400, detail="File must be an image")
        
        # Generate unique filename
        file_extension = file.filename.split('.')[-1]
        unique_filename = f"{uuid.uuid4()}.{file_extension}"
        file_path = ROOT_DIR / "uploads" / unique_filename
        
        # Save file
        contents = await file.read()
        with open(file_path, 'wb') as f:
            f.write(contents)
        
        # Return URL (relative path)
        image_url = f"/uploads/{unique_filename}"
        return {"url": image_url, "filename": unique_filename}
    
    except Exception as e:
        logger.error(f"Image upload failed: {str(e)}")
        raise HTTPException(status_code=500, detail="Image upload failed")

# ==================== ORDER MANAGEMENT ====================

@api_router.post("/orders")
async def create_order(
    order_data: OrderCreate,
    current_user: User = Depends(get_current_user)
):
    """Create a new order"""
    # Validate outlet exists
    outlet = await db.outlets.find_one({"id": order_data.outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    # Validate zone if delivery is needed
    if order_data.needs_delivery and order_data.zone_id:
        zone = await db.zones.find_one({"id": order_data.zone_id}, {"_id": 0})
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
    
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
        is_hold=True  # Always starts in hold
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    # Send ORDER_PLACED WhatsApp notification (async, don't block)
    try:
        await send_whatsapp_notification(order.id, WhatsAppTemplateEvent.ORDER_PLACED)
    except Exception as e:
        logger.error(f"WhatsApp notification failed for order {order.id}: {str(e)}")
    
    return {"message": "Order created successfully", "order_id": order.id, "order_number": order.order_number}

@api_router.get("/orders/hold")
async def get_hold_orders(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all orders on hold"""
    query = {"is_hold": True, "is_deleted": False}
    
    # Filter by outlet if user is not super admin
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    elif outlet_id:
        query["outlet_id"] = outlet_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

@api_router.get("/orders/manage")
async def get_manage_orders(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all orders in manage (not hold, not deleted)"""
    query = {"is_hold": False, "is_deleted": False}
    
    # Filter by outlet if user is not super admin
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    elif outlet_id:
        query["outlet_id"] = outlet_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

@api_router.delete("/orders/{order_id}")
async def delete_order(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark order as deleted (requires approval for non-super-admin)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if current_user.role == UserRole.SUPER_ADMIN:
        # Super admin can delete directly
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"is_deleted": True, "delete_approved_by": current_user.id}}
        )
        return {"message": "Order deleted successfully"}
    else:
        # Others need approval
        await db.orders.update_one(
            {"id": order_id},
            {"$set": {"delete_requested_by": current_user.id}}
        )
        return {"message": "Delete request submitted for approval"}

@api_router.patch("/orders/{order_id}")
async def update_order(
    order_id: str,
    update_data: Dict[str, Any],
    current_user: User = Depends(get_current_user)
):
    """Update order details (before ready status)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if order is already ready
    if order.get('is_ready'):
        raise HTTPException(status_code=400, detail="Cannot edit order after it's marked as ready")
    
    # Track modification
    update_fields = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "modification_count": order.get('modification_count', 0) + 1
    }
    
    # Allow specific fields to be updated
    allowed_fields = ['flavour', 'size_pounds', 'cake_image_url', 'delivery_date', 'delivery_time', 
                     'name_on_cake', 'special_instructions', 'total_amount', 'secondary_images']
    
    for field in allowed_fields:
        if field in update_data:
            update_fields[field] = update_data[field]
    
    await db.orders.update_one({"id": order_id}, {"$set": update_fields})
    
    # Log the update
    log = Log(
        order_id=order_id,
        action="order_updated",
        performed_by=current_user.id,
        before_data={"fields": list(update_data.keys())},
        after_data=update_data
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {"message": "Order updated successfully"}

@api_router.patch("/orders/{order_id}/status")
async def update_order_status(
    order_id: str,
    status: OrderStatus,
    current_user: User = Depends(get_current_user)
):
    """Update order status and send WhatsApp notification"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    update_data = {
        "status": status.value,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # If marking as ready
    if status == OrderStatus.READY:
        update_data['is_ready'] = True
        update_data['ready_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Log status change
    log = Log(
        order_id=order_id,
        action="status_changed",
        performed_by=current_user.id,
        before_data={"status": order.get('status')},
        after_data={"status": status.value}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    # Send WhatsApp notification based on status
    try:
        event_map = {
            OrderStatus.CONFIRMED: WhatsAppTemplateEvent.ORDER_CONFIRMED,
            OrderStatus.READY: WhatsAppTemplateEvent.ORDER_READY,
            OrderStatus.PICKED_UP: WhatsAppTemplateEvent.OUT_FOR_DELIVERY,
            OrderStatus.DELIVERED: WhatsAppTemplateEvent.DELIVERED
        }
        
        if status in event_map:
            await send_whatsapp_notification(order_id, event_map[status])
    except Exception as e:
        logger.error(f"WhatsApp notification failed for order {order_id}: {str(e)}")
    
    return {"message": f"Order status updated to {status.value}"}

# ==================== PETPOOJA WEBHOOK ====================

@api_router.post("/petpooja/callback")
async def petpooja_callback(request_data: Dict[str, Any]):
    """
    Webhook endpoint for PetPooja POS to send order updates
    PetPooja will POST to this endpoint with order status changes
    """
    try:
        rest_id = request_data.get('restID')
        order_id = request_data.get('orderID')  # Our system's order ID
        status = request_data.get('status')
        cancel_reason = request_data.get('cancel_reason')
        min_prep_time = request_data.get('minimum_prep_time')
        min_delivery_time = request_data.get('minimum_delivery_time')
        rider_name = request_data.get('rider_name')
        rider_phone = request_data.get('rider_phone_number')
        is_modified = request_data.get('is_modified', False)
        
        logger.info(f"PetPooja callback received for order: {order_id}, status: {status}")
        
        # Find order in our system
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            logger.error(f"Order not found: {order_id}")
            return {"success": False, "message": "Order not found"}
        
        # Update order based on PetPooja status
        update_data = {
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Map PetPooja status to our system
        if status == "-1":
            # Cancelled
            update_data['status'] = OrderStatus.CANCELLED.value
            update_data['is_deleted'] = True
            if cancel_reason:
                update_data['special_instructions'] = f"{order.get('special_instructions', '')}\n\nCancelled by PetPooja: {cancel_reason}"
        
        elif status in ["1", "2", "3"]:
            # Accepted/Confirmed
            update_data['status'] = OrderStatus.CONFIRMED.value
            if min_prep_time:
                update_data['petpooja_prep_time'] = min_prep_time
        
        elif status == "4":
            # Dispatched
            update_data['status'] = OrderStatus.PICKED_UP.value
            if rider_name:
                update_data['assigned_delivery_partner_name'] = rider_name
            if rider_phone:
                update_data['assigned_delivery_partner_phone'] = rider_phone
        
        elif status == "5":
            # Food Ready
            update_data['status'] = OrderStatus.READY.value
            update_data['is_ready'] = True
            update_data['ready_at'] = datetime.now(timezone.utc).isoformat()
        
        elif status == "10":
            # Delivered
            update_data['status'] = OrderStatus.DELIVERED.value
            update_data['delivered_at'] = datetime.now(timezone.utc).isoformat()
        
        # Update modified flag
        if is_modified:
            update_data['modified_after_ready'] = True
        
        await db.orders.update_one({"id": order_id}, {"$set": update_data})
        
        # Log the webhook event
        log = Log(
            order_id=order_id,
            action="petpooja_callback",
            performed_by="system",
            after_data=request_data
        )
        log_doc = log.model_dump()
        log_doc['timestamp'] = log_doc['timestamp'].isoformat()
        await db.logs.insert_one(log_doc)
        
        return {"success": True, "message": "Order updated successfully"}
    
    except Exception as e:
        logger.error(f"PetPooja callback error: {str(e)}")
        return {"success": False, "message": str(e)}

@api_router.get("/petpooja/webhook-url")
async def get_petpooja_webhook_url(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get the PetPooja webhook URL to provide to PetPooja team"""
    # Get the actual backend URL from environment
    backend_url = os.environ.get('BACKEND_URL', os.environ.get('REACT_APP_BACKEND_URL', 'http://localhost:8001'))
    webhook_url = f"{backend_url}/api/petpooja/callback"
    
    return {
        "webhook_url": webhook_url,
        "method": "POST",
        "description": "Provide this URL to PetPooja team for order status callbacks",
        "expected_fields": [
            "restID", "orderID", "status", "cancel_reason", 
            "minimum_prep_time", "minimum_delivery_time", 
            "rider_name", "rider_phone_number", "is_modified"
        ]
    }

# ==================== PAYMENT MANAGEMENT ====================

@api_router.post("/payments")
async def record_payment(
    payment_data: PaymentCreate,
    current_user: User = Depends(get_current_user)
):
    """Record a payment for an order"""
    # Get order
    order = await db.orders.find_one({"id": payment_data.order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Create payment record
    payment = Payment(
        order_id=payment_data.order_id,
        amount=payment_data.amount,
        payment_method=payment_data.payment_method,
        petpooja_bill_number=payment_data.petpooja_bill_number,
        recorded_by=current_user.id
    )
    
    doc = payment.model_dump()
    doc['paid_at'] = doc['paid_at'].isoformat()
    
    await db.payments.insert_one(doc)
    
    # Update order paid amount
    new_paid_amount = order['paid_amount'] + payment_data.amount
    new_pending_amount = order['total_amount'] - new_paid_amount
    
    update_data = {
        "paid_amount": new_paid_amount,
        "pending_amount": new_pending_amount,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add PetPooja bill number if provided
    if payment_data.petpooja_bill_number:
        bill_numbers = order.get('petpooja_bill_numbers', [])
        if payment_data.petpooja_bill_number not in bill_numbers:
            bill_numbers.append(payment_data.petpooja_bill_number)
            update_data['petpooja_bill_numbers'] = bill_numbers
    
    # Check if payment is >= 40% of total, move to manage orders
    if new_paid_amount >= (order['total_amount'] * 0.4):
        update_data['is_hold'] = False
    
    await db.orders.update_one({"id": payment_data.order_id}, {"$set": update_data})
    
    # Log the payment
    log = Log(
        order_id=payment_data.order_id,
        action="payment_recorded",
        performed_by=current_user.id,
        after_data={"amount": payment_data.amount, "method": payment_data.payment_method}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {
        "message": "Payment recorded successfully",
        "paid_amount": new_paid_amount,
        "pending_amount": new_pending_amount,
        "moved_to_manage": new_paid_amount >= (order['total_amount'] * 0.4)
    }

@api_router.get("/payments/{order_id}")
async def get_order_payments(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Get all payments for an order"""
    payments = await db.payments.find({"order_id": order_id}, {"_id": 0}).to_list(1000)
    
    for payment in payments:
        if isinstance(payment.get('paid_at'), str):
            payment['paid_at'] = datetime.fromisoformat(payment['paid_at'])
    
    return payments

# ==================== CUSTOMERS ENDPOINT ====================

@api_router.get("/customers")
async def get_customers(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all customers aggregated from orders"""
    query = {"is_deleted": False}
    
    # Filter by outlet if not super admin
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    elif outlet_id:
        query["outlet_id"] = outlet_id
    
    # Aggregate customers from orders
    pipeline = [
        {"$match": query},
        {
            "$group": {
                "_id": "$customer_info.phone",
                "name": {"$first": "$customer_info.name"},
                "phone": {"$first": "$customer_info.phone"},
                "email": {"$first": "$customer_info.email"},
                "birthday": {"$first": "$customer_info.birthday"},
                "gender": {"$first": "$customer_info.gender"},
                "total_orders": {"$sum": 1},
                "total_spent": {"$sum": "$paid_amount"},
                "pending_amount": {"$sum": "$pending_amount"},
                "last_order_date": {"$max": "$created_at"}
            }
        },
        {"$sort": {"total_orders": -1}}
    ]
    
    customers = await db.orders.aggregate(pipeline).to_list(1000)
    
    return customers

# ==================== DASHBOARD WITH BRANCH SUMMARY ====================

@api_router.get("/dashboard/branch-summary")
async def get_branch_summary(
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get branch-wise summary for super admin dashboard"""
    outlets = await db.outlets.find({"is_active": True}, {"_id": 0}).to_list(100)
    today = datetime.now(timezone.utc).date().isoformat()
    
    branch_data = []
    
    for outlet in outlets:
        outlet_id = outlet['id']
        
        # Total orders (all time)
        total_orders = await db.orders.count_documents({
            "outlet_id": outlet_id,
            "is_deleted": False
        })
        
        # Today's orders
        todays_orders = await db.orders.count_documents({
            "outlet_id": outlet_id,
            "delivery_date": today,
            "is_deleted": False
        })
        
        # Total income (all paid amounts)
        income_pipeline = [
            {"$match": {"outlet_id": outlet_id, "is_deleted": False}},
            {"$group": {"_id": None, "total": {"$sum": "$paid_amount"}}}
        ]
        income_result = await db.orders.aggregate(income_pipeline).to_list(1)
        total_income = income_result[0]['total'] if income_result else 0
        
        # Pending orders (not ready, not delivered)
        pending_orders = await db.orders.count_documents({
            "outlet_id": outlet_id,
            "status": {"$in": ["confirmed"]},
            "is_deleted": False
        })
        
        branch_data.append({
            "outlet_id": outlet_id,
            "outlet_name": outlet['name'],
            "total_orders": total_orders,
            "todays_orders": todays_orders,
            "total_income": total_income,
            "pending_orders": pending_orders
        })
    
    return branch_data

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

# ==================== WHATSAPP NOTIFICATION FUNCTIONS ====================

async def send_whatsapp_notification(
    order_id: str,
    event_type: WhatsAppTemplateEvent
) -> bool:
    """
    Send WhatsApp notification for an order event.
    Returns True if successful, False otherwise.
    """
    try:
        # Get the template for this event
        template = await db.whatsapp_templates.find_one(
            {"event_type": event_type.value},
            {"_id": 0}
        )
        
        if not template or not template.get('is_enabled'):
            logger.info(f"WhatsApp template for {event_type.value} is not enabled")
            return False
        
        # Get order details
        order = await db.orders.find_one({"id": order_id}, {"_id": 0})
        if not order:
            logger.error(f"Order {order_id} not found")
            return False
        
        # Extract customer info
        customer_info = order.get('customer_info', {})
        customer_name = customer_info.get('name', 'Customer')
        customer_phone = customer_info.get('phone', '')
        
        # Validate phone number
        if not customer_phone or not customer_phone.startswith('+'):
            logger.warning(f"Invalid phone number for order {order_id}: {customer_phone}")
            return False
        
        # Prepare template parameters based on order data
        # Parameters: customer_name, order_number, delivery_date, delivery_time
        params = [
            customer_name,
            order.get('order_number', order_id),
            order.get('delivery_date', 'N/A'),
            order.get('delivery_time', 'N/A')
        ]
        
        # Prepare AiSensy API request
        payload = {
            "apiKey": AISENSY_API_KEY,
            "campaignName": template['campaign_name'],
            "destination": customer_phone,
            "userName": customer_name,
            "source": "bakery_crm",
            "templateParams": params,
            "attributes": {
                "order_id": order_id,
                "event_type": event_type.value
            }
        }
        
        # Send request to AiSensy
        response = requests.post(
            AISENSY_API_ENDPOINT,
            json=payload,
            timeout=30,
            headers={"Content-Type": "application/json"}
        )
        
        # Log the message attempt
        log = WhatsAppMessageLog(
            order_id=order_id,
            event_type=event_type,
            recipient_phone=customer_phone,
            recipient_name=customer_name,
            campaign_name=template['campaign_name'],
            status="sent" if response.status_code == 200 else "failed",
            response_code=response.status_code,
            response_message=response.text if response.status_code != 200 else "Success",
            message_id=response.json().get('messageId') if response.status_code == 200 and response.text else None
        )
        
        log_doc = log.model_dump()
        log_doc['timestamp'] = log_doc['timestamp'].isoformat()
        await db.whatsapp_logs.insert_one(log_doc)
        
        if response.status_code == 200:
            logger.info(f"WhatsApp notification sent for order {order_id}, event: {event_type.value}")
            return True
        else:
            logger.warning(f"Failed to send WhatsApp notification: {response.status_code} - {response.text}")
            return False
            
    except requests.exceptions.Timeout:
        logger.error(f"Timeout while sending WhatsApp notification for order {order_id}")
        return False
    except Exception as e:
        logger.error(f"Error sending WhatsApp notification for order {order_id}: {str(e)}")
        return False

# ==================== WHATSAPP TEMPLATE ENDPOINTS ====================

@api_router.get("/whatsapp/templates", response_model=List[WhatsAppTemplateResponse])
async def get_whatsapp_templates(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get all WhatsApp templates (Super Admin only)"""
    templates = await db.whatsapp_templates.find({}, {"_id": 0}).to_list(100)
    
    # Convert datetime strings to datetime objects
    for template in templates:
        if isinstance(template.get('created_at'), str):
            template['created_at'] = datetime.fromisoformat(template['created_at'])
        if isinstance(template.get('updated_at'), str):
            template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return templates

@api_router.post("/whatsapp/templates", response_model=WhatsAppTemplateResponse)
async def create_whatsapp_template(
    template_data: WhatsAppTemplateCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create or update a WhatsApp template for an event (Super Admin only)"""
    
    # Check if template already exists for this event
    existing = await db.whatsapp_templates.find_one(
        {"event_type": template_data.event_type.value},
        {"_id": 0}
    )
    
    if existing:
        # Update existing template
        update_data = {
            "campaign_name": template_data.campaign_name,
            "template_message": template_data.template_message,
            "is_enabled": template_data.is_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.whatsapp_templates.update_one(
            {"event_type": template_data.event_type.value},
            {"$set": update_data}
        )
        
        # Get updated template
        template = await db.whatsapp_templates.find_one(
            {"event_type": template_data.event_type.value},
            {"_id": 0}
        )
    else:
        # Create new template
        template = WhatsAppTemplate(
            event_type=template_data.event_type,
            campaign_name=template_data.campaign_name,
            template_message=template_data.template_message,
            is_enabled=template_data.is_enabled
        )
        
        template_doc = template.model_dump()
        template_doc['created_at'] = template_doc['created_at'].isoformat()
        template_doc['updated_at'] = template_doc['updated_at'].isoformat()
        
        await db.whatsapp_templates.insert_one(template_doc)
        
        # Fetch the inserted template as dict for consistent handling
        template = await db.whatsapp_templates.find_one(
            {"event_type": template_data.event_type.value},
            {"_id": 0}
        )
    
    # Convert datetime strings for response (template is now always a dict)
    if isinstance(template.get('created_at'), str):
        template['created_at'] = datetime.fromisoformat(template['created_at'])
    if isinstance(template.get('updated_at'), str):
        template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return WhatsAppTemplateResponse(**template)

@api_router.patch("/whatsapp/templates/{event_type}")
async def update_whatsapp_template(
    event_type: WhatsAppTemplateEvent,
    update_data: WhatsAppTemplateUpdate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update a WhatsApp template (Super Admin only)"""
    
    template = await db.whatsapp_templates.find_one(
        {"event_type": event_type.value},
        {"_id": 0}
    )
    
    if not template:
        raise HTTPException(status_code=404, detail="Template not found")
    
    update_fields = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    if update_data.campaign_name is not None:
        update_fields['campaign_name'] = update_data.campaign_name
    if update_data.template_message is not None:
        update_fields['template_message'] = update_data.template_message
    if update_data.is_enabled is not None:
        update_fields['is_enabled'] = update_data.is_enabled
    
    await db.whatsapp_templates.update_one(
        {"event_type": event_type.value},
        {"$set": update_fields}
    )
    
    return {"message": "Template updated successfully"}

@api_router.get("/whatsapp/logs")
async def get_whatsapp_logs(
    order_id: Optional[str] = None,
    limit: int = 50,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get WhatsApp message logs (Super Admin only)"""
    
    query = {}
    if order_id:
        query['order_id'] = order_id
    
    logs = await db.whatsapp_logs.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(limit)
    
    # Convert datetime strings
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return logs

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

# Serve uploaded images
app.mount("/uploads", StaticFiles(directory=str(ROOT_DIR / "uploads")), name="uploads")

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
