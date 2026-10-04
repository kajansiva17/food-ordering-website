from fastapi import APIRouter, Depends, Query, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer
from app.schemas.review import ReviewRead, ReviewWrite
from app.security import get_current_user
from app.services import review_service

router = APIRouter(tags=["reviews"])


@router.get("/foods/{food_id}/reviews", response_model=list[ReviewRead])
def food_reviews(food_id: int, skip: int = Query(0, ge=0), limit: int = Query(50, ge=1, le=100), db: Session = Depends(get_db)):
    return review_service.list_reviews(db, food_id, skip, limit)


@router.post("/foods/{food_id}/reviews", response_model=ReviewRead, status_code=status.HTTP_201_CREATED)
def create_review(food_id: int, data: ReviewWrite, db: Session = Depends(get_db), user: Customer = Depends(get_current_user)):
    return review_service.create_review(db, food_id, data, user)


@router.patch("/reviews/{review_id}", response_model=ReviewRead)
def update_review(review_id: int, data: ReviewWrite, db: Session = Depends(get_db), user: Customer = Depends(get_current_user)):
    return review_service.update_review(db, review_id, data, user)


@router.delete("/reviews/{review_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_review(review_id: int, db: Session = Depends(get_db), user: Customer = Depends(get_current_user)):
    review_service.delete_review(db, review_id, user)
    return Response(status_code=204)
