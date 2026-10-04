from decimal import Decimal

from sqlalchemy import ForeignKey, Numeric
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Nutrition(Base):
    __tablename__ = "nutrition"

    id: Mapped[int] = mapped_column(primary_key=True)
    food_id: Mapped[int] = mapped_column(ForeignKey("foods.id"), unique=True, index=True)
    calories: Mapped[int | None]
    protein: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    carbohydrates: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    fat: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    fiber: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    sugar: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    sodium: Mapped[Decimal | None] = mapped_column(Numeric(8, 2))
    food: Mapped["Food"] = relationship(back_populates="nutrition")
