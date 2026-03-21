from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, UploadFile, File, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
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
import random
from pathlib import Path
from io import BytesIO
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.pdfgen import canvas

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

# MSG91 WhatsApp Configuration (AiSensy removed - using MSG91 only)

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ==================== ENUMS ====================
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    OUTLET_ADMIN = "outlet_admin"
    ORDER_MANAGER = "order_manager"
    FACTORY_MANAGER = "factory_manager"  # NEW: Can see all orders, add orders, download PDFs
    KITCHEN = "kitchen"
    DELIVERY = "delivery"
    ACCOUNTS = "accounts"

class OrderStatus(str, Enum):
    PENDING = "pending"  # Punch order, waiting for 20% payment
    ON_HOLD = "on_hold"  # Hold order, incomplete info
    CONFIRMED = "confirmed"  # Active order in manage orders
    READY = "ready"
    PICKED_UP = "picked_up"
    REACHED = "reached"
    DELIVERED = "delivered"
    CANCELLED = "cancelled"

class OrderLifecycleStatus(str, Enum):
    PENDING_PAYMENT = "pending_payment"  # Punched, waiting for 20% payment
    HOLD = "hold"  # On hold, incomplete
    ACTIVE = "active"  # In manage orders (was confirmed)
    COMPLETED = "completed"  # Delivered
    CANCELLED = "cancelled"

class OrderType(str, Enum):
    SELF = "self"
    SOMEONE_ELSE = "someone_else"

