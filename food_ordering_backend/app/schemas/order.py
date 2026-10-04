from datetime import datetime
from decimal import Decimal
from enum import Enum
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.schemas.payment import PaymentRead


class OrderStatus(str, Enum):
    pending = "pending"
    confirmed = "confirmed"
    preparing = "preparing"
    out_for_delivery = "out_for_delivery"
    delivered = "delivered"
    cancelled = "cancelled"


class OrderItemCreate(BaseModel):
    food_id: int
    quantity: int = Field(ge=1)


class OrderCreate(BaseModel):
    customer_id: int
    items: list[OrderItemCreate] = Field(min_length=1)
    delivery_name: str | None = Field(default=None, min_length=1, max_length=150)
    delivery_email: EmailStr | None = None
    delivery_phone: str | None = Field(default=None, min_length=1, max_length=30)
    delivery_address: str | None = Field(default=None, min_length=1, max_length=500)
    delivery_notes: str | None = Field(default=None, max_length=1000)
    payment_method: Literal["cash_on_delivery"] = "cash_on_delivery"


class OrderItemRead(OrderItemCreate):
    id: int
    food_name: str
    unit_price: Decimal
    subtotal: Decimal
    model_config = ConfigDict(from_attributes=True)


class OrderRead(BaseModel):
    id: int
    customer_id: int
    status: OrderStatus
    total_amount: Decimal
    subtotal_amount: Decimal
    delivery_fee: Decimal
    delivery_name: str
    delivery_email: str
    delivery_phone: str
    delivery_address: str
    delivery_notes: str | None
    created_at: datetime
    items: list[OrderItemRead]
    payment: PaymentRead | None
    model_config = ConfigDict(from_attributes=True)


class OrderStatusUpdate(BaseModel):
    status: OrderStatus

