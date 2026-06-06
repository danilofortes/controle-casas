"""parentesco e sexo no morador

Revision ID: 0008_morador_parentesco_sexo
Revises: 0007_documentos
Create Date: 2026-06-06
"""

from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0008_morador_parentesco_sexo"
down_revision: Union[str, None] = "0007_documentos"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "morador",
        sa.Column("parentesco", sa.String(length=32), nullable=True),
    )
    op.add_column(
        "morador",
        sa.Column("sexo", sa.String(length=16), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("morador", "sexo")
    op.drop_column("morador", "parentesco")
