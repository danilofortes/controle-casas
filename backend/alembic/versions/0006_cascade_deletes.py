"""cascata de exclusão: despesa.casa_id passa a ON DELETE CASCADE

Revision ID: 0006_cascade_deletes
Revises: 0005_enable_rls
Create Date: 2026-06-03

Contexto
--------
As exclusões em cascata pelo app dependem de dois pontos:

1. ORM (já tratado nos modelos): as relationships do "pai" usam
   ``passive_deletes=True``, então o SQLAlchemy NÃO tenta carregar os filhos
   por lazy-load durante ``session.delete(parent)`` (o que, em modo async,
   quebra com ``MissingGreenlet``). Quem resolve a cascata é o próprio banco.

2. Banco (FKs ON DELETE): as FKs dos filhos precisam ter ``ondelete`` correto.
   No schema inicial (0001) já estavam como ``CASCADE``:
       - casa.terreno_id                 -> terreno.id   CASCADE
       - morador.casa_id                 -> casa.id      CASCADE
       - conta_compartilhada.terreno_id  -> terreno.id   CASCADE
       - rateio_conta.conta_id           -> conta.id     CASCADE
       - rateio_conta.casa_id            -> casa.id       CASCADE
       - cobranca_aluguel.casa_id        -> casa.id       CASCADE
   A ÚNICA exceção era ``despesa.casa_id``, que estava como ``SET NULL``.

Esta migration altera ``despesa.casa_id`` para ``ON DELETE CASCADE``, de modo
que excluir uma casa também remova suas despesas (comportamento esperado).
A FK ``despesa.terreno_id`` permanece ``SET NULL`` de propósito: ao excluir um
terreno, despesas ligadas só à casa já caem em cascata, e despesas ligadas só
ao terreno têm o vínculo zerado em vez de sumirem.

O nome da constraint segue o padrão automático do Postgres: ``despesa_casa_id_fkey``.
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0006_cascade_deletes"
down_revision: Union[str, None] = "0005_enable_rls"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

_CONSTRAINT = "despesa_casa_id_fkey"


def upgrade() -> None:
    op.drop_constraint(_CONSTRAINT, "despesa", type_="foreignkey")
    op.create_foreign_key(
        _CONSTRAINT,
        "despesa",
        "casa",
        ["casa_id"],
        ["id"],
        ondelete="CASCADE",
    )


def downgrade() -> None:
    op.drop_constraint(_CONSTRAINT, "despesa", type_="foreignkey")
    op.create_foreign_key(
        _CONSTRAINT,
        "despesa",
        "casa",
        ["casa_id"],
        ["id"],
        ondelete="SET NULL",
    )
