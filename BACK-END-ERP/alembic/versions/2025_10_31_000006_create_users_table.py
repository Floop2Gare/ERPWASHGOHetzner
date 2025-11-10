"""create users table

Revision ID: create_users_0006
Revises: 2025_10_31_000005_create_leads_table
Create Date: 2025-01-27

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision = 'create_users_0006'
down_revision = 'create_leads_0005'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'auth_users',
        sa.Column('id', postgresql.UUID(as_uuid=False), primary_key=True),
        sa.Column('username', sa.String(length=100), nullable=False, unique=True),
        sa.Column('full_name', sa.String(length=255), nullable=True),
        sa.Column('password_hash', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=50), nullable=False),
        sa.Column('pages', postgresql.ARRAY(sa.String()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column('permissions', postgresql.ARRAY(sa.String()), nullable=False, server_default=sa.text("'{}'::text[]")),
        sa.Column('active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.TIMESTAMP(timezone=True), nullable=False, server_default=sa.text('now()')),
    )
    # Indexes
    op.create_index('idx_auth_users_username', 'auth_users', ['username'], unique=True)
    op.create_index('idx_auth_users_role', 'auth_users', ['role'])
    op.create_index('idx_auth_users_active', 'auth_users', ['active'])
    # Trigger pour auto-update updated_at
    op.execute(
        """
        CREATE TRIGGER set_timestamp_auth_users
        BEFORE UPDATE ON auth_users
        FOR EACH ROW
        EXECUTE PROCEDURE set_timestamp();
        """
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS set_timestamp_auth_users ON auth_users")
    op.drop_index('idx_auth_users_active', table_name='auth_users')
    op.drop_index('idx_auth_users_role', table_name='auth_users')
    op.drop_index('idx_auth_users_username', table_name='auth_users')
    op.drop_table('auth_users')

