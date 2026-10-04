from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.config import get_settings
from app.routers import admin, auth, cart, categories, customers, dashboard, foods, orders, reviews


settings = get_settings()
Path(settings.upload_dir).mkdir(parents=True, exist_ok=True)
app = FastAPI(title="Food Ordering API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.mount("/uploads", StaticFiles(directory=settings.upload_dir), name="uploads")
for router in (auth.router, categories.router, foods.router, customers.router, orders.router, cart.router, dashboard.router, reviews.router, admin.router):
    app.include_router(router, prefix="/api")
    app.include_router(router, include_in_schema=False)  # Preserve existing unprefixed URLs.


@app.get("/health", tags=["health"])
def health():
    return {"status": "ok"}

