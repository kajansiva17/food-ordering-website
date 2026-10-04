from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.category import CategoryCreate, CategoryRead, CategoryUpdate
from app.schemas.food import FoodRead
from app.services import category_service, food_service
from app.security import require_admin
from app.models import Customer

router = APIRouter(prefix="/categories", tags=["categories"])


@router.get("/", response_model=list[CategoryRead], summary="List categories")
def list_categories(skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    return category_service.list_categories(db, skip, limit)


@router.get("/{category_id}", response_model=CategoryRead, summary="Get category")
def get_category(category_id: int, db: Session = Depends(get_db)):
    return category_service.get_category(db, category_id)


@router.get("/{category_id}/foods", response_model=list[FoodRead], summary="List available foods in a category")
def category_foods(
    category_id: int,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    category_service.get_category(db, category_id)
    return food_service.list_foods(db, skip, limit, category_id=category_id)


@router.post("/", response_model=CategoryRead, status_code=status.HTTP_201_CREATED, summary="Create category")
def create_category(data: CategoryCreate, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return category_service.create_category(db, data)


@router.patch("/{category_id}", response_model=CategoryRead, summary="Update category")
def update_category(category_id: int, data: CategoryUpdate, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return category_service.update_category(db, category_id, data)


@router.delete("/{category_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete unused category")
def delete_category(category_id: int, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    category_service.delete_category(db, category_id)
    return Response(status_code=204)

