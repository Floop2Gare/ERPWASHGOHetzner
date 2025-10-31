"""create services table

Revision ID: create_services_0002
Revises: create_clients_0001
Create Date: 2025-10-31

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_services_0002'
down_revision = 'create_clients_0001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'services',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('category', sa.String(length=100), nullable=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('base_price', sa.Numeric(10, 2), nullable=False, server_default=sa.text('0')),
        sa.Column('base_duration', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('options', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint('base_price >= 0', name='ck_services_base_price_nonneg'),
        sa.CheckConstraint('base_duration >= 0', name='ck_services_base_duration_nonneg'),
    )

    op.create_index('idx_services_name', 'services', ['name'])
    op.create_index('idx_services_active', 'services', ['active'])
    op.create_index('idx_services_category', 'services', ['category'])
    # unicité optionnelle sur le nom (insensible à la casse). NULL autorisé
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_services_name_lower ON services ((lower(name))) WHERE name IS NOT NULL")

    # trigger to auto-update updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_services_timestamp()
        RETURNS TRIGGER AS $$
        BEGIN
            NEW.updated_at = now();
            RETURN NEW;
        END;
        $$ LANGUAGE plpgsql;
        """
    )
    op.execute(
        """
        CREATE TRIGGER trg_services_set_timestamp
        BEFORE UPDATE ON services
        FOR EACH ROW
        EXECUTE PROCEDURE set_services_timestamp();
        """
    )

    # optional: pg_trgm for faster ILIKE search on name
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE INDEX IF NOT EXISTS idx_services_name_trgm ON services USING gin (name gin_trgm_ops)")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_services_set_timestamp ON services")
    op.execute("DROP FUNCTION IF EXISTS set_services_timestamp()")
    op.execute("DROP INDEX IF EXISTS uq_services_name_lower")
    op.drop_index('idx_services_category', table_name='services')
    op.drop_index('idx_services_active', table_name='services')
    op.drop_index('idx_services_name', table_name='services')
    op.drop_table('services')


