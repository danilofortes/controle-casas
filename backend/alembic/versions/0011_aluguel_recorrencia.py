"""recorrencia_id em cobranca_aluguel

Revision ID: 0011_aluguel_recorrencia
Revises: 0010_rls_extrato_pagamento
Create Date: 2026-06-09

Cobranças de aluguel geradas em lote (recorrência) compartilham um
recorrencia_id. Isso permite propagar a alteração de valor para os meses
seguintes ainda não pagos do mesmo grupo.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0011_aluguel_recorrencia"
down_revision: Union[str, None] = "0010_rls_extrato_pagamento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "cobranca_aluguel",
        sa.Column("recorrencia_id", sa.Uuid(), nullable=True),
    )
    op.create_index(
        "ix_cobranca_aluguel_recorrencia_id",
        "cobranca_aluguel",
        ["recorrencia_id"],
    )


def downgrade() -> None:
    op.drop_index("ix_cobranca_aluguel_recorrencia_id", "cobranca_aluguel")
    op.drop_column("cobranca_aluguel", "recorrencia_id")
