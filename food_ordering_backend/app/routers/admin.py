from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy import or_, select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer, Nutrition, Payment
from app.schemas.admin import ActiveUpdate, PaymentStatusUpdate, RoleUpdate
from app.schemas.customer import CustomerRead
from app.schemas.nutrition import NutritionRead, NutritionWrite
from app.schemas.payment import PaymentRead
from app.schemas.review import ReviewRead
from app.security import require_admin
from app.services.food_service import get_food
from app.services.review_service import delete_review, list_reviews

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


@router.put("/foods/{food_id}/nutrition", response_model=NutritionRead)
def upsert_nutrition(food_id: int, data: NutritionWrite, db: Session = Depends(get_db)):
    get_food(db, food_id)
    nutrition = db.scalar(select(Nutrition).where(Nutrition.food_id == food_id))
    if nutrition is None:
        nutrition = Nutrition(food_id=food_id)
        db.add(nutrition)
    for key, value in data.model_dump().items():
        setattr(nutrition, key, value)
    db.commit()
    db.refresh(nutrition)
    return nutrition


@router.get("/users", response_model=list[CustomerRead])
def users(search: str | None = Query(None, max_length=150), skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    query = select(Customer)
    if search:
        query = query.where(or_(Customer.name.ilike(f"%{search}%"), Customer.email.ilike(f"%{search}%")))
    return list(db.scalars(query.order_by(Customer.id.desc()).offset(skip).limit(limit)))


@router.patch("/users/{customer_id}/active", response_model=CustomerRead)
def set_user_active(customer_id: int, data: ActiveUpdate, db: Session = Depends(get_db), admin: Customer = Depends(require_admin)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "User not found")
    if customer.id == admin.id and not data.is_active:
        raise HTTPException(409, "Cannot deactivate your own admin account")
    customer.is_active = data.is_active
    db.commit()
    db.refresh(customer)
    return customer


@router.patch("/users/{customer_id}/role", response_model=CustomerRead)
def set_user_role(customer_id: int, data: RoleUpdate, db: Session = Depends(get_db), admin: Customer = Depends(require_admin)):
    customer = db.get(Customer, customer_id)
    if customer is None:
        raise HTTPException(404, "User not found")
    if customer.id == admin.id and data.role != admin.role:
        raise HTTPException(409, "Cannot change your own admin role")
    customer.role = data.role
    db.commit()
    db.refresh(customer)
    return customer


@router.get("/reviews", response_model=list[ReviewRead])
def reviews(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    return list_reviews(db, skip=skip, limit=limit)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def moderate_review(review_id: int, db: Session = Depends(get_db), admin: Customer = Depends(require_admin)):
    delete_review(db, review_id, admin)
    return Response(status_code=204)


@router.patch("/payments/{payment_id}/status", response_model=PaymentRead)
def update_payment(payment_id: int, data: PaymentStatusUpdate, db: Session = Depends(get_db)):
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(404, "Payment not found")
    transitions = {"pending": {"paid", "failed"}, "paid": {"refunded"}, "failed": set(), "refunded": set()}
    if data.status not in transitions[payment.status]:
        raise HTTPException(409, "Invalid payment status transition")
    if data.status == "paid" and payment.order.status != "delivered":
        raise HTTPException(409, "Mark the order delivered before recording cash payment")
    payment.status = data.status
    db.commit()
    db.refresh(payment)
    return payment
