"""habilita Row Level Security (RLS) na tabela extrato_pagamento

Revision ID: 0010_rls_extrato_pagamento
Revises: 0009_extrato_pagamento
Create Date: 2026-06-09

A migration 0009 criou public.extrato_pagamento sem habilitar RLS, gerando
alerta crítico no advisor do Supabase (tabela exposta ao PostgREST sem RLS).
Seguindo o mesmo padrão de 0005/0007: habilita RLS sem políticas (deny-all)
para anon/authenticated. O backend conecta como o papel dono (postgres), que
ignora RLS, então o app não é afetado.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0010_rls_extrato_pagamento"
down_revision: Union[str, None] = "0009_extrato_pagamento"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE public.extrato_pagamento ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    op.execute("ALTER TABLE public.extrato_pagamento DISABLE ROW LEVEL SECURITY;")
