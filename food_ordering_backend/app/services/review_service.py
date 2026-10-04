from fastapi import HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session, selectinload

from app.models import Customer, Food, Review
from app.schemas.review import ReviewWrite


def list_reviews(db: Session, food_id: int | None = None, skip: int = 0, limit: int = 50) -> list[Review]:
    query = select(Review).options(selectinload(Review.customer)).order_by(Review.created_at.desc(), Review.id.desc())
    if food_id is not None:
        if db.get(Food, food_id) is None:
            raise HTTPException(404, "Food not found")
        query = query.where(Review.food_id == food_id)
    return list(db.scalars(query.offset(skip).limit(limit)))


def create_review(db: Session, food_id: int, data: ReviewWrite, user: Customer) -> Review:
    if db.get(Food, food_id) is None:
        raise HTTPException(404, "Food not found")
    review = Review(customer_id=user.id, food_id=food_id, **data.model_dump())
    db.add(review)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "You already reviewed this food") from None
    return db.scalar(select(Review).options(selectinload(Review.customer)).where(Review.id == review.id))


def update_review(db: Session, review_id: int, data: ReviewWrite, user: Customer) -> Review:
    review = db.get(Review, review_id)
    if review is None or (user.role != "admin" and review.customer_id != user.id):
        raise HTTPException(404, "Review not found")
    review.rating = data.rating
    review.comment = data.comment
    db.commit()
    return db.scalar(select(Review).options(selectinload(Review.customer)).where(Review.id == review_id))


def delete_review(db: Session, review_id: int, user: Customer) -> None:
    review = db.get(Review, review_id)
    if review is None or (user.role != "admin" and review.customer_id != user.id):
        raise HTTPException(404, "Review not found")
    db.delete(review)
    db.commit()
