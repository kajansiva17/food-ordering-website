from decimal import Decimal

from pydantic import BaseModel


class DashboardSummary(BaseModel):
    category_count: int
    food_count: int
    customer_count: int
    order_count: int
    pending_order_count: int
    delivered_order_count: int
    review_count: int
    delivered_revenue: Decimal

