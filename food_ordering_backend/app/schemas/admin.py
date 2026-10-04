from typing import Literal

from pydantic import BaseModel


class ActiveUpdate(BaseModel):
    is_active: bool


class RoleUpdate(BaseModel):
    role: Literal["user", "admin"]


class PaymentStatusUpdate(BaseModel):
    status: str
