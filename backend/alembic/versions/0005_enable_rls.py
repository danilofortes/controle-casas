"""habilita Row Level Security (RLS) nas tabelas públicas

Revision ID: 0005_enable_rls
Revises: 0004_morador_idade
Create Date: 2026-06-03

O app FastAPI conecta como o papel dono das tabelas (postgres), que ignora o
RLS — então habilitar RLS não afeta o backend. O objetivo é bloquear a API
REST pública do Supabase (papéis anon/authenticated), que o app não usa.
Sem políticas, o acesso desses papéis fica negado (deny-all).
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0005_enable_rls"
down_revision: Union[str, None] = "0004_morador_idade"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABELAS = [
    "alembic_version",
    "terreno",
    "casa",
    "morador",
    "conta_compartilhada",
    "rateio_conta",
    "cobranca_aluguel",
    "despesa",
    "configuracao",
]


def upgrade() -> None:
    for tabela in TABELAS:
        op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    for tabela in TABELAS:
        op.execute(f"ALTER TABLE public.{tabela} DISABLE ROW LEVEL SECURITY;")
