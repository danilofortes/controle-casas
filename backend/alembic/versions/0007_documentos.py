"""tabelas de documentos por casa (PDF, foto, anotação)

Revision ID: 0007_documentos
Revises: 0006_cascade_deletes
Create Date: 2026-06-05

Arquivos binários vão para Supabase Storage (quando configurado). Metadados e
URL pública ficam no Postgres. Anotações são só texto.
"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0007_documentos"
down_revision: Union[str, None] = "0006_cascade_deletes"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

TABELAS_RLS = ["documento_pdf", "foto_casa", "anotacao_documento"]


def upgrade() -> None:
    op.create_table(
        "documento_pdf",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(length=255), nullable=False),
        sa.Column("tamanho_bytes", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["casa_id"], ["casa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_documento_pdf_casa_id", "documento_pdf", ["casa_id"])

    op.create_table(
        "foto_casa",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=False),
        sa.Column("legenda", sa.String(length=255), nullable=True),
        sa.Column("url", sa.Text(), nullable=False),
        sa.Column("storage_path", sa.String(length=512), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["casa_id"], ["casa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_foto_casa_casa_id", "foto_casa", ["casa_id"])

    op.create_table(
        "anotacao_documento",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=False),
        sa.Column("titulo", sa.String(length=255), nullable=False),
        sa.Column("texto", sa.Text(), nullable=False, server_default=""),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column(
            "updated_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["casa_id"], ["casa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_anotacao_documento_casa_id", "anotacao_documento", ["casa_id"])

    for tabela in TABELAS_RLS:
        op.execute(f"ALTER TABLE public.{tabela} ENABLE ROW LEVEL SECURITY;")


def downgrade() -> None:
    for tabela in reversed(TABELAS_RLS):
        op.execute(f"ALTER TABLE public.{tabela} DISABLE ROW LEVEL SECURITY;")
    op.drop_index("ix_anotacao_documento_casa_id", table_name="anotacao_documento")
    op.drop_table("anotacao_documento")
    op.drop_index("ix_foto_casa_casa_id", table_name="foto_casa")
    op.drop_table("foto_casa")
    op.drop_index("ix_documento_pdf_casa_id", table_name="documento_pdf")
    op.drop_table("documento_pdf")
