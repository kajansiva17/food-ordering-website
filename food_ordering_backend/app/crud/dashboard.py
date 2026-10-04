from decimal import Decimal

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Category, Customer, Food, Order, Payment, Review
from app.schemas.dashboard import DashboardSummary


def get_summary(db: Session) -> DashboardSummary:
    return DashboardSummary(
        category_count=db.scalar(select(func.count(Category.id))) or 0,
        food_count=db.scalar(select(func.count(Food.id))) or 0,
        customer_count=db.scalar(select(func.count(Customer.id))) or 0,
        order_count=db.scalar(select(func.count(Order.id))) or 0,
        pending_order_count=db.scalar(select(func.count(Order.id)).where(Order.status == "pending")) or 0,
        delivered_order_count=db.scalar(select(func.count(Order.id)).where(Order.status == "delivered")) or 0,
        review_count=db.scalar(select(func.count(Review.id))) or 0,
        delivered_revenue=db.scalar(
            select(func.sum(Payment.amount)).join(Order, Payment.order_id == Order.id)
            .where(Order.status == "delivered", Payment.status == "paid", Payment.currency == get_settings().currency)
        ) or Decimal("0.00"),
    )
