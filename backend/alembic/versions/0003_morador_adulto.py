"""distingue morador adulto (responde pelo débito) de criança

Revision ID: 0003_morador_adulto
Revises: 0002_config_administradora
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0003_morador_adulto"
down_revision: Union[str, None] = "0002_config_administradora"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "morador",
        sa.Column("adulto", sa.Boolean(), nullable=False, server_default=sa.true()),
    )
    op.alter_column(
        "morador",
        "adulto",
        existing_type=sa.Boolean(),
        existing_nullable=False,
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("morador", "adulto")
