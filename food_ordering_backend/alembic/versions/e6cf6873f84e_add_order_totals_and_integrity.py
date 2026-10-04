"""add_order_totals_and_integrity

Revision ID: e6cf6873f84e
Revises: 40f8955fe69d
Create Date: 2026-10-01 12:03:31.567475

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'e6cf6873f84e'
down_revision: Union[str, Sequence[str], None] = '40f8955fe69d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add persisted order subtotals and business integrity constraints."""
    connection = op.get_bind()
    customers = sa.table("customers", sa.column("phone"), sa.column("address"))
    missing_contact = connection.execute(
        sa.select(sa.func.count()).select_from(customers).where(
            sa.or_(customers.c.phone.is_(None), customers.c.address.is_(None))
        )
    ).scalar_one()
    if missing_contact:
        raise RuntimeError("Fill existing customer phone and address values before upgrading")

    with op.batch_alter_table("customers") as batch:
        batch.alter_column("phone", existing_type=sa.String(30), nullable=False)
        batch.alter_column("address", existing_type=sa.String(500), nullable=False)

    with op.batch_alter_table("order_items") as batch:
        batch.add_column(sa.Column("subtotal", sa.Numeric(10, 2), nullable=True))

    items = sa.table(
        "order_items",
        sa.column("unit_price", sa.Numeric(10, 2)),
        sa.column("quantity", sa.Integer()),
        sa.column("subtotal", sa.Numeric(10, 2)),
    )
    connection.execute(items.update().values(subtotal=items.c.unit_price * items.c.quantity))
    with op.batch_alter_table("order_items") as batch:
        batch.alter_column("subtotal", existing_type=sa.Numeric(10, 2), nullable=False)
        batch.create_index("ix_order_items_food_id", ["food_id"])
        batch.create_check_constraint("ck_order_items_quantity_positive", "quantity >= 1")
        batch.create_check_constraint("ck_order_items_unit_price_nonnegative", "unit_price >= 0")
        batch.create_check_constraint("ck_order_items_subtotal_nonnegative", "subtotal >= 0")

    with op.batch_alter_table("foods") as batch:
        batch.create_check_constraint("ck_foods_price_positive", "price > 0")
    with op.batch_alter_table("orders") as batch:
        batch.create_check_constraint("ck_orders_total_nonnegative", "total_amount >= 0")
        batch.create_check_constraint(
            "ck_orders_status_valid",
            "status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')",
        )


def downgrade() -> None:
    raise RuntimeError("Downgrading would remove stored order subtotals")
