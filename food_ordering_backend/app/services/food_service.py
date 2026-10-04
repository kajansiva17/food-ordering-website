from pathlib import Path
from uuid import uuid4

from fastapi import HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models import Food
from app.config import get_settings
from app.schemas.food import FoodCreate, FoodUpdate
from app.services.category_service import get_category

ALLOWED_IMAGE_TYPES = {"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
MAX_IMAGE_BYTES = 5 * 1024 * 1024


def list_foods(
    db: Session,
    skip: int,
    limit: int,
    category_id: int | None = None,
    search: str | None = None,
    is_available: bool | None = True,
) -> list[Food]:
    query = select(Food)
    if category_id is not None:
        query = query.where(Food.category_id == category_id)
    if search:
        query = query.where(Food.name.ilike(f"%{search.strip()}%"))
    if is_available is not None:
        query = query.where(Food.is_available.is_(is_available))
    return list(db.scalars(query.order_by(Food.id).offset(skip).limit(limit)))


def get_food(db: Session, food_id: int) -> Food:
    food = db.get(Food, food_id)
    if food is None:
        raise HTTPException(404, "Food not found")
    return food


def create_food(db: Session, data: FoodCreate) -> Food:
    get_category(db, data.category_id)
    food = Food(**data.model_dump())
    db.add(food)
    db.commit()
    db.refresh(food)
    return food


def update_food(db: Session, food_id: int, data: FoodUpdate) -> Food:
    food = get_food(db, food_id)
    if data.category_id is not None:
        get_category(db, data.category_id)
    for key, value in data.model_dump(exclude_unset=True).items():
        setattr(food, key, value)
    db.commit()
    db.refresh(food)
    return food


def delete_food(db: Session, food_id: int) -> None:
    food = get_food(db, food_id)
    if food.order_items:
        raise HTTPException(409, "Referenced food cannot be deleted")
    db.delete(food)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Referenced food cannot be deleted") from None


async def save_image(db: Session, food_id: int, image: UploadFile) -> Food:
    food = get_food(db, food_id)
    suffix = ALLOWED_IMAGE_TYPES.get(image.content_type or "")
    if suffix is None:
        raise HTTPException(415, "Upload a JPEG, PNG, or WebP image")
    content = await image.read(MAX_IMAGE_BYTES + 1)
    if len(content) > MAX_IMAGE_BYTES:
        raise HTTPException(413, "Image exceeds 5 MB")
    upload_dir = Path(get_settings().upload_dir)
    upload_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid4().hex}{suffix}"
    image_path = upload_dir / filename
    image_path.write_bytes(content)
    food.image_url = f"/uploads/{filename}"
    try:
        db.commit()
    except Exception:
        db.rollback()
        image_path.unlink(missing_ok=True)
        raise
    db.refresh(food)
    return food

