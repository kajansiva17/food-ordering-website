from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.cart import CartPreviewRequest, CartPreviewResponse
from app.services.order_service import preview_cart

router = APIRouter(prefix="/cart", tags=["cart"])


@router.post("/preview", response_model=CartPreviewResponse, summary="Validate cart and calculate current totals")
def preview(data: CartPreviewRequest, db: Session = Depends(get_db)):
    return preview_cart(db, data.items)
