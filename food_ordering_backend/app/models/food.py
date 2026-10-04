from decimal import Decimal

from sqlalchemy import Boolean, CheckConstraint, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Food(Base):
    __tablename__ = "foods"
    __table_args__ = (CheckConstraint("price > 0", name="ck_foods_price_positive"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    category_id: Mapped[int] = mapped_column(ForeignKey("categories.id"), index=True)
    name: Mapped[str] = mapped_column(String(150), index=True)
    description: Mapped[str | None] = mapped_column(String(1000), nullable=True)
    ingredients: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(10, 2))
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    is_available: Mapped[bool] = mapped_column(Boolean, default=True)
    category: Mapped["Category"] = relationship(back_populates="foods")
    order_items: Mapped[list["OrderItem"]] = relationship(back_populates="food")
    nutrition: Mapped["Nutrition | None"] = relationship(back_populates="food", uselist=False)
    reviews: Mapped[list["Review"]] = relationship(back_populates="food", lazy="selectin")

    @property
    def review_count(self) -> int:
        return len(self.reviews)

    @property
    def average_rating(self) -> Decimal | None:
        if not self.reviews:
            return None
        return (sum(Decimal(review.rating) for review in self.reviews) / len(self.reviews)).quantize(Decimal("0.1"))

