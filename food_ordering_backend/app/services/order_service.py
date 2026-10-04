from decimal import Decimal

from fastapi import HTTPException
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Customer, Food, Order, OrderItem, Payment
from app.schemas.cart import CartPreviewItem, CartPreviewResponse
from app.schemas.order import OrderCreate, OrderItemCreate, OrderStatus


def list_orders(db: Session, skip: int, limit: int, status: OrderStatus | None = None, search: str | None = None) -> list[Order]:
    query = select(Order)
    if status is not None:
        query = query.where(Order.status == status.value)
    if search:
        query = query.join(Customer).where(or_(Order.id == int(search) if search.isdigit() else False, Customer.name.ilike(f"%{search}%")))
    return list(db.scalars(query.order_by(Order.created_at.desc(), Order.id.desc()).offset(skip).limit(limit)))


def get_order(db: Session, order_id: int) -> Order:
    order = db.get(Order, order_id)
    if order is None:
        raise HTTPException(404, "Order not found")
    return order


def price_items(db: Session, items: list[OrderItemCreate]) -> tuple[list[CartPreviewItem], Decimal]:
    food_ids = {item.food_id for item in items}
    foods = {food.id: food for food in db.scalars(select(Food).where(Food.id.in_(food_ids)))}
    priced_items = []
    total = Decimal("0.00")
    for item in items:
        food = foods.get(item.food_id)
        if food is None:
            raise HTTPException(404, f"Food {item.food_id} not found")
        if not food.is_available:
            raise HTTPException(409, f"Food {item.food_id} is currently unavailable")
        subtotal = food.price * item.quantity
        priced_items.append(CartPreviewItem(
            food_id=food.id, name=food.name, quantity=item.quantity, unit_price=food.price, subtotal=subtotal
        ))
        total += subtotal
    return priced_items, total


def preview_cart(db: Session, items: list[OrderItemCreate]) -> CartPreviewResponse:
    priced_items, subtotal = price_items(db, items)
    fee = get_settings().delivery_fee
    return CartPreviewResponse(items=priced_items, subtotal_amount=subtotal, delivery_fee=fee, total_amount=subtotal + fee)


def create_order(db: Session, data: OrderCreate, user: Customer) -> Order:
    if user.role != "admin" and data.customer_id != user.id:
        raise HTTPException(403, "Cannot place an order for another customer")
    # The authenticated-user dependency may already have opened this session's transaction.
    try:
        customer = db.get(Customer, data.customer_id)
        if customer is None:
            raise HTTPException(404, "Customer not found")
        priced_items, subtotal = price_items(db, data.items)
        fee = get_settings().delivery_fee
        delivery_name = (data.delivery_name or customer.name).strip()
        delivery_email = str(data.delivery_email or customer.email)
        delivery_phone = (data.delivery_phone or customer.phone).strip()
        delivery_address = (data.delivery_address or customer.address).strip()
        if not all((delivery_name, delivery_email, delivery_phone, delivery_address)):
            raise HTTPException(422, "Delivery name, email, phone, and address are required")
        total = subtotal + fee
        order = Order(
            customer_id=customer.id, status=OrderStatus.pending.value,
            subtotal_amount=subtotal, delivery_fee=fee, total_amount=total,
            delivery_name=delivery_name, delivery_email=delivery_email,
            delivery_phone=delivery_phone, delivery_address=delivery_address,
            delivery_notes=data.delivery_notes,
        )
        for item in priced_items:
            order.items.append(OrderItem(
                food_id=item.food_id, food_name=item.name, quantity=item.quantity,
                unit_price=item.unit_price, subtotal=item.subtotal,
            ))
        order.payment = Payment(
            method=data.payment_method, status="pending", amount=total,
            currency=get_settings().currency,
        )
        db.add(order)
        db.flush()
        order_id = order.id
        db.commit()
    except Exception:
        db.rollback()
        raise
    return get_order(db, order_id)


def update_status(db: Session, order_id: int, status: OrderStatus) -> Order:
    order = get_order(db, order_id)
    transitions = {
        "pending": {"confirmed", "cancelled"},
        "confirmed": {"preparing", "cancelled"},
        "preparing": {"out_for_delivery", "cancelled"},
        "out_for_delivery": {"delivered"},
        "delivered": set(),
        "cancelled": set(),
    }
    if status.value not in transitions[order.status]:
        raise HTTPException(409, f"Cannot change order from {order.status} to {status.value}")
    order.status = status.value
    if status == OrderStatus.cancelled and order.payment is not None:
        order.payment.status = "failed"
    db.commit()
    db.refresh(order)
    return order
