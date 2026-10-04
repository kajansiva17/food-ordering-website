from decimal import Decimal

from pydantic import BaseModel, Field

from app.schemas.order import OrderItemCreate


class CartPreviewRequest(BaseModel):
    items: list[OrderItemCreate] = Field(min_length=1)


class CartPreviewItem(BaseModel):
    food_id: int
    name: str
    quantity: int
    unit_price: Decimal
    subtotal: Decimal


class CartPreviewResponse(BaseModel):
    items: list[CartPreviewItem]
    subtotal_amount: Decimal
    delivery_fee: Decimal
    total_amount: Decimal
