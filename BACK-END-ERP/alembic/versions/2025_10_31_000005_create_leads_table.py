"""create leads table

Revision ID: create_leads_0005
Revises: create_companies_0004
Create Date: 2025-10-31

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_leads_0005'
down_revision = 'create_companies_0004'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'leads',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('email', sa.String(length=255), nullable=True),
        sa.Column('phone', sa.String(length=50), nullable=True),
        sa.Column('source', sa.String(length=100), nullable=True),
        sa.Column('stage', sa.String(length=50), nullable=True),
        sa.Column('status', sa.String(length=50), nullable=True),
        sa.Column('interest_level', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('notes', postgresql.JSONB(), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column('tags', postgresql.ARRAY(sa.Text()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column('address', sa.Text(), nullable=True),
        sa.Column('city', sa.String(length=100), nullable=True),
        sa.Column('company', sa.String(length=255), nullable=True),
        sa.Column('contact', sa.String(length=255), nullable=True),
        sa.Column('owner', sa.String(length=100), nullable=True),
        sa.Column('segment', sa.String(length=100), nullable=True),
        sa.Column('activities', postgresql.JSONB(), nullable=False, server_default=sa.text("'[]'::jsonb")),
        sa.Column('client_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('clients.id', ondelete='SET NULL'), nullable=True),
        sa.Column('company_id', postgresql.UUID(as_uuid=False), sa.ForeignKey('companies.id', ondelete='SET NULL'), nullable=True),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.CheckConstraint('interest_level >= 0 AND interest_level <= 100', name='ck_leads_interest_level_0_100'),
        # Optionnel: liste fermée pour stage et status
        sa.CheckConstraint("stage IS NULL OR stage IN ('new','contacted','proposal','negotiation','won','lost')", name='ck_leads_stage_values'),
        sa.CheckConstraint("status IS NULL OR status IN ('active','archived','converti')", name='ck_leads_status_values'),
    )

    # uniques insensibles à la casse (NULL autorisé)
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS uq_leads_email_lower ON leads ((lower(email))) WHERE email IS NOT NULL")

    # index utiles
    op.create_index('idx_leads_stage', 'leads', ['stage'])
    op.create_index('idx_leads_source', 'leads', ['source'])
    op.create_index('idx_leads_interest_level', 'leads', ['interest_level'])
    # tri par date (DESC) pour listes rapides
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC)")
    # composite utile: source + created_at desc
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_source_created ON leads(source, created_at DESC)")

    # optionnel: accélérer ILIKE via trigram
    op.execute("CREATE EXTENSION IF NOT EXISTS pg_trgm")
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_name_trgm ON leads USING gin (name gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_email_trgm ON leads USING gin (email gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_phone_trgm ON leads USING gin (phone gin_trgm_ops)")
    op.execute("CREATE INDEX IF NOT EXISTS idx_leads_company_trgm ON leads USING gin (company gin_trgm_ops)")

    # trigger to auto-update updated_at
    op.execute(
        """
        CREATE OR REPLACE FUNCTION set_leads_timestamp()
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
        CREATE TRIGGER trg_leads_set_timestamp
        BEFORE UPDATE ON leads
        FOR EACH ROW
        EXECUTE PROCEDURE set_leads_timestamp();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_leads_set_timestamp ON leads")
    op.execute("DROP FUNCTION IF EXISTS set_leads_timestamp()")
    op.drop_index('idx_leads_interest_level', table_name='leads')
    op.drop_index('idx_leads_source', table_name='leads')
    op.drop_index('idx_leads_stage', table_name='leads')
    op.execute("DROP INDEX IF EXISTS uq_leads_email_lower")
    op.drop_table('leads')


