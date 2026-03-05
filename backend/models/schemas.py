from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
from enum import Enum
import uuid

# ==================== ENUMS ====================
class UserRole(str, Enum):
    SUPER_ADMIN = "super_admin"
    OUTLET_ADMIN = "outlet_admin"
    ORDER_MANAGER = "order_manager"
    KITCHEN = "kitchen"
    DELIVERY = "delivery"
    ACCOUNTS = "accounts"

class OrderStatus(str, Enum):
    PENDING = "pending"
    ON_HOLD = "on_hold"
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

class WhatsAppTemplateEvent(str, Enum):
    ORDER_PLACED = "order_placed"
    ORDER_CONFIRMED = "order_confirmed"
    ORDER_READY = "order_ready"
    OUT_FOR_DELIVERY = "out_for_delivery"
    DELIVERED = "delivered"

# ==================== USER MODELS ====================
class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    name: str
    phone: str
    role: UserRole
    permissions: List[str] = []
    incentive_percentage: float = 0.0
    password_hash: str
    outlet_id: Optional[str] = None
    is_active: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    name: str
    phone: str
    role: UserRole
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
    outlet_id: Optional[str]
    is_active: bool
    created_at: datetime

class Token(BaseModel):
    access_token: str
    token_type: str
    user: UserResponse

# ==================== OUTLET MODELS ====================
class Outlet(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    address: str
    city: str
    phone: str
    username: str
    password_hash: str
    ready_time_buffer_minutes: int = 60
    is_active: bool = True
    created_by: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class OutletCreate(BaseModel):
    name: str
    address: str
    city: str
    phone: str
    username: str
    password: str
    ready_time_buffer_minutes: int = 60

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

# ==================== ORDER MODELS ====================
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
    order_type: OrderType
    receiver_info: Optional[ReceiverInfo] = None
    customer_info: CustomerInfo
    needs_delivery: bool = False
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
    status: OrderStatus = OrderStatus.PENDING
    outlet_id: str
    created_by: str
    order_taken_by: str
    total_amount: float = 0.0
    paid_amount: float = 0.0
    pending_amount: float = 0.0
    payment_synced_from_petpooja: bool = False
    petpooja_bill_numbers: List[str] = []
    petpooja_comment: Optional[str] = None
    is_hold: bool = False
    is_ready: bool = False
    ready_at: Optional[datetime] = None
    is_deleted: bool = False
    assigned_delivery_partner: Optional[str] = None
    picked_up_at: Optional[datetime] = None
    reached_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None
    delivery_otp: Optional[str] = None
    whatsapp_alerts: bool = True
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

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

# ==================== PAYMENT MODELS ====================
class Payment(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    amount: float
    payment_method: str
    petpooja_bill_number: Optional[str] = None
    paid_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    recorded_by: str

class PaymentCreate(BaseModel):
    order_id: str
    amount: float
    payment_method: str
    petpooja_bill_number: Optional[str] = None

# ==================== ZONE MODELS ====================
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

# ==================== LOG MODELS ====================
class Log(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    order_id: str
    action: str
    performed_by: str
    before_data: Optional[Dict[str, Any]] = None
    after_data: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# ==================== CUSTOMER MODELS ====================
class Customer(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    birthday: Optional[str] = None
    anniversary: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[Gender] = None
    notes: Optional[str] = None
    total_orders: int = 0
    total_spent: float = 0.0
    outlet_id: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class CustomerCreate(BaseModel):
    name: str
    phone: str
    alternate_phone: Optional[str] = None
    email: Optional[EmailStr] = None
    birthday: Optional[str] = None
    anniversary: Optional[str] = None
    address: Optional[str] = None
    city: Optional[str] = None
    gender: Optional[Gender] = None
    notes: Optional[str] = None
    outlet_id: Optional[str] = None
