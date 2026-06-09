"""extrato_pagamento

Revision ID: 0009
Revises: 0008
Create Date: 2025-06-09
"""
from alembic import op
import sqlalchemy as sa

revision = "0009_extrato_pagamento"
down_revision = "0008_morador_parentesco_sexo"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "extrato_pagamento",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=True),
        sa.Column("competencia", sa.String(), nullable=False),
        sa.Column("nome_pagador_extrato", sa.String(), nullable=False),
        sa.Column("valor_centavos", sa.Integer(), nullable=False),
        sa.Column("data_pagamento", sa.Date(), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.String(), nullable=True),
        sa.Column("status", sa.String(), nullable=False, server_default="pendente"),
        sa.Column("observacao", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["casa_id"], ["casa.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_extrato_pagamento_casa_id", "extrato_pagamento", ["casa_id"])


def downgrade() -> None:
    op.drop_index("ix_extrato_pagamento_casa_id", "extrato_pagamento")
    op.drop_table("extrato_pagamento")