class Gender(str, Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"

# ==================== SALES PERSONS (for order_taken_by) ====================

class SalesPerson(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: Optional[str] = None
    outlet_id: str  # Which outlet this sales person belongs to
    is_active: bool = True
    created_by: str  # Super Admin who created
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SalesPersonCreate(BaseModel):
    name: str
    phone: Optional[str] = None
    outlet_id: str

# ==================== SYSTEM SETTINGS ====================

class SystemSettings(BaseModel):
    id: str = "system_settings"  # Singleton
    minimum_payment_percentage: float = 20.0  # Default 20%
    birthday_mandatory: bool = False  # NEW: Toggle birthday field mandatory/optional
    updated_by: Optional[str] = None
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SystemSettingsUpdate(BaseModel):
    minimum_payment_percentage: float
    birthday_mandatory: Optional[bool] = None

# NEW: Payment Threshold per Branch
class BranchPaymentThreshold(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    outlet_id: str
    minimum_payment_percentage: float = 20.0
    updated_by: str
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# NEW: Cake Flavours
class CakeFlavour(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CakeFlavourCreate(BaseModel):
    name: str

# NEW: Occasions
class Occasion(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OccasionCreate(BaseModel):
    name: str

# NEW: Delivery Time Slots
class DeliveryTimeSlot(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    time_slot: str  # e.g., "10:00 AM - 12:00 PM"
    is_active: bool = True
    created_by: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class TimeSlotCreate(BaseModel):
    time_slot: str

# NEW: PetPooja Bills Tracking
class PetPoojaBill(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    bill_number: str
    outlet_id: str
    customer_name: Optional[str] = None
    customer_phone: Optional[str] = None
    total_amount: float = 0.0
    items: List[Dict[str, Any]] = []  # List of items in bill
    has_custom_cake: bool = False  # True if bill contains "Custom Cake" item
    synced_to_order: bool = False  # True if converted to order
    order_id: Optional[str] = None  # Order ID if synced
    sync_attempted_at: Optional[datetime] = None
    sync_error: Optional[str] = None
    bill_data: Dict[str, Any] = {}  # Raw bill data from PetPooja
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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
    incentive_percentage: float = 0.0
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

class OutletUpdate(BaseModel):
    name: str
    address: str
    city: str
    phone: str
    username: str
    password: Optional[str] = None  # Optional for updates
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
    order_number: str = Field(default_factory=lambda: str(random.randint(100000, 999999)))
    
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
    cake_image_url: str  # Customer reference image
    actual_cake_image_url: Optional[str] = None  # Photo uploaded by kitchen after completion
    secondary_images: List[str] = []
    name_on_cake: Optional[str] = None
    special_instructions: Optional[str] = None
    
    # Delivery Date & Time
    delivery_date: str
    delivery_time: str
    
    # Status & Workflow
    status: OrderStatus = OrderStatus.PENDING
    lifecycle_status: str = "pending_payment"  # pending_payment, hold, active, completed, cancelled
    outlet_id: str
    created_by: str  # User ID
    order_taken_by: str  # For incentive calculation
    is_punch_order: bool = False  # True for punch orders, False for hold orders
    
    # Payment Info
    total_amount: float = 0.0
    paid_amount: float = 0.0
    pending_amount: float = 0.0
    payment_synced_from_petpooja: bool = False
    
    # PetPooja Integration
    petpooja_bill_numbers: List[str] = []
    petpooja_comment: Optional[str] = None  # Our Order ID stored in PetPooja
    
    # Flags
    is_credit_order: bool = False  # NEW: For credit orders
    credit_released_by: Optional[str] = None  # Super Admin who released credit order
    credit_released_at: Optional[datetime] = None
    voice_instruction_url: Optional[str] = None  # NEW: Voice recording URL
    is_hold: bool = False  # Not on hold by default
    is_ready: bool = False
    ready_at: Optional[datetime] = None
    transfer_to_outlet_id: Optional[str] = None  # Branch where order is transferred after ready
    is_deleted: bool = False
    delete_requested_by: Optional[str] = None
    delete_approved_by: Optional[str] = None
    
    # Delivery Tracking
    assigned_delivery_partner: Optional[str] = None
    picked_up_at: Optional[datetime] = None
    reached_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_code: Optional[str] = None
    delivery_otp: Optional[str] = None  # 6-digit OTP for delivery confirmation
    
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
    voice_instruction_url: Optional[str] = None  # NEW
    delivery_date: str
    delivery_time: str
    outlet_id: str
    total_amount: float = 0.0
    is_credit_order: bool = False  # NEW
    order_taken_by: Optional[str] = None  # For incentive tracking

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

# ==================== MSG91 WHATSAPP MODELS ====================

class MSG91Config(BaseModel):
    """MSG91 WhatsApp Configuration"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    auth_key: str
    integrated_number: str  # WhatsApp Business Number
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MSG91ConfigCreate(BaseModel):
    auth_key: str
    integrated_number: str

class MSG91ConfigUpdate(BaseModel):
    auth_key: Optional[str] = None
    integrated_number: Optional[str] = None
    is_active: Optional[bool] = None

class MSG91Template(BaseModel):
    """MSG91 WhatsApp Template Configuration"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    event_type: WhatsAppTemplateEvent
    template_name: str  # MSG91 template name
    namespace: str  # MSG91 namespace
    language_code: str = "en"
    language_policy: str = "deterministic"
    variables: List[str] = []  # List of variable names (body_1, body_2, etc.)
    is_enabled: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class MSG91TemplateCreate(BaseModel):
    event_type: WhatsAppTemplateEvent
    template_name: str
    namespace: str
    language_code: str = "en"
    language_policy: str = "deterministic"
    variables: List[str] = []
    is_enabled: bool = False

class MSG91TemplateUpdate(BaseModel):
    template_name: Optional[str] = None
    namespace: Optional[str] = None
    language_code: Optional[str] = None
    language_policy: Optional[str] = None
    variables: Optional[List[str]] = None
    is_enabled: Optional[bool] = None

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
    
    # Auto-apply role permissions if no custom permissions provided
    permissions = user_data.permissions
    if not permissions:
        # Check for role permission template
        role_template = await db.role_permissions.find_one({"role": user_data.role.value}, {"_id": 0})
        if role_template:
            permissions = role_template.get("permissions", [])
        else:
            # Use default permissions for the role
            permissions = get_default_role_permissions(user_data.role.value)
    
    # Create user
    user = User(
        email=user_data.email,
        name=user_data.name,
        phone=user_data.phone,
        role=user_data.role,
        permissions=permissions,
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

@api_router.get("/users/order-takers")
async def get_order_takers(current_user: User = Depends(get_current_user)):
    """Get users who can take orders (for order_taken_by dropdown)"""
    query = {"is_active": True}
    
    # Filter by outlet if not super admin
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    
    users = await db.users.find(query, {"_id": 0, "id": 1, "name": 1, "email": 1, "role": 1, "outlet_id": 1}).to_list(1000)
    
    return [{"id": u["id"], "name": u["name"], "email": u["email"], "role": u["role"]} for u in users]

# ==================== SALES PERSONS MANAGEMENT ====================

@api_router.post("/sales-persons")
async def create_sales_person(
    person_data: SalesPersonCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a sales person (Super Admin only)"""
    person = SalesPerson(
        name=person_data.name,
        phone=person_data.phone,
        outlet_id=person_data.outlet_id,
        created_by=current_user.id
    )
    
    doc = person.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.sales_persons.insert_one(doc)
    
    return {"message": "Sales person created successfully", "id": person.id}

@api_router.get("/sales-persons")
async def get_sales_persons(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get sales persons (filtered by outlet for non-super-admin)"""
    query = {"is_active": True}
    
    # Filter by outlet
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    elif outlet_id:
        query["outlet_id"] = outlet_id
    
    persons = await db.sales_persons.find(query, {"_id": 0}).to_list(1000)
    
    return persons

@api_router.delete("/sales-persons/{person_id}")
async def delete_sales_person(
    person_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Delete/deactivate a sales person (Super Admin only)"""
    await db.sales_persons.update_one(
        {"id": person_id},
        {"$set": {"is_active": False}}
    )
    
    return {"message": "Sales person deactivated"}

# ==================== SYSTEM SETTINGS ====================

@api_router.get("/system-settings")
async def get_system_settings(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get system settings (Super Admin only)"""
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    
    if not settings:
        # Create default settings
        default_settings = SystemSettings()
        doc = default_settings.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.system_settings.insert_one(doc)
        return default_settings.model_dump()
    
    return settings

@api_router.patch("/system-settings")
async def update_system_settings(
    settings_data: SystemSettingsUpdate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update system settings (Super Admin only)"""
    update_data = {
        "minimum_payment_percentage": settings_data.minimum_payment_percentage,
        "updated_by": current_user.id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Add birthday_mandatory if provided
    if settings_data.birthday_mandatory is not None:
        update_data["birthday_mandatory"] = settings_data.birthday_mandatory
    
    await db.system_settings.update_one(
        {"id": "system_settings"},
        {"$set": update_data},
        upsert=True
    )
    
    return {"message": "Settings updated successfully"}

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

@api_router.patch("/users/{user_id}/permissions")
async def update_user_permissions(
    user_id: str,
    permissions_data: Dict[str, List[str]],
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update user permissions (Super Admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_permissions = permissions_data.get('permissions', [])
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"permissions": new_permissions}}
    )
    
    return {
        "message": "Permissions updated successfully",
        "user_id": user_id,
        "permissions": new_permissions
    }

@api_router.patch("/users/{user_id}/password")
async def reset_user_password(
    user_id: str,
    password_data: Dict[str, str],
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Reset user password (Super Admin only)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    new_password = password_data.get('password', '')
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="Password must be at least 6 characters")
    
    # Hash the new password
    password_hash = get_password_hash(new_password)
    
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"password_hash": password_hash}}
    )
    
    return {
        "message": "Password reset successfully",
        "user_id": user_id
    }

# ==================== CAKE FLAVOURS MANAGEMENT ====================

@api_router.post("/flavours")
async def create_flavour(
    flavour_data: CakeFlavourCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a new cake flavour (Super Admin only)"""
    # Check if flavour already exists
    existing = await db.cake_flavours.find_one({"name": flavour_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Flavour already exists")
    
    flavour = CakeFlavour(
        name=flavour_data.name,
        created_by=current_user.id
    )
    
    doc = flavour.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.cake_flavours.insert_one(doc)
    doc.pop('_id', None)  # Remove MongoDB ObjectId before returning
    return {"message": "Flavour created successfully", "flavour": doc}

@api_router.get("/flavours")
async def get_flavours():
    """Get all active cake flavours"""
    flavours = await db.cake_flavours.find({"is_active": True}, {"_id": 0}).to_list(100)
    return flavours

@api_router.delete("/flavours/{flavour_id}")
async def delete_flavour(
    flavour_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Soft delete a flavour (Super Admin only)"""
    await db.cake_flavours.update_one(
        {"id": flavour_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Flavour deleted successfully"}

# ==================== OCCASIONS MANAGEMENT ====================

@api_router.post("/occasions")
async def create_occasion(
    occasion_data: OccasionCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a new occasion (Super Admin only)"""
    existing = await db.occasions.find_one({"name": occasion_data.name}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Occasion already exists")
    
    occasion = Occasion(
        name=occasion_data.name,
        created_by=current_user.id
    )
    
    doc = occasion.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.occasions.insert_one(doc)
    doc.pop('_id', None)  # Remove MongoDB ObjectId before returning
    return {"message": "Occasion created successfully", "occasion": doc}

@api_router.get("/occasions")
async def get_occasions():
    """Get all active occasions"""
    occasions = await db.occasions.find({"is_active": True}, {"_id": 0}).to_list(100)
    return occasions

@api_router.delete("/occasions/{occasion_id}")
async def delete_occasion(
    occasion_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Soft delete an occasion (Super Admin only)"""
    await db.occasions.update_one(
        {"id": occasion_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Occasion deleted successfully"}

# ==================== DELIVERY TIME SLOTS MANAGEMENT ====================

@api_router.post("/time-slots")
async def create_time_slot(
    slot_data: TimeSlotCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create a new delivery time slot (Super Admin only)"""
    existing = await db.delivery_time_slots.find_one({"time_slot": slot_data.time_slot}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Time slot already exists")
    
    slot = DeliveryTimeSlot(
        time_slot=slot_data.time_slot,
        created_by=current_user.id
    )
    
    doc = slot.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    
    await db.delivery_time_slots.insert_one(doc)
    doc.pop('_id', None)  # Remove MongoDB ObjectId before returning
    return {"message": "Time slot created successfully", "time_slot": doc}

@api_router.get("/time-slots")
async def get_time_slots():
    """Get all active delivery time slots"""
    slots = await db.delivery_time_slots.find({"is_active": True}, {"_id": 0}).to_list(100)
    return slots

@api_router.delete("/time-slots/{slot_id}")
async def delete_time_slot(
    slot_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Soft delete a time slot (Super Admin only)"""
    await db.delivery_time_slots.update_one(
        {"id": slot_id},
        {"$set": {"is_active": False}}
    )
    return {"message": "Time slot deleted successfully"}

# ==================== BRANCH PAYMENT THRESHOLD ====================

@api_router.post("/branch-payment-threshold")
async def set_branch_threshold(
    threshold_data: Dict[str, Any],
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Set payment threshold for a specific branch (Super Admin only)"""
    outlet_id = threshold_data.get('outlet_id')
    percentage = threshold_data.get('minimum_payment_percentage', 20.0)
    
    # Check if threshold exists for this branch
    existing = await db.branch_payment_thresholds.find_one({"outlet_id": outlet_id}, {"_id": 0})
    
    if existing:
        # Update existing
        await db.branch_payment_thresholds.update_one(
            {"outlet_id": outlet_id},
            {"$set": {
                "minimum_payment_percentage": percentage,
                "updated_by": current_user.id,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        # Create new
        threshold = BranchPaymentThreshold(
            outlet_id=outlet_id,
            minimum_payment_percentage=percentage,
            updated_by=current_user.id
        )
        doc = threshold.model_dump()
        doc['updated_at'] = doc['updated_at'].isoformat()
        await db.branch_payment_thresholds.insert_one(doc)
    
    return {"message": "Branch payment threshold updated successfully"}

@api_router.get("/branch-payment-threshold/{outlet_id}")
async def get_branch_threshold(outlet_id: str):
    """Get payment threshold for a specific branch"""
    threshold = await db.branch_payment_thresholds.find_one({"outlet_id": outlet_id}, {"_id": 0})
    if not threshold:
        # Return default
        return {"minimum_payment_percentage": 20.0}
    return threshold

# ==================== SUPER ADMIN IMPERSONATION ====================

@api_router.post("/impersonate/{user_id}")
async def impersonate_user(
    user_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Super Admin can impersonate any user (get their token)"""
    user = await db.users.find_one({"id": user_id}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if not user.get('is_active', True):
        raise HTTPException(status_code=400, detail="User is inactive")
    
    # Create token for the target user
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user['id'], "role": user['role']},
        expires_delta=access_token_expires
    )
    
    return Token(
        access_token=access_token,
        token_type="bearer",
        user=UserResponse(**user)
    )

# ==================== PETPOOJA BILLS TRACKING ====================

@api_router.get("/petpooja-bills")
async def get_petpooja_bills(
    outlet_id: Optional[str] = None,
    synced: Optional[bool] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all PetPooja bills with sync status"""
    query = {}
    
    # Filter by outlet if provided
    if outlet_id:
        query["outlet_id"] = outlet_id
    elif current_user.outlet_id and current_user.role != UserRole.SUPER_ADMIN:
        # Non-super admin can only see their outlet's bills
        query["outlet_id"] = current_user.outlet_id
    
    # Filter by sync status if provided
    if synced is not None:
        query["synced_to_order"] = synced
    
    bills = await db.petpooja_bills.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    return bills

@api_router.post("/petpooja-bills/sync/{bill_id}")
async def sync_petpooja_bill(
    bill_id: str,
    current_user: User = Depends(get_current_user)
):
    """Manually sync a PetPooja bill to create an order"""
    bill = await db.petpooja_bills.find_one({"id": bill_id}, {"_id": 0})
    if not bill:
        raise HTTPException(status_code=404, detail="Bill not found")
    
    if bill.get('synced_to_order'):
        raise HTTPException(status_code=400, detail="Bill already synced")
    
    if not bill.get('has_custom_cake'):
        raise HTTPException(status_code=400, detail="Bill does not contain Custom Cake item")
    
    # TODO: Implement logic to create order from bill
    # For now, just mark as attempted
    await db.petpooja_bills.update_one(
        {"id": bill_id},
        {"$set": {
            "sync_attempted_at": datetime.now(timezone.utc).isoformat(),
            "sync_error": "Manual sync not yet implemented - coming soon"
        }}
    )
    
    return {"message": "Sync attempted - feature under development"}

# ==================== CREDIT ORDERS ====================

@api_router.post("/orders/{order_id}/mark-credit")
async def mark_order_as_credit(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Mark an order as credit order"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "is_credit_order": True,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Order marked as credit"}

@api_router.post("/orders/{order_id}/release-credit")
async def release_credit_order(
    order_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Super Admin releases credit order from pending to manage"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.get('is_credit_order'):
        raise HTTPException(status_code=400, detail="Order is not a credit order")
    
    # Move order to active/manage orders
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "lifecycle_status": "active",
            "status": "confirmed",
            "credit_released_by": current_user.id,
            "credit_released_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"message": "Credit order released to manage orders"}

@api_router.get("/orders/credit-pending")
async def get_credit_pending_orders(
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get all credit orders pending release"""
    orders = await db.orders.find({
        "is_credit_order": True,
        "lifecycle_status": "pending_payment"
    }, {"_id": 0}).to_list(1000)
    return orders



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
    outlet_data: OutletUpdate,
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

@api_router.patch("/zones/{zone_id}/toggle-active")
async def toggle_zone_active(
    zone_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Toggle zone active status (Super Admin only)"""
    zone = await db.zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    new_status = not zone.get('is_active', True)
    
    await db.zones.update_one(
        {"id": zone_id},
        {"$set": {"is_active": new_status}}
    )
    
    return {
        "message": f"Zone {'activated' if new_status else 'deactivated'} successfully",
        "is_active": new_status
    }

@api_router.delete("/zones/{zone_id}")
async def delete_zone(
    zone_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Delete a zone (Super Admin only)"""
    zone = await db.zones.find_one({"id": zone_id}, {"_id": 0})
    if not zone:
        raise HTTPException(status_code=404, detail="Zone not found")
    
    # Check if zone is being used in any orders
    orders_with_zone = await db.orders.find_one({"zone_id": zone_id, "is_deleted": False}, {"_id": 0})
    if orders_with_zone:
        raise HTTPException(
            status_code=400,
            detail="Cannot delete zone. It is being used in existing orders. You can mark it as inactive instead."
        )
    
    await db.zones.delete_one({"id": zone_id})
    
    return {"message": "Zone deleted successfully"}

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
    is_punch_order: bool = False,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OUTLET_ADMIN, UserRole.ORDER_MANAGER, UserRole.FACTORY_MANAGER]))
):
    """Create a new order (punch or hold) - Only for admins and order managers"""
    # Validate outlet exists
    outlet = await db.outlets.find_one({"id": order_data.outlet_id}, {"_id": 0})
    if not outlet:
        raise HTTPException(status_code=404, detail="Outlet not found")
    
    # Calculate delivery charge if needed
    delivery_charge = 0.0
    if order_data.needs_delivery and order_data.zone_id:
        zone = await db.zones.find_one({"id": order_data.zone_id}, {"_id": 0})
        if not zone:
            raise HTTPException(status_code=404, detail="Zone not found")
        delivery_charge = zone.get('delivery_charge', 0.0)
    
    # Calculate total amount (cake + delivery)
    total_amount = order_data.total_amount + delivery_charge
    pending_amount = total_amount
    
    # Validate required fields for completeness
    is_complete = all([
        order_data.customer_info.name,
        order_data.customer_info.phone,
        order_data.delivery_date,
        order_data.delivery_time,
        order_data.flavour,
        order_data.size_pounds > 0,
        order_data.cake_image_url,
        total_amount > 0
    ])
    
    # Determine lifecycle status based on completeness and type
    if not is_complete:
        # Incomplete orders → Hold (need more details)
        lifecycle_status = "hold"
        order_status = OrderStatus.ON_HOLD
        is_hold = True
    elif is_punch_order:
        # Complete punch orders → Pending Payment
        lifecycle_status = "pending_payment"
        order_status = OrderStatus.PENDING
        is_hold = False
    else:
        # Complete hold orders → Active (ready for kitchen)
        lifecycle_status = "active"
        order_status = OrderStatus.PENDING
        is_hold = False
    
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
        status=order_status,
        lifecycle_status=lifecycle_status,
        outlet_id=order_data.outlet_id,
        created_by=current_user.id,
        order_taken_by=order_data.order_taken_by or current_user.id,
        is_punch_order=is_punch_order,
        total_amount=total_amount,
        pending_amount=pending_amount,
        is_hold=is_hold,
        delivery_otp=str(random.randint(100000, 999999)) if order_data.needs_delivery else None
    )
    
    doc = order.model_dump()
    doc['created_at'] = doc['created_at'].isoformat()
    doc['updated_at'] = doc['updated_at'].isoformat()
    
    await db.orders.insert_one(doc)
    
    # Send WhatsApp notification
    try:
        await send_whatsapp_notification(order.id, WhatsAppTemplateEvent.ORDER_PLACED)
    except Exception as e:
        logger.error(f"WhatsApp notification failed: {str(e)}")
    
    return {
        "message": f"{'Punch' if is_punch_order else 'Hold'} order created successfully",
        "order_id": order.id,
        "order_number": order.order_number,
        "lifecycle_status": lifecycle_status,
        "total_amount": total_amount
    }

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

@api_router.get("/orders/pending")
async def get_pending_orders(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get punch orders waiting for payment (permission-based access)"""
    query = {"lifecycle_status": "pending_payment", "is_deleted": False}
    
    # Filter by outlet if user is not super admin
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query["outlet_id"] = current_user.outlet_id
    elif outlet_id:
        query["outlet_id"] = outlet_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    # Convert date fields
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
    
    return orders

@api_router.post("/orders/{order_id}/release")
async def release_hold_order(
    order_id: str,
    order_updates: Dict[str, Any],
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OUTLET_ADMIN, UserRole.ORDER_MANAGER]))
):
    """Release a hold order by completing required info"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get('lifecycle_status') != 'hold':
        raise HTTPException(status_code=400, detail="Order is not on hold")
    
    # Get system settings for payment threshold
    settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
    min_percentage = settings.get('minimum_payment_percentage', 20.0) if settings else 20.0
    
    # Update order with completed info
    update_data = order_updates.copy()
    
    # Calculate payment percentage
    paid_amount = update_data.get('paid_amount', order.get('paid_amount', 0))
    total_amount = order['total_amount']
    payment_percentage = (paid_amount / total_amount * 100) if total_amount > 0 else 0
    
    # Determine new lifecycle status
    if payment_percentage >= min_percentage:
        update_data['lifecycle_status'] = 'active'
        update_data['status'] = 'confirmed'
    else:
        update_data['lifecycle_status'] = 'pending_payment'
        update_data['status'] = 'pending'
    
    update_data['is_hold'] = False
    update_data['pending_amount'] = total_amount - paid_amount
    update_data['updated_at'] = datetime.now(timezone.utc).isoformat()
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    return {
        "message": "Order released successfully",
        "lifecycle_status": update_data['lifecycle_status'],
        "payment_percentage": payment_percentage
    }

@api_router.get("/orders/manage")
async def get_manage_orders(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all active orders in manage (not hold, not pending, not deleted)"""
    query = {"lifecycle_status": "active", "is_deleted": False}
    
    # Factory Manager and Super Admin can see all orders
    if current_user.role not in [UserRole.SUPER_ADMIN, UserRole.FACTORY_MANAGER]:
        if current_user.outlet_id:
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
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OUTLET_ADMIN, UserRole.ORDER_MANAGER]))
):
    """Mark order as deleted (requires approval for non-super-admin) - Only for admins and order managers"""
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
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OUTLET_ADMIN, UserRole.ORDER_MANAGER]))
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


@api_router.get("/orders/download-pdf")
async def download_orders_pdf(
    date: Optional[str] = None,
    date_from: Optional[str] = None,
    date_to: Optional[str] = None,
    outlet_id: Optional[str] = None,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.FACTORY_MANAGER, UserRole.KITCHEN]))
):
    """Download orders as PDF for specified date range"""
    try:
        # Build query
        query = {"is_deleted": False, "lifecycle_status": "active"}
        
        # Date filtering
        if date:
            # Single date (today/tomorrow/custom)
            target_date = datetime.fromisoformat(date).date()
            query["delivery_date"] = target_date.isoformat()
        elif date_from and date_to:
            # Date range
            query["delivery_date"] = {
                "$gte": datetime.fromisoformat(date_from).date().isoformat(),
                "$lte": datetime.fromisoformat(date_to).date().isoformat()
            }
        
        # Outlet filtering
        if current_user.role == UserRole.SUPER_ADMIN or current_user.role == UserRole.FACTORY_MANAGER:
            if outlet_id:
                query["outlet_id"] = outlet_id
        else:
            if current_user.outlet_id:
                query["outlet_id"] = current_user.outlet_id
        
        # Fetch orders sorted by delivery time
        orders = await db.orders.find(query, {"_id": 0}).sort("delivery_time", 1).to_list(1000)
        
        if not orders:
            raise HTTPException(status_code=404, detail="No orders found for the specified criteria")
        
        # Generate PDF
        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4, rightMargin=30, leftMargin=30, topMargin=30, bottomMargin=18)
        
        # Container for PDF elements
        elements = []
        styles = getSampleStyleSheet()
        
        # Title
        title_style = ParagraphStyle(
            'CustomTitle',
            parent=styles['Heading1'],
            fontSize=24,
            textColor=colors.HexColor('#e92587'),
            spaceAfter=30,
            alignment=1  # Center
        )
        
        date_str = date if date else f"{date_from} to {date_to}" if date_from else "All Orders"
        title = Paragraph(f"<b>US Bakers - Orders Report</b><br/><font size=12>{date_str}</font>", title_style)
        elements.append(title)
        elements.append(Spacer(1, 20))
        
        # Orders table
        table_data = [['Order #', 'Customer', 'Cake Details', 'Delivery', 'Amount']]
        
        for order in orders:
            order_number = order.get('order_number', 'N/A')
            customer_name = order.get('customer_info', {}).get('name', 'N/A')
            customer_phone = order.get('customer_info', {}).get('phone', 'N/A')
            
            flavour = order.get('flavour', 'N/A')
            size = order.get('size_pounds', 0)
            occasion = order.get('occasion', 'N/A')
            cake_details = f"{flavour}<br/>{size} lbs<br/>{occasion}"
            
            delivery_date = order.get('delivery_date', 'N/A')
            delivery_time = order.get('delivery_time', 'N/A')
            delivery_info = f"{delivery_date}<br/>{delivery_time}"
            
            amount = f"₹{order.get('total_amount', 0):.2f}"
            
            table_data.append([
                Paragraph(order_number, styles['Normal']),
                Paragraph(f"<b>{customer_name}</b><br/>{customer_phone}", styles['Normal']),
                Paragraph(cake_details, styles['Normal']),
                Paragraph(delivery_info, styles['Normal']),
                Paragraph(amount, styles['Normal'])
            ])
        
        # Create table
        table = Table(table_data, colWidths=[80, 120, 120, 100, 80])
        table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#e92587')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 12),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 1, colors.black),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
        ]))
        
        elements.append(table)
        elements.append(Spacer(1, 20))
        
        # Summary
        total_amount = sum(order.get('total_amount', 0) for order in orders)
        summary_text = f"<b>Total Orders:</b> {len(orders)} | <b>Total Amount:</b> ₹{total_amount:.2f}"
        summary = Paragraph(summary_text, styles['Normal'])
        elements.append(summary)
        
        # Build PDF
        doc.build(elements)
        
        # Prepare response
        buffer.seek(0)
        filename = f"orders_{date if date else 'range'}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.pdf"
        
        # Save to temp file for FileResponse
        temp_path = f"/tmp/{filename}"
        with open(temp_path, 'wb') as f:
            f.write(buffer.getvalue())
        
        return FileResponse(
            path=temp_path,
            media_type='application/pdf',
            filename=filename,
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    
    except Exception as e:
        logger.error(f"PDF generation failed: {str(e)}")

@api_router.post("/orders/{order_id}/mark-ready")
async def mark_order_ready(
    order_id: str,
    transfer_to_outlet_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.KITCHEN, UserRole.FACTORY_MANAGER]))
):
    """Mark order as ready and transfer to specified branch (Kitchen/Factory Manager only)"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if order.get('is_ready'):
        raise HTTPException(status_code=400, detail="Order is already marked as ready")
    
    # Update order
    update_data = {
        "is_ready": True,
        "ready_at": datetime.now(timezone.utc).isoformat(),
        "status": "ready",
        "transfer_to_outlet_id": transfer_to_outlet_id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Log action
    log = Log(
        order_id=order_id,
        action="order_marked_ready",
        performed_by=current_user.id,
        after_data={"transfer_to_outlet_id": transfer_to_outlet_id}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {
        "message": "Order marked as ready successfully",
        "transfer_to_outlet_id": transfer_to_outlet_id,
        "ready_at": update_data["ready_at"]
    }

@api_router.post("/orders/{order_id}/upload-actual-photo")
async def upload_actual_cake_photo(
    order_id: str,
    image_url: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.KITCHEN, UserRole.FACTORY_MANAGER]))
):
    """Upload actual cake photo after marking ready - Triggers incentive calculation"""
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.get('is_ready'):
        raise HTTPException(status_code=400, detail="Order must be marked as ready before uploading photo")
    
    if order.get('actual_cake_image_url'):
        raise HTTPException(status_code=400, detail="Actual cake photo already uploaded")
    
    # Update order with actual image
    update_data = {
        "actual_cake_image_url": image_url,
        "photo_uploaded_at": datetime.now(timezone.utc).isoformat(),
        "photo_uploaded_by": current_user.id,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    await db.orders.update_one({"id": order_id}, {"$set": update_data})
    
    # Trigger incentive calculation
    try:
        await calculate_incentive_for_order(order_id, order)
    except Exception as e:
        logger.error(f"Failed to calculate incentive for order {order_id}: {str(e)}")
    
    # Log action
    log = Log(
        order_id=order_id,
        action="actual_photo_uploaded",
        performed_by=current_user.id,
        after_data={"image_url": image_url}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {
        "message": "Photo uploaded successfully. Incentive calculation triggered.",
        "actual_cake_image_url": image_url
    }

async def calculate_incentive_for_order(order_id: str, order: dict):
    """Calculate and update incentive for the sales person"""
    # Get sales person
    sales_person_id = order.get('order_taken_by')
    if not sales_person_id:
        logger.warning(f"No sales person assigned to order {order_id}")
        return
    
    sales_person = await db.sales_persons.find_one({"id": sales_person_id}, {"_id": 0})
    if not sales_person:
        logger.warning(f"Sales person {sales_person_id} not found for order {order_id}")
        return
    
    # Calculate incentive (example: 5% of order amount)
    order_amount = order.get('total_amount', 0)
    incentive_percentage = sales_person.get('incentive_percentage', 5.0)
    incentive_amount = order_amount * (incentive_percentage / 100)
    
    # Update sales person's total incentive
    current_incentive = sales_person.get('total_incentive', 0)
    new_total = current_incentive + incentive_amount
    
    await db.sales_persons.update_one(
        {"id": sales_person_id},
        {
            "$set": {
                "total_incentive": new_total,
                "updated_at": datetime.now(timezone.utc).isoformat()
            },
            "$inc": {"total_orders": 1}
        }
    )
    
    logger.info(f"Incentive calculated for order {order_id}: ₹{incentive_amount:.2f} for {sales_person.get('name')}")

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
            # Send via MSG91 only
            await send_msg91_whatsapp(order_id, event_map[status])
    except Exception as e:
        logger.error(f"WhatsApp notification failed for order {order_id}: {str(e)}")
    
    return {"message": f"Order status updated to {status.value}"}

@api_router.post("/orders/{order_id}/transfer")
async def transfer_order(
    order_id: str,
    new_outlet_id: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN, UserRole.OUTLET_ADMIN]))
):
    """Transfer order to another outlet with all payment data"""
    # Check if user has permission
    if not any(perm in current_user.permissions for perm in ['all', 'can_edit_order', 'can_manage_outlets']):
        raise HTTPException(status_code=403, detail="Not authorized to transfer orders")
    
    # Find order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Check if new outlet exists
    new_outlet = await db.outlets.find_one({"id": new_outlet_id}, {"_id": 0})
    if not new_outlet:
        raise HTTPException(status_code=404, detail="Target outlet not found")
    
    # Update order outlet
    old_outlet_id = order.get('outlet_id')
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "outlet_id": new_outlet_id,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log transfer
    log = Log(
        order_id=order_id,
        action="order_transferred",
        performed_by=current_user.id,
        before_data={"outlet_id": old_outlet_id},
        after_data={"outlet_id": new_outlet_id}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {
        "message": f"Order transferred to {new_outlet['name']}",
        "old_outlet_id": old_outlet_id,
        "new_outlet_id": new_outlet_id
    }

@api_router.post("/orders/{order_id}/cancel-delivery")
async def cancel_delivery(
    order_id: str,
    current_user: User = Depends(get_current_user)
):
    """Cancel delivery for an order and remove delivery charges"""
    # Find order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    if not order.get('needs_delivery'):
        raise HTTPException(status_code=400, detail="Order doesn't have delivery")
    
    # Calculate delivery charge to remove
    delivery_charge = 0
    if order.get('zone_id'):
        zone = await db.zones.find_one({"id": order['zone_id']}, {"_id": 0})
        if zone:
            delivery_charge = zone.get('delivery_charge', 0)
    
    # Update order
    new_total = order.get('total_amount', 0) - delivery_charge
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "needs_delivery": False,
            "zone_id": "",
            "delivery_address": "",
            "total_amount": new_total,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Log cancellation
    log = Log(
        order_id=order_id,
        action="delivery_cancelled",
        performed_by=current_user.id,
        before_data={"needs_delivery": True, "total_amount": order.get('total_amount')},
        after_data={"needs_delivery": False, "total_amount": new_total}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {
        "message": "Delivery cancelled successfully",
        "delivery_charge_removed": delivery_charge,
        "new_total": new_total
    }

# ==================== FACTORY/KITCHEN ENDPOINTS ====================

@api_router.get("/kitchen/orders")
async def get_kitchen_orders(
    date: Optional[str] = None,
    outlet_id: Optional[str] = None,
    status: Optional[str] = None,
    size: Optional[str] = None,
    flavour: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get orders for factory/kitchen with advanced filters"""
    query = {}
    
    # Default: Show only confirmed and ready orders
    if not status:
        query['status'] = {"$in": [OrderStatus.CONFIRMED.value, OrderStatus.READY.value]}
    else:
        query['status'] = status
    
    # Date filter (default: today)
    if not date:
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        query['delivery_date'] = today
    else:
        query['delivery_date'] = date
    
    # Outlet filter
    if outlet_id:
        query['outlet_id'] = outlet_id
    
    # Additional filters
    if size:
        query['size_pounds'] = float(size)
    if flavour:
        query['flavour'] = flavour
    
    # Exclude deleted and on-hold orders
    query['is_deleted'] = False
    query['is_hold'] = False
    
    orders = await db.orders.find(query, {"_id": 0}).sort("delivery_time", 1).to_list(1000)
    
    return orders

@api_router.post("/kitchen/orders/mark-ready")
async def mark_orders_ready(
    order_ids: List[str],
    current_user: User = Depends(get_current_user)
):
    """Mark multiple orders as ready (bulk operation)"""
    if not order_ids:
        raise HTTPException(status_code=400, detail="No order IDs provided")
    
    updated_count = 0
    for order_id in order_ids:
        result = await db.orders.update_one(
            {"id": order_id, "status": OrderStatus.CONFIRMED.value},
            {"$set": {
                "status": OrderStatus.READY.value,
                "is_ready": True,
                "ready_at": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        if result.modified_count > 0:
            updated_count += 1
            
            # Send WhatsApp notification
            try:
                await send_msg91_whatsapp(order_id, WhatsAppTemplateEvent.ORDER_READY)
            except Exception as e:
                logger.error(f"WhatsApp notification failed: {str(e)}")
    
    return {
        "message": f"{updated_count} orders marked as ready",
        "total_requested": len(order_ids),
        "updated": updated_count
    }

@api_router.get("/kitchen/orders/summary")
async def get_kitchen_summary(
    date: Optional[str] = None,
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get summary of orders for kitchen dashboard"""
    query = {"is_deleted": False, "is_hold": False}
    
    # Date filter (default: today)
    if not date:
        today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
        query['delivery_date'] = today
    else:
        query['delivery_date'] = date
    
    # Outlet filter
    if outlet_id:
        query['outlet_id'] = outlet_id
    
    all_orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    confirmed_count = sum(1 for o in all_orders if o.get('status') == OrderStatus.CONFIRMED.value)
    ready_count = sum(1 for o in all_orders if o.get('status') == OrderStatus.READY.value)
    picked_up_count = sum(1 for o in all_orders if o.get('status') == OrderStatus.PICKED_UP.value)
    delivered_count = sum(1 for o in all_orders if o.get('status') == OrderStatus.DELIVERED.value)
    
    return {
        "total_orders": len(all_orders),
        "confirmed": confirmed_count,
        "ready": ready_count,
        "picked_up": picked_up_count,
        "delivered": delivered_count,
        "pending_production": confirmed_count  # Orders needing to be made
    }

# ==================== REPORTS ENDPOINTS ====================

@api_router.get("/reports/orders")
async def get_order_report(
    start_date: str,
    end_date: str,
    outlet_id: Optional[str] = None,
    status: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get order report for a date range"""
    query = {
        "delivery_date": {"$gte": start_date, "$lte": end_date},
        "is_deleted": False
    }
    
    # Outlet filter (outlet users can only see their own)
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query['outlet_id'] = current_user.outlet_id
    elif outlet_id:
        query['outlet_id'] = outlet_id
    
    if status:
        query['status'] = status
    
    orders = await db.orders.find(query, {"_id": 0}).sort("delivery_date", -1).to_list(5000)
    
    # Calculate summary
    total_orders = len(orders)
    total_amount = sum(o.get('total_amount', 0) for o in orders)
    total_paid = sum(o.get('paid_amount', 0) for o in orders)
    total_pending = sum(o.get('pending_amount', 0) for o in orders)
    
    status_breakdown = {}
    for order in orders:
        status_val = order.get('status', 'unknown')
        status_breakdown[status_val] = status_breakdown.get(status_val, 0) + 1
    
    return {
        "orders": orders,
        "summary": {
            "total_orders": total_orders,
            "total_amount": total_amount,
            "total_paid": total_paid,
            "total_pending": total_pending,
            "status_breakdown": status_breakdown
        }
    }

@api_router.get("/reports/payments")
async def get_payment_report(
    start_date: str,
    end_date: str,
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get payment collection report"""
    try:
        # Parse dates - handle both date and datetime formats
        if 'T' in start_date:
            start_dt = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
        else:
            start_dt = datetime.fromisoformat(f"{start_date}T00:00:00+00:00")
        
        if 'T' in end_date:
            end_dt = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
        else:
            end_dt = datetime.fromisoformat(f"{end_date}T23:59:59+00:00")
        
        query = {}
        
        # Outlet filter
        if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
            # Get orders for this outlet only
            orders = await db.orders.find({"outlet_id": current_user.outlet_id}, {"_id": 0, "id": 1}).to_list(10000)
            order_ids = [o["id"] for o in orders]
            query['order_id'] = {"$in": order_ids}
        elif outlet_id:
            # Get orders for specified outlet
            orders = await db.orders.find({"outlet_id": outlet_id}, {"_id": 0, "id": 1}).to_list(10000)
            order_ids = [o["id"] for o in orders]
            query['order_id'] = {"$in": order_ids}
        
        # Get all payments
        payments = await db.payments.find(query, {"_id": 0}).to_list(10000)
        
        # Filter by date - handle both string and datetime formats
        filtered_payments = []
        for p in payments:
            paid_at = p.get('paid_at')
            if isinstance(paid_at, str):
                paid_dt = datetime.fromisoformat(paid_at.replace('Z', '+00:00'))
            else:
                paid_dt = paid_at
            
            if start_dt <= paid_dt <= end_dt:
                # Convert to ISO string for JSON response
                p['paid_at'] = paid_dt.isoformat() if not isinstance(paid_at, str) else paid_at
                filtered_payments.append(p)
        
        # Calculate totals by payment method
        method_totals = {}
        for payment in filtered_payments:
            method = payment.get('payment_method', 'unknown')
            amount = payment.get('amount', 0)
            method_totals[method] = method_totals.get(method, 0) + amount
        
        total_collected = sum(p.get('amount', 0) for p in filtered_payments)
        
        return {
            "payments": filtered_payments,
            "summary": {
                "total_payments": len(filtered_payments),
                "total_collected": round(total_collected, 2),
                "by_method": {k: round(v, 2) for k, v in method_totals.items()}
            }
        }
    except Exception as e:
        logger.error(f"Payment report error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to generate payment report: {str(e)}")

@api_router.get("/reports/delivery")
async def get_delivery_report(
    start_date: str,
    end_date: str,
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get delivery performance report"""
    query = {
        "delivery_date": {"$gte": start_date, "$lte": end_date},
        "needs_delivery": True,
        "is_deleted": False
    }
    
    # Outlet filter
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query['outlet_id'] = current_user.outlet_id
    elif outlet_id:
        query['outlet_id'] = outlet_id
    
    orders = await db.orders.find(query, {"_id": 0}).to_list(5000)
    
    delivered = sum(1 for o in orders if o.get('status') == OrderStatus.DELIVERED.value)
    cancelled = sum(1 for o in orders if o.get('status') == OrderStatus.CANCELLED.value)
    in_transit = sum(1 for o in orders if o.get('status') in [OrderStatus.PICKED_UP.value, OrderStatus.REACHED.value])
    pending = sum(1 for o in orders if o.get('status') in [OrderStatus.CONFIRMED.value, OrderStatus.READY.value])
    
    return {
        "summary": {
            "total_delivery_orders": len(orders),
            "delivered": delivered,
            "cancelled": cancelled,
            "in_transit": in_transit,
            "pending_delivery": pending,
            "delivery_rate": round((delivered / len(orders) * 100) if orders else 0, 2)
        },
        "orders": orders
    }

# ==================== DELIVERY ENDPOINTS ====================

@api_router.get("/delivery/orders")
async def get_delivery_orders(
    current_user: User = Depends(get_current_user)
):
    """Get all orders assigned for delivery"""
    query = {
        "needs_delivery": True,
        "is_deleted": False,
        "status": {"$in": [OrderStatus.READY.value, OrderStatus.PICKED_UP.value, OrderStatus.REACHED.value]}
    }
    
    # If user is delivery staff, show only their outlet
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query['outlet_id'] = current_user.outlet_id
    
    orders = await db.orders.find(query, {"_id": 0}).sort("delivery_date", 1).to_list(1000)
    
    return orders

@api_router.get("/delivery/summary")
async def get_delivery_summary(
    current_user: User = Depends(get_current_user)
):
    """Get delivery dashboard summary"""
    query = {"needs_delivery": True, "is_deleted": False}
    
    if current_user.role != UserRole.SUPER_ADMIN and current_user.outlet_id:
        query['outlet_id'] = current_user.outlet_id
    
    all_orders = await db.orders.find(query, {"_id": 0}).to_list(1000)
    
    ready = sum(1 for o in all_orders if o.get('status') == OrderStatus.READY.value)
    picked_up = sum(1 for o in all_orders if o.get('status') == OrderStatus.PICKED_UP.value)
    reached = sum(1 for o in all_orders if o.get('status') == OrderStatus.REACHED.value)
    
    # Delivered today
    today = datetime.now(timezone.utc).strftime('%Y-%m-%d')
    delivered_today = sum(1 for o in all_orders if o.get('status') == OrderStatus.DELIVERED.value and o.get('delivery_date') == today)
    
    return {
        "ready": ready,
        "picked_up": picked_up,
        "reached": reached,
        "delivered_today": delivered_today,
        "total_active": ready + picked_up + reached
    }

@api_router.post("/delivery/verify-otp")
async def verify_delivery_otp(
    verification_data: Dict[str, str],
    current_user: User = Depends(get_current_user)
):
    """Verify OTP and mark order as delivered"""
    order_id = verification_data.get('order_id')
    otp = verification_data.get('otp')
    
    if not order_id or not otp:
        raise HTTPException(status_code=400, detail="Order ID and OTP required")
    
    # Get order
    order = await db.orders.find_one({"id": order_id}, {"_id": 0})
    if not order:
        raise HTTPException(status_code=404, detail="Order not found")
    
    # Verify OTP
    if order.get('delivery_otp') != otp:
        raise HTTPException(status_code=400, detail="Invalid OTP")
    
    # Update order to delivered
    await db.orders.update_one(
        {"id": order_id},
        {"$set": {
            "status": OrderStatus.DELIVERED.value,
            "delivered_at": datetime.now(timezone.utc).isoformat(),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Send WhatsApp notification
    try:
        await send_msg91_whatsapp(order_id, WhatsAppTemplateEvent.DELIVERED)
    except Exception as e:
        logger.error(f"WhatsApp notification failed: {str(e)}")
    
    # Log delivery
    log = Log(
        order_id=order_id,
        action="order_delivered",
        performed_by=current_user.id,
        after_data={"delivered_at": datetime.now(timezone.utc).isoformat(), "otp_verified": True}
    )
    log_doc = log.model_dump()
    log_doc['timestamp'] = log_doc['timestamp'].isoformat()
    await db.logs.insert_one(log_doc)
    
    return {"message": "Order delivered successfully", "order_id": order_id}

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
            "updated_at": datetime.now(timezone.utc).isoformat(),
            "petpooja_rest_id": rest_id,
            "petpooja_status": int(status) if status else None,
            "is_modified": is_modified
        }
        
        # Store rider info if provided
        if rider_name:
            update_data['rider_name'] = rider_name
        if rider_phone:
            update_data['rider_phone'] = rider_phone
        
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

@api_router.post("/petpooja/payment-webhook")
async def petpooja_payment_webhook(request_data: Dict[str, Any]):
    """
    Universal webhook endpoint for PetPooja - handles multiple formats
    Format 1: Payment data with order ID in comment field
    Format 2: Full order data with customer info and items
    Format 3: Status updates
    Format 4: PetPooja standard format (nested under properties)
    """
    try:
        logger.info(f"PetPooja webhook received: {request_data}")
        
        # Detect which format we received
        if 'properties' in request_data and 'Order' in request_data.get('properties', {}):
            # Format 4: PetPooja standard nested format
            logger.info("Detected: PetPooja standard format (nested properties)")
            return await handle_petpooja_standard_format(request_data)
        elif 'order_id' in request_data and 'items' in request_data:
            # Format 2: Full order data with items
            logger.info("Detected: Full order data format")
            return await handle_petpooja_new_order(request_data)
        elif 'orderId' in request_data and 'status' in request_data and 'items' not in request_data:
            # Format 3: Status update
            logger.info("Detected: Status update format")
            return await handle_petpooja_status_update(request_data)
        else:
            # Format 1: Payment/bill data with comment field
            logger.info("Detected: Payment/bill format")
            return await handle_petpooja_payment(request_data)
            
    except Exception as e:
        logger.error(f"PetPooja webhook error: {str(e)}")
        return {"success": False, "message": str(e)}

async def handle_petpooja_standard_format(request_data: Dict[str, Any]):
    """Handle PetPooja's standard format with nested properties"""
    try:
        from uuid import uuid4
        from datetime import datetime, timezone
        
        properties = request_data.get('properties', {})
        order_data = properties.get('Order', {})
        customer_data = properties.get('Customer', {})
        restaurant_data = properties.get('Restaurant', {})
        order_items = properties.get('OrderItem', [])
        
        # Extract order information
        petpooja_order_id = str(order_data.get('orderID', ''))
        customer_name = customer_data.get('name', '')
        customer_phone = customer_data.get('phone', '')
        total_amount = float(order_data.get('total', 0))
        payment_type = order_data.get('payment_type', 'cash')
        custom_payment_type = order_data.get('custom_payment_type', '')
        order_type = order_data.get('order_type', '')
        created_on = order_data.get('created_on', '')
        comment = order_data.get('comment', '')
        
        logger.info(f"PetPooja Order: {petpooja_order_id}, Customer: {customer_phone}, Amount: {total_amount}")
        
        # Check if order contains cake items
        has_custom_cake = False
        custom_cake_details = []
        
        for item in order_items:
            item_name = str(item.get('name', '')).lower()
            category = str(item.get('category_name', '')).lower()
            
            # Check if item is a cake/pastry (including category check)
            if any(keyword in item_name for keyword in ['cake', 'pastry', 'pasteries', 'forest', 'truffle']) or \
               any(keyword in category for keyword in ['cake', 'pastry', 'pasteries', 'pastries']):
                has_custom_cake = True
                custom_cake_details.append({
                    "name": item.get('name', ''),
                    "category": item.get('category_name', ''),
                    "quantity": item.get('quantity', 1),
                    "price": item.get('price', 0),
                    "total": item.get('total', 0)
                })
        
        # Store bill in petpooja_bills collection
        bill_doc = {
            "id": f"bill-{str(uuid4())[:8]}",
            "bill_number": petpooja_order_id,
            "bill_data": request_data,
            "amount": total_amount,
            "order_number": None,  # Will try to match
            "payment_method": custom_payment_type or payment_type,
            "synced_to_order": False,
            "sync_error": None,
            "has_custom_cake": has_custom_cake,
            "custom_cake_details": custom_cake_details,
            "customer_name": customer_name,
            "customer_phone": customer_phone,
            "petpooja_status": order_data.get('status', ''),
            "order_type": order_type,
            "comment": comment,
            "created_at": datetime.now(timezone.utc).isoformat(),
            "petpooja_created_on": created_on
        }
        
        # Only process if it has cake/pastry items
        if not has_custom_cake:
            bill_doc["sync_error"] = "No cake/pastry items found"
            await db.petpooja_bills.insert_one(bill_doc)
            logger.info(f"PetPooja order {petpooja_order_id} has no cake items - skipped")
            return {"success": True, "message": "Order saved but no cake items found"}
        
        logger.info(f"PetPooja order {petpooja_order_id} has cake items: {[d['name'] for d in custom_cake_details]}")
        
        # Try to find matching order in our CRM
        matching_orders = []
        
        # Strategy 1: If comment field has our order ID
        if comment and comment.strip():
            order_id_from_comment = comment.strip()
            matching_order = await db.orders.find_one({
                "$or": [
                    {"order_number": order_id_from_comment},
                    {"id": order_id_from_comment}
                ]
            }, {"_id": 0})
            if matching_order:
                matching_orders.append(matching_order)
                logger.info(f"Matched by comment field: {order_id_from_comment}")
        
        # Strategy 2: Match by phone number (if no comment match)
        if not matching_orders and customer_phone:
            # Clean phone number
            clean_phone = customer_phone.replace('+91', '').replace('-', '').replace(' ', '').strip()
            
            if clean_phone and clean_phone != '1111111111':  # Skip dummy phone
                # Search for orders with matching phone from last 48 hours
                two_days_ago = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
                matching_orders = await db.orders.find({
                    "$or": [
                        {"customer_info.phone": {"$regex": clean_phone}},
                        {"customer_info.phone": customer_phone}
                    ],
                    "created_at": {"$gte": two_days_ago},
                    "lifecycle_status": {"$in": ["pending_payment", "hold", "active"]}
                }, {"_id": 0}).to_list(10)
                
                if matching_orders:
                    logger.info(f"Found {len(matching_orders)} potential matches by phone: {clean_phone}")
        
        if matching_orders:
            # Found match - sync payment
            order = matching_orders[0]
            
            # Record payment
            payment = Payment(
                order_id=order['id'],
                amount=total_amount,
                payment_method=custom_payment_type or payment_type,
                petpooja_bill_number=petpooja_order_id,
                recorded_by="system"
            )
            
            payment_doc = payment.model_dump()
            payment_doc['paid_at'] = payment_doc['paid_at'].isoformat()
            await db.payments.insert_one(payment_doc)
            
            # Update order
            new_paid_amount = order.get('paid_amount', 0) + total_amount
            
            await db.orders.update_one(
                {"id": order['id']},
                {"$set": {
                    "paid_amount": new_paid_amount,
                    "pending_amount": order['total_amount'] - new_paid_amount,
                    "lifecycle_status": "active",
                    "status": OrderStatus.CONFIRMED,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
            
            bill_doc["synced_to_order"] = True
            bill_doc["order_number"] = order['order_number']
            bill_doc["order_id"] = order['id']
            bill_doc["outlet_id"] = order.get('outlet_id')
            
            logger.info(f"PetPooja order {petpooja_order_id} matched to {order['order_number']}")
            
            await db.petpooja_bills.insert_one(bill_doc)
            
            return {
                "success": True,
                "message": "Order matched and synced",
                "order_number": order['order_number'],
                "matched": True
            }
        else:
            # No match found - store for manual review
            bill_doc["sync_error"] = "No matching order found - pending manual review"
            await db.petpooja_bills.insert_one(bill_doc)
            
            logger.warning(f"PetPooja order {petpooja_order_id} - no matching CRM order found")
            
            return {
                "success": True,
                "message": "Order saved for manual review - no matching CRM order found",
                "matched": False,
                "petpooja_order_id": petpooja_order_id,
                "has_cake": has_custom_cake
            }
    
    except Exception as e:
        logger.error(f"PetPooja standard format handler error: {str(e)}")
        return {"success": False, "message": str(e)}

async def handle_petpooja_payment(request_data: Dict[str, Any]):
    """Handle payment/bill format with order ID in comment"""
    try:
        from uuid import uuid4
        from datetime import datetime, timezone
        
        bill_number = request_data.get('bill_number') or request_data.get('billNo')
        amount = float(request_data.get('amount', 0) or request_data.get('totalAmount', 0))
        comment = request_data.get('comment') or request_data.get('remarks', '')
        payment_method = request_data.get('payment_method', 'cash')
        
        if not comment:
            logger.error("No comment/order ID found in PetPooja webhook")
            return {"success": False, "message": "Order ID not found in comment"}
        
        # Extract our Order ID from comment (format: USB-20250305-001)
        order_id = comment.strip()
        
        # Store the bill in petpooja_bills collection for tracking
        bill_doc = {
            "id": f"bill-{str(uuid4())[:8]}",
            "bill_number": bill_number,
            "bill_data": request_data,
            "amount": amount,
            "order_number": order_id,
            "payment_method": payment_method,
            "synced_to_order": False,
            "sync_error": None,
            "created_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Find order in our system by order_number or id
        order = await db.orders.find_one({
            "$or": [
                {"order_number": order_id},
                {"id": order_id}
            ]
        }, {"_id": 0})
        
        if not order:
            logger.error(f"Order not found for ID: {order_id}")
            bill_doc["sync_error"] = f"Order {order_id} not found"
            await db.petpooja_bills.insert_one(bill_doc)
            return {"success": False, "message": f"Order {order_id} not found"}
        
        # Check if order is on hold
        if order.get('is_hold', False):
            logger.info(f"Order {order_id} is on hold, not syncing payment")
            bill_doc["sync_error"] = "Order is on hold"
            await db.petpooja_bills.insert_one(bill_doc)
            return {"success": False, "message": "Order is on hold"}
        
        # Record payment
        payment = Payment(
            order_id=order['id'],
            amount=amount,
            payment_method=payment_method,
            petpooja_bill_number=bill_number,
            recorded_by="system"  # Auto-recorded from PetPooja
        )
        
        payment_doc = payment.model_dump()
        payment_doc['paid_at'] = payment_doc['paid_at'].isoformat()
        await db.payments.insert_one(payment_doc)
        
        # Update order
        new_paid_amount = order.get('paid_amount', 0) + amount
        new_pending = order.get('total_amount', 0) - new_paid_amount
        
        bill_numbers = order.get('petpooja_bill_numbers', [])
        if bill_number and bill_number not in bill_numbers:
            bill_numbers.append(bill_number)
        
        # Get minimum payment threshold from settings
        settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
        min_percentage = settings.get('minimum_payment_percentage', 20.0) if settings else 20.0
        
        # Calculate payment percentage
        total_amount = order.get('total_amount', 0)
        payment_percentage = (new_paid_amount / total_amount * 100) if total_amount > 0 else 0
        
        # Determine lifecycle status and order status
        current_lifecycle = order.get('lifecycle_status', 'pending_payment')
        new_lifecycle_status = current_lifecycle
        new_status = order.get('status', 'pending')
        
        # Check if order should move from pending_payment to active
        if current_lifecycle == 'pending_payment' and payment_percentage >= min_percentage:
            new_lifecycle_status = 'active'
            new_status = 'confirmed'
            logger.info(f"Order {order['id']} moved to active (payment: {payment_percentage:.1f}% >= {min_percentage}%)")
        elif current_lifecycle == 'pending_payment':
            logger.info(f"Order {order['id']} still pending (payment: {payment_percentage:.1f}% < {min_percentage}%)")
        
        update_data = {
            "paid_amount": new_paid_amount,
            "pending_amount": new_pending,
            "payment_synced_from_petpooja": True,
            "petpooja_bill_numbers": bill_numbers,
            "petpooja_comment": comment,
            "lifecycle_status": new_lifecycle_status,
            "status": new_status,
            "is_hold": False,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        await db.orders.update_one({"id": order['id']}, {"$set": update_data})
        
        # Log the payment sync
        log = Log(
            order_id=order['id'],
            action="payment_synced_from_petpooja",
            performed_by="system",
            after_data={
                "bill_number": bill_number,
                "amount": amount,
                "payment_method": payment_method
            }
        )
        log_doc = log.model_dump()
        log_doc['timestamp'] = log_doc['timestamp'].isoformat()
        await db.logs.insert_one(log_doc)
        
        logger.info(f"Payment synced for order {order_id}: ₹{amount}")
        
        # Mark bill as synced and store in petpooja_bills collection
        bill_doc["synced_to_order"] = True
        bill_doc["order_id"] = order['id']
        bill_doc["outlet_id"] = order.get('outlet_id')
        await db.petpooja_bills.insert_one(bill_doc)
        
        # Send WhatsApp notification for payment confirmation
        try:
            await send_msg91_whatsapp(order['id'], WhatsAppTemplateEvent.ORDER_CONFIRMED)
        except Exception as e:
            logger.error(f"WhatsApp notification failed: {str(e)}")
        
        return {
            "success": True,
            "message": "Payment synced successfully",
            "order_id": order['id'],
            "order_number": order.get('order_number'),
            "amount": amount,
            "status": "confirmed"
        }
    except Exception as e:
        logger.error(f"PetPooja payment handler error: {str(e)}")
        return {"success": False, "message": str(e)}

@api_router.post("/petpooja/order-webhook")
async def petpooja_order_webhook(request_data: Dict[str, Any]):
    """
    Main webhook endpoint for PetPooja orders
    Handles: New orders, status updates, and general order data
    This is the format PetPooja actually sends based on user's PHP testing
    """
    try:
        logger.info(f"PetPooja order webhook received: {request_data}")
        
        # Store raw data for audit
        from uuid import uuid4
        from datetime import datetime, timezone
        
        # Detect webhook type
        if 'order_id' in request_data:
            # New order or order data
            return await handle_petpooja_new_order(request_data)
        elif 'orderId' in request_data and 'status' in request_data:
            # Status update
            return await handle_petpooja_status_update(request_data)
        else:
            # Unknown format - store for review
            logger.warning(f"Unknown PetPooja webhook format: {request_data}")
            bill_doc = {
                "id": f"bill-{str(uuid4())[:8]}",
                "bill_number": f"UNKNOWN-{int(datetime.now(timezone.utc).timestamp())}",
                "bill_data": request_data,
                "amount": 0,
                "order_number": "UNKNOWN",
                "payment_method": "unknown",
                "synced_to_order": False,
                "sync_error": "Unknown webhook format",
                "created_at": datetime.now(timezone.utc).isoformat()
            }
            await db.petpooja_bills.insert_one(bill_doc)
            return {"success": True, "message": "Data saved for review"}
            
    except Exception as e:
        logger.error(f"PetPooja order webhook error: {str(e)}")
        return {"success": False, "message": str(e)}

async def handle_petpooja_new_order(data: Dict[str, Any]):
    """Handle new order data from PetPooja"""
    from uuid import uuid4
    from datetime import datetime, timezone
    
    petpooja_order_id = data.get('order_id', '')
    customer_name = data.get('customer_name') or data.get('customerName', '')
    customer_phone = data.get('customer_phone') or data.get('customerPhone', '')
    status = data.get('order_status') or data.get('status', 'pending')
    total_amount = float(data.get('total_amount') or data.get('totalAmount', 0))
    
    # Check if this order contains "Custom Cake" items
    items = data.get('items', []) or data.get('orderItems', [])
    has_custom_cake = False
    custom_cake_details = []
    
    for item in items:
        item_name = str(item.get('item_name', '') or item.get('itemName', '')).lower()
        if 'custom cake' in item_name or 'customcake' in item_name or 'custom' in item_name:
            has_custom_cake = True
            custom_cake_details.append({
                "name": item.get('item_name') or item.get('itemName', ''),
                "quantity": item.get('quantity', 1),
                "price": item.get('price', 0)
            })
    
    # Store bill in petpooja_bills collection
    bill_doc = {
        "id": f"bill-{str(uuid4())[:8]}",
        "bill_number": petpooja_order_id,
        "bill_data": data,
        "amount": total_amount,
        "order_number": None,  # Will try to match
        "payment_method": data.get('payment_method', 'cash'),
        "synced_to_order": False,
        "sync_error": None,
        "has_custom_cake": has_custom_cake,
        "custom_cake_details": custom_cake_details,
        "customer_name": customer_name,
        "customer_phone": customer_phone,
        "petpooja_status": status,
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Only process if it has custom cake
    if not has_custom_cake:
        bill_doc["sync_error"] = "No custom cake items found"
        await db.petpooja_bills.insert_one(bill_doc)
        logger.info(f"PetPooja order {petpooja_order_id} has no custom cake - skipped")
        return {"success": True, "message": "Order saved but no custom cake found"}
    
    # Try to find matching order in our CRM by phone number
    matching_orders = []
    if customer_phone:
        # Clean phone number
        clean_phone = customer_phone.replace('+91', '').replace('-', '').replace(' ', '').strip()
        
        # Search for orders with matching phone from last 48 hours
        two_days_ago = (datetime.now(timezone.utc) - timedelta(hours=48)).isoformat()
        matching_orders = await db.orders.find({
            "$or": [
                {"customer_info.phone": {"$regex": clean_phone}},
                {"customer_info.phone": customer_phone}
            ],
            "created_at": {"$gte": two_days_ago},
            "$or": [
                {"lifecycle_status": "pending_payment"},
                {"lifecycle_status": "hold"}
            ]
        }, {"_id": 0}).to_list(10)
    
    if matching_orders:
        # Found potential matches - use first one for now
        order = matching_orders[0]
        
        # Record payment
        payment = Payment(
            order_id=order['id'],
            amount=total_amount,
            payment_method=data.get('payment_method', 'cash'),
            petpooja_bill_number=petpooja_order_id,
            recorded_by="system"
        )
        
        payment_doc = payment.model_dump()
        payment_doc['paid_at'] = payment_doc['paid_at'].isoformat()
        await db.payments.insert_one(payment_doc)
        
        # Update order
        new_paid_amount = order.get('paid_amount', 0) + total_amount
        
        await db.orders.update_one(
            {"id": order['id']},
            {"$set": {
                "paid_amount": new_paid_amount,
                "pending_amount": order['total_amount'] - new_paid_amount,
                "lifecycle_status": "active",
                "status": OrderStatus.CONFIRMED,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        bill_doc["synced_to_order"] = True
        bill_doc["order_number"] = order['order_number']
        bill_doc["order_id"] = order['id']
        bill_doc["outlet_id"] = order.get('outlet_id')
        
        logger.info(f"PetPooja order {petpooja_order_id} matched to {order['order_number']}")
        
        await db.petpooja_bills.insert_one(bill_doc)
        
        return {
            "success": True,
            "message": "Order matched and synced",
            "order_number": order['order_number'],
            "matched": True
        }
    else:
        # No match found - store for manual review
        bill_doc["sync_error"] = "No matching order found - pending manual review"
        await db.petpooja_bills.insert_one(bill_doc)
        
        logger.warning(f"PetPooja order {petpooja_order_id} - no matching CRM order found")
        
        return {
            "success": True,
            "message": "Order saved for manual review",
            "matched": False
        }

async def handle_petpooja_status_update(data: Dict[str, Any]):
    """Handle status update from PetPooja"""
    from datetime import datetime, timezone
    
    petpooja_order_id = data.get('orderId', '')
    new_status = data.get('status', '')
    
    logger.info(f"PetPooja status update: {petpooja_order_id} -> {new_status}")
    
    # Find bill in our system
    bill = await db.petpooja_bills.find_one(
        {"bill_number": petpooja_order_id},
        {"_id": 0}
    )
    
    if bill and bill.get('order_id'):
        # Update our order status if needed
        # Map PetPooja statuses to our statuses
        status_map = {
            "confirmed": OrderStatus.CONFIRMED,
            "ready": OrderStatus.READY,
            "dispatched": OrderStatus.OUT_FOR_DELIVERY,
            "delivered": OrderStatus.DELIVERED,
            "cancelled": OrderStatus.CANCELLED
        }
        
        our_status = status_map.get(new_status.lower())
        if our_status:
            await db.orders.update_one(
                {"id": bill['order_id']},
                {"$set": {
                    "status": our_status,
                    "updated_at": datetime.now(timezone.utc).isoformat()
                }}
            )
        
        # Update bill status
        await db.petpooja_bills.update_one(
            {"bill_number": petpooja_order_id},
            {"$set": {"petpooja_status": new_status}}
        )
        
        return {"success": True, "message": "Status updated"}
    
    return {"success": True, "message": "Status update received"}

@api_router.get("/petpooja/webhook-url")
async def get_petpooja_webhook_url(
    request: Request,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get the PetPooja webhook URLs to provide to PetPooja team"""
    # Get the actual domain from request headers or use base URL
    forwarded_host = request.headers.get("x-forwarded-host") or request.headers.get("host")
    forwarded_proto = request.headers.get("x-forwarded-proto", "https")
    
    if forwarded_host and forwarded_host != "localhost:8001":
        base_url = f"{forwarded_proto}://{forwarded_host}"
    else:
        base_url = str(request.base_url).rstrip('/')
    
    callback_url = f"{base_url}/api/petpooja/callback"
    payment_url = f"{base_url}/api/petpooja/payment-webhook"
    
    return {
        "payment_webhook_url": payment_url,
        "status_callback_url": callback_url,
        "payment_webhook_description": "For syncing bill/payment data - include Order ID in 'comment' field",
        "status_callback_description": "For order status updates from PetPooja POS",
        "payment_expected_fields": ["bill_number", "amount", "comment (Order ID)", "payment_method"],
        "callback_expected_fields": [
            "restID", "orderID", "status", "cancel_reason", 
            "minimum_prep_time", "minimum_delivery_time", 
            "rider_name", "rider_phone_number", "is_modified"
        ]
    }

@api_router.get("/petpooja/orders")
async def get_petpooja_orders(
    current_user: User = Depends(get_current_user)
):
    """Get all orders that came from PetPooja POS"""
    query = {"petpooja_rest_id": {"$exists": True, "$ne": None}}
    
    orders = await db.orders.find(query, {"_id": 0}).sort("created_at", -1).to_list(1000)
    
    # Convert datetime strings
    for order in orders:
        if isinstance(order.get('created_at'), str):
            order['created_at'] = datetime.fromisoformat(order['created_at'])
        if isinstance(order.get('updated_at'), str):
            order['updated_at'] = datetime.fromisoformat(order['updated_at'])
        if isinstance(order.get('ready_at'), str) and order.get('ready_at'):
            order['ready_at'] = datetime.fromisoformat(order['ready_at'])
        if isinstance(order.get('delivered_at'), str) and order.get('delivered_at'):
            order['delivered_at'] = datetime.fromisoformat(order['delivered_at'])
    
    return orders

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
    
    # Get payment threshold for this outlet
    outlet_id = order.get('outlet_id')
    threshold_percentage = 20.0  # Default
    
    # Try to get branch-specific threshold first
    branch_threshold = await db.branch_payment_thresholds.find_one({"outlet_id": outlet_id}, {"_id": 0})
    if branch_threshold:
        threshold_percentage = branch_threshold.get('minimum_payment_percentage', 20.0)
    else:
        # Fall back to system-wide threshold
        system_settings = await db.system_settings.find_one({"id": "system_settings"}, {"_id": 0})
        if system_settings:
            threshold_percentage = system_settings.get('minimum_payment_percentage', 20.0)
    
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
    
    # Check if payment meets the threshold percentage, move to manage orders
    threshold_amount = order['total_amount'] * (threshold_percentage / 100)
    moved_to_manage = new_paid_amount >= threshold_amount
    
    if moved_to_manage:
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
        "threshold_percentage": threshold_percentage,
        "threshold_amount": threshold_amount,
        "moved_to_manage": moved_to_manage
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

@api_router.get("/payments")
async def get_all_payments(
    outlet_id: Optional[str] = None,
    current_user: User = Depends(get_current_user)
):
    """Get all payments with order details grouped by order"""
    # Build query
    order_query = {"is_deleted": False}
    if outlet_id:
        order_query["outlet_id"] = outlet_id
    
    # Get all orders that have payments
    orders = await db.orders.find(order_query, {"_id": 0}).to_list(10000)
    
    # Get all payments
    payments = await db.payments.find({}, {"_id": 0}).to_list(10000)
    
    # Group payments by order_id
    payments_by_order = {}
    for payment in payments:
        order_id = payment['order_id']
        if order_id not in payments_by_order:
            payments_by_order[order_id] = []
        payments_by_order[order_id].append(payment)
    
    # Build response with order details
    result = []
    for order in orders:
        order_id = order['id']
        order_payments = payments_by_order.get(order_id, [])
        
        if order_payments:  # Only include orders with payments
            result.append({
                "order_id": order_id,
                "order_number": order.get('order_number'),
                "customer_name": order.get('customer_info', {}).get('name'),
                "customer_phone": order.get('customer_info', {}).get('phone'),
                "total_amount": order.get('total_amount', 0),
                "paid_amount": order.get('paid_amount', 0),
                "pending_amount": order.get('pending_amount', 0),
                "outlet_id": order.get('outlet_id'),
                "created_at": order.get('created_at'),
                "payments": order_payments
            })
    
    # Sort by most recent first
    result.sort(key=lambda x: x.get('created_at', ''), reverse=True)
    
    return result

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

# ==================== MSG91 WHATSAPP CONFIGURATION ====================

@api_router.get("/msg91/config")
async def get_msg91_config(
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get MSG91 configuration (Super Admin only)"""
    config = await db.msg91_config.find_one({}, {"_id": 0})
    
    if not config:
        return {"auth_key": "", "integrated_number": "", "is_active": False}
    
    # Convert datetime strings
    if isinstance(config.get('created_at'), str):
        config['created_at'] = datetime.fromisoformat(config['created_at'])
    if isinstance(config.get('updated_at'), str):
        config['updated_at'] = datetime.fromisoformat(config['updated_at'])
    
    return config

@api_router.post("/msg91/config")
async def create_or_update_msg91_config(
    config_data: MSG91ConfigCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create or update MSG91 configuration (Super Admin only)"""
    
    existing = await db.msg91_config.find_one({})
    
    if existing:
        # Update existing
        update_data = {
            "auth_key": config_data.auth_key,
            "integrated_number": config_data.integrated_number,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.msg91_config.update_one({}, {"$set": update_data})
    else:
        # Create new
        config = MSG91Config(
            auth_key=config_data.auth_key,
            integrated_number=config_data.integrated_number
        )
        config_doc = config.model_dump()
        config_doc['created_at'] = config_doc['created_at'].isoformat()
        config_doc['updated_at'] = config_doc['updated_at'].isoformat()
        await db.msg91_config.insert_one(config_doc)
    
    return {"message": "MSG91 configuration saved successfully"}

@api_router.get("/msg91/templates")
async def get_msg91_templates(
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Get all MSG91 templates (Super Admin only)"""
    templates = await db.msg91_templates.find({}, {"_id": 0}).to_list(100)
    
    for template in templates:
        if isinstance(template.get('created_at'), str):
            template['created_at'] = datetime.fromisoformat(template['created_at'])
        if isinstance(template.get('updated_at'), str):
            template['updated_at'] = datetime.fromisoformat(template['updated_at'])
    
    return templates

@api_router.post("/msg91/templates")
async def create_or_update_msg91_template(
    template_data: MSG91TemplateCreate,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Create or update MSG91 template (Super Admin only)"""
    
    existing = await db.msg91_templates.find_one(
        {"event_type": template_data.event_type.value},
        {"_id": 0}
    )
    
    if existing:
        # Update existing
        update_data = {
            "template_name": template_data.template_name,
            "namespace": template_data.namespace,
            "language_code": template_data.language_code,
            "language_policy": template_data.language_policy,
            "variables": template_data.variables,
            "is_enabled": template_data.is_enabled,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.msg91_templates.update_one(
            {"event_type": template_data.event_type.value},
            {"$set": update_data}
        )
    else:
        # Create new
        template = MSG91Template(
            event_type=template_data.event_type,
            template_name=template_data.template_name,
            namespace=template_data.namespace,
            language_code=template_data.language_code,
            language_policy=template_data.language_policy,
            variables=template_data.variables,
            is_enabled=template_data.is_enabled
        )
        template_doc = template.model_dump()
        template_doc['created_at'] = template_doc['created_at'].isoformat()
        template_doc['updated_at'] = template_doc['updated_at'].isoformat()
        await db.msg91_templates.insert_one(template_doc)
    
    return {"message": "MSG91 template saved successfully"}

async def send_msg91_whatsapp(
    order_id: str,
    event_type: WhatsAppTemplateEvent
) -> bool:
    """Send WhatsApp notification via MSG91"""
    try:
        # Get MSG91 config
        config = await db.msg91_config.find_one({}, {"_id": 0})
        if not config or not config.get('is_active'):
            logger.info("MSG91 is not configured or not active")
            return False
        
        # Get template
        template = await db.msg91_templates.find_one(
            {"event_type": event_type.value},
            {"_id": 0}
        )
        
        if not template or not template.get('is_enabled'):
            logger.info(f"MSG91 template for {event_type.value} not enabled")
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
        
        # Validate phone - MSG91 expects format: country code + number (no +)
        if not customer_phone:
            logger.warning(f"No phone number for order {order_id}")
            return False
        
        # Remove + if present
        phone = customer_phone.replace('+', '').replace('-', '').replace(' ', '')
        
        # Prepare template variables
        variable_values = {
            "body_1": customer_name,
            "body_2": order.get('order_number', order_id),
            "body_3": order.get('delivery_date', 'N/A'),
            "body_4": order.get('delivery_time', 'N/A')
        }
        
        # Build components based on template variables
        components = {}
        for var in template.get('variables', []):
            if var in variable_values:
                components[var] = {
                    "type": "text",
                    "value": variable_values[var]
                }
        
        # Prepare MSG91 payload
        payload = {
            "integrated_number": config['integrated_number'],
            "content_type": "template",
            "payload": {
                "messaging_product": "whatsapp",
                "type": "template",
                "template": {
                    "name": template['template_name'],
                    "language": {
                        "code": template.get('language_code', 'en'),
                        "policy": template.get('language_policy', 'deterministic')
                    },
                    "namespace": template['namespace'],
                    "to_and_components": [
                        {
                            "to": [phone],
                            "components": components
                        }
                    ]
                }
            }
        }
        
        # Send request to MSG91
        headers = {
            "Content-Type": "application/json",
            "authkey": config['auth_key']
        }
        
        response = requests.post(
            "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
            json=payload,
            headers=headers,
            timeout=30
        )
        
        # Log the message
        log = WhatsAppMessageLog(
            order_id=order_id,
            event_type=event_type,
            recipient_phone=customer_phone,
            recipient_name=customer_name,
            campaign_name=template['template_name'],
            status="sent" if response.status_code == 200 else "failed",
            response_code=response.status_code,
            response_message=response.text if response.status_code != 200 else "Success",
            message_id=response.json().get('messageId') if response.status_code == 200 and response.text else None
        )
        
        log_doc = log.model_dump()
        log_doc['timestamp'] = log_doc['timestamp'].isoformat()
        await db.whatsapp_logs.insert_one(log_doc)
        
        if response.status_code == 200:
            logger.info(f"MSG91 WhatsApp sent for order {order_id}, event: {event_type.value}")
            return True
        else:
            logger.warning(f"MSG91 WhatsApp failed: {response.status_code} - {response.text}")
            return False
            
    except Exception as e:
        logger.error(f"Error sending MSG91 WhatsApp for order {order_id}: {str(e)}")
        return False

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

# ==================== PERMISSION MANAGEMENT ====================

def get_default_role_permissions(role: str) -> List[str]:
    """Get default permissions for a role"""
    defaults = {
        "super_admin": [
            "can_create_order", "can_view_orders", "can_edit_orders", "can_delete_orders", "can_mark_ready",
            "can_edit_customer_info", "can_edit_flavour", "can_edit_size", "can_edit_delivery_date",
            "can_edit_delivery_time", "can_edit_total_amount", "can_edit_special_instructions",
            "can_edit_cake_image", "can_edit_name_on_cake",
            "can_record_payment", "can_view_payments", "can_refund",
            "can_manage_outlets", "can_manage_zones", "can_manage_users", "can_view_reports", "can_manage_settings",
            "can_assign_delivery", "can_view_delivery_orders", "can_mark_delivered"
        ],
        "outlet_admin": [
            "can_create_order", "can_view_orders", "can_edit_orders",
            "can_edit_customer_info", "can_edit_flavour", "can_edit_size",
            "can_edit_delivery_date", "can_edit_delivery_time", "can_edit_special_instructions",
            "can_edit_cake_image", "can_edit_name_on_cake",
            "can_record_payment", "can_view_payments",
            "can_view_reports", "can_assign_delivery"
        ],
        "order_manager": [
            "can_create_order", "can_view_orders", "can_edit_orders",
            "can_edit_customer_info", "can_edit_flavour", "can_edit_size",
            "can_edit_delivery_date", "can_edit_delivery_time", "can_edit_special_instructions",
            "can_view_payments"
        ],
        "kitchen": ["can_view_orders", "can_mark_ready"],
        "delivery": ["can_view_delivery_orders", "can_mark_delivered"],
        "accounts": [
            "can_view_orders", "can_record_payment", "can_view_payments",
            "can_refund", "can_view_reports"
        ]
    }
    return defaults.get(role, [])

@api_router.get("/permissions/available")
async def get_available_permissions(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get all available permissions"""
    return {
        "permissions": AVAILABLE_PERMISSIONS,
        "roles": [role.value for role in UserRole]
    }

@api_router.get("/permissions/roles")
async def get_all_role_permissions(current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get all role permission templates"""
    templates = await db.role_permissions.find({}, {"_id": 0}).to_list(100)
    
    # If no templates, return defaults
    if not templates:
        templates = []
        for role in UserRole:
            templates.append({
                "role": role.value,
                "permissions": get_default_role_permissions(role.value),
                "description": f"Default permissions for {role.value}",
                "updated_at": datetime.now(timezone.utc).isoformat(),
                "updated_by": "system"
            })
    
    return {"role_permissions": templates}

@api_router.get("/permissions/roles/{role}")
async def get_role_permissions(role: str, current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))):
    """Get permissions for a specific role"""
    template = await db.role_permissions.find_one({"role": role}, {"_id": 0})
    
    if not template:
        template = {
            "role": role,
            "permissions": get_default_role_permissions(role),
            "description": f"Default permissions for {role}"
        }
    
    return template

class UpdateRolePermissionsRequest(BaseModel):
    role: str
    permissions: List[str]

@api_router.post("/permissions/roles")
async def update_role_permissions(
    request: UpdateRolePermissionsRequest,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Update permissions for a role"""
    # Validate permissions
    all_permissions = []
    for category in AVAILABLE_PERMISSIONS.values():
        all_permissions.extend(category.keys())
    
    invalid = [p for p in request.permissions if p not in all_permissions]
    if invalid:
        raise HTTPException(status_code=400, detail=f"Invalid permissions: {', '.join(invalid)}")
    
    template = {
        "role": request.role,
        "permissions": request.permissions,
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "updated_by": current_user.id
    }
    
    await db.role_permissions.update_one(
        {"role": request.role},
        {"$set": template},
        upsert=True
    )
    
    return {"message": f"Permissions updated for {request.role}", "template": template}

@api_router.post("/permissions/apply-to-existing-users/{role}")
async def apply_permissions_to_existing_users(
    role: str,
    current_user: User = Depends(require_role([UserRole.SUPER_ADMIN]))
):
    """Apply role permissions to all existing users with that role"""
    template = await db.role_permissions.find_one({"role": role})
    if not template:
        template = {
            "permissions": get_default_role_permissions(role)
        }
    
    result = await db.users.update_many(
        {"role": role},
        {"$set": {"permissions": template["permissions"]}}
    )
    
    return {
        "message": f"Applied permissions to {result.modified_count} users",
        "role": role,
        "modified_count": result.modified_count
    }




@api_router.post("/upload-voice")
async def upload_voice_instruction(
    file: UploadFile = File(...),
    current_user: User = Depends(get_current_user)
):
    """Upload voice instruction audio file"""
    try:
        # Create voice instructions directory
        voice_dir = ROOT_DIR / "uploads" / "voice-instructions"
        voice_dir.mkdir(parents=True, exist_ok=True)
        
        # Generate unique filename
        file_ext = file.filename.split('.')[-1] if '.' in file.filename else 'webm'
        unique_filename = f"voice_{uuid.uuid4()}.{file_ext}"
        file_path = voice_dir / unique_filename
        
        # Save file
        with open(file_path, "wb") as buffer:
            content = await file.read()
            buffer.write(content)
        
        # Return URL
        file_url = f"/uploads/voice-instructions/{unique_filename}"
        return {"file_url": file_url, "message": "Voice instruction uploaded successfully"}
    
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


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
