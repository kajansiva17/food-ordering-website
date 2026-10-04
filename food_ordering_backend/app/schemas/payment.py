from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict


class PaymentRead(BaseModel):
    id: int
    method: str
    status: str
    amount: Decimal
    currency: str
    transaction_reference: str | None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
