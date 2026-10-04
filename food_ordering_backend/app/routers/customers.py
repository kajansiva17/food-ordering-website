from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.auth import RegisterRequest
from app.schemas.customer import CustomerRead, CustomerUpdate
from app.schemas.order import OrderRead
from app.services import customer_service
from app.security import get_current_user, require_admin, require_owner_or_admin
from app.models import Customer

router = APIRouter(prefix="/customers", tags=["customers"])


@router.get("/", response_model=list[CustomerRead], summary="List customers")
def list_customers(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return customer_service.list_customers(db, skip, limit)


@router.get("/{customer_id}", response_model=CustomerRead, summary="Get customer")
def get_customer(customer_id: int, db: Session = Depends(get_db), _: Customer = Depends(require_owner_or_admin)):
    return customer_service.get_customer(db, customer_id)


@router.get("/{customer_id}/orders", response_model=list[OrderRead], summary="Get customer order history")
def customer_orders(
    customer_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Customer = Depends(require_owner_or_admin),
):
    return customer_service.list_customer_orders(db, customer_id, skip, limit)


@router.post("/", response_model=CustomerRead, status_code=status.HTTP_201_CREATED, summary="Create customer")
def create_customer(data: RegisterRequest, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return customer_service.create_customer(db, data)


@router.patch("/{customer_id}", response_model=CustomerRead, summary="Update customer")
def update_customer(customer_id: int, data: CustomerUpdate, db: Session = Depends(get_db), _: Customer = Depends(require_owner_or_admin)):
    return customer_service.update_customer(db, customer_id, data)


@router.delete("/{customer_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete customer without orders")
def delete_customer(customer_id: int, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    customer_service.delete_customer(db, customer_id)
    return Response(status_code=204)

