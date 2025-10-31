"""create appointments table

Revision ID: create_appointments_0003
Revises: create_services_0002
Create Date: 2025-10-31

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_appointments_0003'
down_revision = 'create_services_0002'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'appointments',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('client_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('clients.id', ondelete='CASCADE'), nullable=False),
        sa.Column('service_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('services.id', ondelete='CASCADE'), nullable=False),
        sa.Column('start_at', sa.TIMESTAMP(timezone=True), nullable=False),
        sa.Column('end_at', sa.TIMESTAMP(timezone=True), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('notes', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    op.create_index('idx_appointments_client_id', 'appointments', ['client_id'])
    op.create_index('idx_appointments_service_id', 'appointments', ['service_id'])
    # index DESC pour tri agenda rapide
    op.execute("CREATE INDEX IF NOT EXISTS idx_appointments_start_at ON appointments(start_at DESC)")

    # trigger to auto-update updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_appointments_timestamp()
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
        CREATE TRIGGER trg_appointments_set_timestamp
        BEFORE UPDATE ON appointments
        FOR EACH ROW
        EXECUTE PROCEDURE set_appointments_timestamp();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_appointments_set_timestamp ON appointments")
    op.execute("DROP FUNCTION IF EXISTS set_appointments_timestamp()")
    op.drop_index('idx_appointments_start_at', table_name='appointments')
    op.drop_index('idx_appointments_service_id', table_name='appointments')
    op.drop_index('idx_appointments_client_id', table_name='appointments')
    op.drop_table('appointments')


