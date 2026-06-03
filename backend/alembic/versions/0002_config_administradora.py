"""configuração global e snapshot da família administradora no rateio

Revision ID: 0002_config_administradora
Revises: 0001_initial
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0002_config_administradora"
down_revision: Union[str, None] = "0001_initial"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "configuracao",
        sa.Column("chave", sa.String(), nullable=False),
        sa.Column("valor", sa.String(), nullable=False),
        sa.PrimaryKeyConstraint("chave"),
    )
    op.add_column(
        "conta_compartilhada",
        sa.Column(
            "pessoas_administradora",
            sa.Integer(),
            nullable=False,
            server_default="0",
        ),
    )
    # Remove o default do servidor: novas linhas definem o valor pela aplicação.
    op.alter_column(
        "conta_compartilhada",
        "pessoas_administradora",
        existing_type=sa.Integer(),
        existing_nullable=False,
        server_default=None,
    )


def downgrade() -> None:
    op.drop_column("conta_compartilhada", "pessoas_administradora")
    op.drop_table("configuracao")
