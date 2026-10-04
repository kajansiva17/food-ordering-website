from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.crud.dashboard import get_summary
from app.database import get_db
from app.schemas.dashboard import DashboardSummary
from app.security import require_admin
from app.models import Customer

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/", response_model=DashboardSummary)
def dashboard(db: Session = Depends(get_db), _: Customer = Depends(require_admin)):
    return get_summary(db)

