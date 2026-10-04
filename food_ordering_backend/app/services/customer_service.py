from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Customer, Order
from app.schemas.auth import RegisterRequest
from app.schemas.customer import CustomerUpdate
from app.security import hash_password


def list_customers(db: Session, skip: int, limit: int) -> list[Customer]:
    return list(db.scalars(select(Customer).order_by(Customer.id).offset(skip).limit(limit)))


def get_customer(db: Session, customer_id: int) -> Customer:
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "Customer not found")
    return customer


def create_customer(db: Session, data: RegisterRequest) -> Customer:
    customer = Customer(
        name=data.name.strip(), email=str(data.email), phone=data.phone.strip(), address="",
        password_hash=hash_password(data.password), role="user", is_active=True,
    )
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Duplicate customer email") from None
    db.refresh(customer)
    return customer


def update_customer(db: Session, customer_id: int, data: CustomerUpdate) -> Customer:
    customer = get_customer(db, customer_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(customer, key, value)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Duplicate customer email") from None
    db.refresh(customer)
    return customer


def delete_customer(db: Session, customer_id: int) -> None:
    customer = get_customer(db, customer_id)
    if customer.orders:
        raise HTTPException(409, "Referenced customer cannot be deleted")
    db.delete(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Referenced customer cannot be deleted") from None


def list_customer_orders(db: Session, customer_id: int, skip: int, limit: int) -> list[Order]:
    get_customer(db, customer_id)
    query = select(Order).where(Order.customer_id == customer_id).order_by(Order.created_at.desc(), Order.id.desc())
    return list(db.scalars(query.offset(skip).limit(limit)))

