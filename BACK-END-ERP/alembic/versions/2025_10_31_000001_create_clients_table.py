"""create clients table

Revision ID: create_clients_0001
Revises: 
Create Date: 2025-10-31

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_clients_0001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'clients',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('type', sa.String(length=20), nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('company_name', sa.String(length=255), nullable=True),
        sa.Column('first_name', sa.String(length=100), nullable=True),
        sa.Column('last_name', sa.String(length=100), nullable=True),
        sa.Column('siret', sa.String(length=20), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'active'")),
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column('last_service', sa.String(length=50), nullable=True),
        sa.Column('contacts', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    # indexes
    op.create_index('idx_clients_name', 'clients', ['name'])
    op.create_index('idx_clients_status', 'clients', ['status'])
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_clients_email_lower ON clients ((lower(email))) WHERE email IS NOT NULL")
    # trigger to auto-update updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_timestamp()
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
        CREATE TRIGGER set_timestamp
        BEFORE UPDATE ON clients
        FOR EACH ROW
        EXECUTE PROCEDURE set_timestamp();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_timestamp ON clients")
    op.execute("DROP FUNCTION IF EXISTS set_timestamp()")
    op.drop_index('idx_clients_status', table_name='clients')
    op.drop_index('idx_clients_name', table_name='clients')
    op.execute("DROP INDEX IF EXISTS idx_clients_email_lower_unique")
    op.drop_table('clients')


