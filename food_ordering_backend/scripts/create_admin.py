"""Create or promote an admin using the existing Customer account model.

The password is read from a hidden prompt or ADMIN_INITIAL_PASSWORD in the process
environment. It is never embedded in this file or printed.
"""

import argparse
import os
from getpass import getpass

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.database import SessionLocal
from app.models import Customer
from app.security import hash_password


def seed_admin(db: Session, *, email: str, name: str, phone: str, password: str) -> str:
    email = email.strip().lower()
    if not email or not name.strip() or not phone.strip() or len(password) < 8:
        raise ValueError("Email, name, phone, and a password of at least 8 characters are required")

    existing = db.scalar(select(Customer).where(Customer.email == email))
    if existing is not None and existing.role == "admin":
        return "already_exists"

    if existing is None:
        db.add(Customer(
            email=email, name=name.strip(), phone=phone.strip(), address="",
            role="admin", is_active=True, password_hash=hash_password(password),
        ))
        result = "created"
    else:
        # Promotion is allowed only through this explicit setup command.
        existing.role = "admin"
        existing.is_active = True
        existing.password_hash = hash_password(password)
        result = "promoted"

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise RuntimeError("Admin account could not be saved; check the email and try again") from None
    return result


def main() -> None:
    parser = argparse.ArgumentParser(description="Create or promote an administrator account")
    parser.add_argument("--email", help="Admin email; prompted if omitted")
    parser.add_argument("--name", help="Admin display name; prompted if omitted")
    parser.add_argument("--phone", help="Admin phone; prompted if omitted")
    args = parser.parse_args()

    email = args.email or input("Admin email: ")
    name = args.name or input("Admin name: ")
    phone = args.phone or input("Phone: ")
    with SessionLocal() as db:
        existing = db.scalar(select(Customer).where(Customer.email == email.strip().lower()))
        if existing is not None and existing.role == "admin":
            print("Admin account already exists; no changes made.")
            return

    password = os.environ.get("ADMIN_INITIAL_PASSWORD") or getpass("Admin password (at least 8 characters): ")

    with SessionLocal() as db:
        result = seed_admin(db, email=email, name=name, phone=phone, password=password)
    print({
        "created": "Admin account created.",
        "promoted": "Existing account promoted to admin.",
        "already_exists": "Admin account already exists; no changes made.",
    }[result])


if __name__ == "__main__":
    main()
