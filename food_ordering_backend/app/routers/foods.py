from fastapi import APIRouter, Depends, File, Query, Response, UploadFile, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.schemas.food import FoodCreate, FoodRead, FoodUpdate
from app.services import food_service
from app.security import require_admin
from app.models import Customer

router = APIRouter(prefix="/foods", tags=["foods"])


@router.get("/", response_model=list[FoodRead], summary="Search and filter foods")
def list_foods(
    search: str | None = Query(None, max_length=150),
    category_id: int | None = Query(None, ge=1),
    is_available: bool | None = None,
    include_unavailable: bool = False,
    available_only: bool | None = None,
    skip: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
):
    availability = None if include_unavailable or available_only is False else (is_available if is_available is not None else True)
    return food_service.list_foods(db, skip, limit, category_id, search, availability)


@router.get("/{food_id}", response_model=FoodRead, summary="Get a food item")
def get_food(food_id: int, db: Session = Depends(get_db)):
    return food_service.get_food(db, food_id)


@router.post("/", response_model=FoodRead, status_code=status.HTTP_201_CREATED, summary="Create food")
def create_food(data: FoodCreate, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return food_service.create_food(db, data)


@router.patch("/{food_id}", response_model=FoodRead, summary="Update food, price, or availability")
def update_food(food_id: int, data: FoodUpdate, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return food_service.update_food(db, food_id, data)


@router.delete("/{food_id}", status_code=status.HTTP_204_NO_CONTENT, summary="Delete unused food")
def delete_food(food_id: int, db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    food_service.delete_food(db, food_id)
    return Response(status_code=204)


@router.post("/{food_id}/image", response_model=FoodRead, summary="Upload food image")
async def upload_food_image(food_id: int, image: UploadFile = File(...), db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return await food_service.save_image(db, food_id, image)
