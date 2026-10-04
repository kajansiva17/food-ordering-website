from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.order import OrderCreate, OrderRead, OrderStatus, OrderStatusUpdate
from app.services import order_service
from app.security import get_current_user, require_admin
from app.models import Customer
from fastapi import HTTPException

router = APIRouter(prefix="/orders", tags=["orders"])


@router.get("/", response_model=list[OrderRead], summary="List orders, newest first")
def list_orders(
    status_filter: OrderStatus | None = Query(default=None, alias="status"),
    search: str | None = Query(default=None, max_length=100),
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    _: Customer = Depends(require_admin),
):
    return order_service.list_orders(db, skip, limit, status_filter, search)


@router.get("/{order_id}", response_model=OrderRead, summary="Get order details")
def get_order(order_id: int, db: Session = Depends(get_db), user: Customer = Depends(get_current_user)):
    order = order_service.get_order(db, order_id)
    if user.role != "admin" and order.customer_id != user.id:
        raise HTTPException(404, "Order not found")
    return order


@router.post("/", response_model=OrderRead, status_code=status.HTTP_201_CREATED, summary="Place an order")
def create_order(data: OrderCreate, db: Session = Depends(get_db), user: Customer = Depends(get_current_user)):
    return order_service.create_order(db, data, user)


@router.patch("/{order_id}/status", response_model=OrderRead, summary="Update order status")
def update_status(order_id: int, data: OrderStatusUpdate, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return order_service.update_status(db, order_id, data.status)
