import os
from pathlib import Path
from uuid import uuid4

os.environ["DATABASE_URL"] = "sqlite://"  # Prevent test imports from using the development database.

import pytest
from alembic import command
from alembic.config import Config
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.config import get_settings
from app.database import get_db
from app.main import app
from app.models import Customer
from app.security import create_access_token, hash_password


@pytest.fixture
def client(monkeypatch):
    project_root = Path(__file__).resolve().parents[1]
    monkeypatch.chdir(project_root)
    database_path = project_root / f"test_{uuid4().hex}.db"
    database_url = f"sqlite:///./{database_path.name}"
    monkeypatch.setenv("DATABASE_URL", database_url)
    get_settings.cache_clear()
    command.upgrade(Config(str(project_root / "alembic.ini")), "head")
    engine = create_engine(database_url, connect_args={"check_same_thread": False})
    testing_session = sessionmaker(bind=engine, expire_on_commit=False)
    with testing_session() as db:
        admin = Customer(
            name="Admin", email="admin@example.com", phone="1234567", address="Office",
            password_hash=hash_password("AdminPass123"), role="admin", is_active=True,
        )
        db.add(admin)
        db.commit()
        admin_token = create_access_token(admin)

    def override_db():
        with testing_session() as db:
            yield db

    app.dependency_overrides[get_db] = override_db
    try:
        with TestClient(app) as test_client:
            test_client.headers["Authorization"] = f"Bearer {admin_token}"
            yield test_client
    finally:
        app.dependency_overrides.clear()
        engine.dispose()
        get_settings.cache_clear()
        database_path.unlink(missing_ok=True)
