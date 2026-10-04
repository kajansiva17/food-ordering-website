import hashlib
import hmac
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Customer

bearer = HTTPBearer(auto_error=False)
HASH_ITERATIONS = 600_000


def hash_password(password: str) -> str:
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode(), salt, HASH_ITERATIONS)
    return f"pbkdf2_sha256${HASH_ITERATIONS}${salt.hex()}${digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        method, iterations, salt, expected = stored.split("$")
        if method != "pbkdf2_sha256":
            return False
        actual = hashlib.pbkdf2_hmac("sha256", password.encode(), bytes.fromhex(salt), int(iterations))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (ValueError, AttributeError):
        return False


def create_access_token(customer: Customer) -> str:
    settings = get_settings()
    expires = datetime.now(timezone.utc) + timedelta(minutes=settings.access_token_expire_minutes)
    return jwt.encode({"sub": str(customer.id), "exp": expires}, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer),
    db: Session = Depends(get_db),
) -> Customer:
    if credentials is None:
        raise HTTPException(401, "Authentication required", headers={"WWW-Authenticate": "Bearer"})
    try:
        settings = get_settings()
        payload = jwt.decode(credentials.credentials, settings.secret_key, algorithms=[settings.algorithm])
        customer_id = int(payload["sub"])
    except (jwt.PyJWTError, KeyError, TypeError, ValueError):
        raise HTTPException(401, "Invalid or expired token") from None
    customer = db.get(Customer, customer_id)
    if customer is None or not customer.is_active:
        raise HTTPException(401, "Account is unavailable")
    return customer


def require_admin(user: Customer = Depends(get_current_user)) -> Customer:
    if user.role != "admin":
        raise HTTPException(403, "Admin access required")
    return user


def require_owner_or_admin(customer_id: int, user: Customer = Depends(get_current_user)) -> Customer:
    if user.role != "admin" and user.id != customer_id:
        raise HTTPException(404, "Customer not found")
    return user
