from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Order(Base):
    __tablename__ = "orders"
    __table_args__ = (
        CheckConstraint("total_amount >= 0", name="ck_orders_total_nonnegative"),
        CheckConstraint(
            "status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')",
            name="ck_orders_status_valid",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    customer_id: Mapped[int] = mapped_column(ForeignKey("customers.id"), index=True)
    status: Mapped[str] = mapped_column(String(30), default="pending", index=True)
    total_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    subtotal_amount: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    delivery_fee: Mapped[Decimal] = mapped_column(Numeric(10, 2), default=0)
    delivery_name: Mapped[str] = mapped_column(String(150))
    delivery_email: Mapped[str] = mapped_column(String(255))
    delivery_phone: Mapped[str] = mapped_column(String(30))
    delivery_address: Mapped[str] = mapped_column(String(500))
    delivery_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    customer: Mapped["Customer"] = relationship(back_populates="orders")
    items: Mapped[list["OrderItem"]] = relationship(back_populates="order", lazy="selectin", passive_deletes=True)
    payment: Mapped["Payment | None"] = relationship(back_populates="order", uselist=False, lazy="selectin")

