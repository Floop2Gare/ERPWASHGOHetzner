"""create companies table

Revision ID: create_companies_0004
Revises: create_appointments_0003
Create Date: 2025-10-31

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_companies_0004'
down_revision = 'create_appointments_0003'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'companies',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('siret', sa.String(length=20), nullable=True),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('status', sa.String(length=20), nullable=False, server_default=sa.text("'active'")),
        sa.Column('notes', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column('postal_code', sa.String(length=10), nullable=True),
        sa.Column('vat_number', sa.String(length=20), nullable=True),
        sa.Column('legal_notes', sa.Text(), nullable=True),
        sa.Column('vat_enabled', sa.Boolean(), nullable=True),
        sa.Column('website', sa.String(length=255), nullable=True),
        sa.Column('is_default', sa.Boolean(), nullable=True),
        sa.Column('document_header_title', sa.String(length=255), nullable=True),
        sa.Column('logo_url', sa.Text(), nullable=True),
        sa.Column('invoice_logo_url', sa.Text(), nullable=True),
        sa.Column('bank_name', sa.String(length=255), nullable=True),
        sa.Column('bank_address', sa.Text(), nullable=True),
        sa.Column('iban', sa.String(length=34), nullable=True),
        sa.Column('bic', sa.String(length=11), nullable=True),
        sa.Column('planning_user', sa.String(length=100), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('clients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )

    # unique, case-insensitive (NULL autorisé)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_name_lower ON companies ((lower(name))) WHERE name IS NOT NULL")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_email_lower ON companies ((lower(email))) WHERE email IS NOT NULL")

    # trigger to auto-update updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_companies_timestamp()
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
        CREATE TRIGGER trg_companies_set_timestamp
        BEFORE UPDATE ON companies
        FOR EACH ROW
        EXECUTE PROCEDURE set_companies_timestamp();
        """
    )

    # index pratiques
    op.execute("CREATE INDEX IF NOT EXISTS idx_companies_city ON companies(city)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_companies_status ON companies(status)")


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_companies_set_timestamp ON companies")
    op.execute("DROP FUNCTION IF EXISTS set_companies_timestamp()")
    op.execute("DROP INDEX IF EXISTS uq_companies_email_lower")
    op.execute("DROP INDEX IF EXISTS uq_companies_name_lower")
    op.drop_table('companies')


