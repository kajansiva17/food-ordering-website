from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Customer
from app.schemas.auth import ChangePasswordRequest, LoginRequest, RegisterRequest, TokenResponse
from app.schemas.customer import CustomerRead
from app.security import create_access_token, get_current_user, hash_password, verify_password

router = APIRouter(prefix="/auth", tags=["authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(data: RegisterRequest, db: Session = Depends(get_db)):
    customer = Customer(
        name=data.name.strip(), email=str(data.email), phone=data.phone.strip(), address="",
        password_hash=hash_password(data.password), role="user", is_active=True,
    )
    db.add(customer)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(409, "Email already registered") from None
    db.refresh(customer)
    return TokenResponse(access_token=create_access_token(customer), user=CustomerRead.model_validate(customer))


@router.post("/login", response_model=TokenResponse)
def login(data: LoginRequest, db: Session = Depends(get_db)):
    customer = _verify_credentials(data, db)
    return _token_response(customer)


def _verify_credentials(data: LoginRequest, db: Session) -> Customer:
    customer = db.scalar(select(Customer).where(Customer.email == str(data.email)))
    if customer is None or not verify_password(data.password, customer.password_hash):
        raise HTTPException(401, "Invalid email or password", headers={"WWW-Authenticate": "Bearer"})
    if not customer.is_active:
        raise HTTPException(403, "Account is inactive")
    return customer


def _token_response(customer: Customer) -> TokenResponse:
    return TokenResponse(access_token=create_access_token(customer), user=CustomerRead.model_validate(customer))


@router.get("/me", response_model=CustomerRead)
def me(user: Customer = Depends(get_current_user)):
    return user


@router.post("/change-password", status_code=204)
def change_password(data: ChangePasswordRequest, user: Customer = Depends(get_current_user), db: Session = Depends(get_db)):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    db.commit()
