"""adiciona idade (opcional) ao morador

Revision ID: 0004_morador_idade
Revises: 0003_morador_adulto
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0004_morador_idade"
down_revision: Union[str, None] = "0003_morador_adulto"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "morador",
        sa.Column("idade", sa.Integer(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("morador", "idade")
