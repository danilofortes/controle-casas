"""schema inicial

Revision ID: 0001_initial
Revises:
Create Date: 2026-06-03

"""
from typing import Sequence, Union

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

tipo_conta = sa.Enum("AGUA", "LUZ", name="tipo_conta")
categoria_despesa = sa.Enum(
    "MANUTENCAO", "REPARO", "IMPOSTO", "OUTROS", name="categoria_despesa"
)


def upgrade() -> None:
    op.create_table(
        "terreno",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("endereco", sa.String(), nullable=True),
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
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "casa",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("terreno_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("aluguel_centavos", sa.Integer(), nullable=False),
        sa.Column("dia_vencimento", sa.Integer(), nullable=False),
        sa.Column("ativo", sa.Boolean(), nullable=False),
        sa.Column("observacoes", sa.String(), nullable=True),
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
        sa.ForeignKeyConstraint(["terreno_id"], ["terreno.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "morador",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=False),
        sa.Column("nome", sa.String(), nullable=False),
        sa.Column("telefone", sa.String(), nullable=True),
        sa.Column("responsavel", sa.Boolean(), nullable=False),
        sa.Column("data_entrada", sa.Date(), nullable=False),
        sa.Column("data_saida", sa.Date(), nullable=True),
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

    op.create_table(
        "conta_compartilhada",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("terreno_id", sa.Uuid(), nullable=False),
        sa.Column("tipo", tipo_conta, nullable=False),
        sa.Column("competencia", sa.String(), nullable=False),
        sa.Column("valor_total_centavos", sa.Integer(), nullable=False),
        sa.Column("vencimento", sa.Date(), nullable=False),
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
        sa.ForeignKeyConstraint(["terreno_id"], ["terreno.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )

    op.create_table(
        "rateio_conta",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("conta_id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=False),
        sa.Column("pessoas_snapshot", sa.Integer(), nullable=False),
        sa.Column("valor_centavos", sa.Integer(), nullable=False),
        sa.Column("pago", sa.Boolean(), nullable=False),
        sa.Column("pago_em", sa.Date(), nullable=True),
        sa.ForeignKeyConstraint(
            ["conta_id"], ["conta_compartilhada.id"], ondelete="CASCADE"
        ),
        sa.ForeignKeyConstraint(["casa_id"], ["casa.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("conta_id", "casa_id", name="uq_rateio_conta_casa"),
    )

    op.create_table(
        "cobranca_aluguel",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("casa_id", sa.Uuid(), nullable=False),
        sa.Column("competencia", sa.String(), nullable=False),
        sa.Column("valor_centavos", sa.Integer(), nullable=False),
        sa.Column("vencimento", sa.Date(), nullable=False),
        sa.Column("pago", sa.Boolean(), nullable=False),
        sa.Column("pago_em", sa.Date(), nullable=True),
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
        sa.UniqueConstraint(
            "casa_id", "competencia", name="uq_cobranca_casa_competencia"
        ),
    )

    op.create_table(
        "despesa",
        sa.Column("id", sa.Uuid(), nullable=False),
        sa.Column("terreno_id", sa.Uuid(), nullable=True),
        sa.Column("casa_id", sa.Uuid(), nullable=True),
        sa.Column("descricao", sa.String(), nullable=False),
        sa.Column("categoria", categoria_despesa, nullable=False),
        sa.Column("valor_centavos", sa.Integer(), nullable=False),
        sa.Column("data", sa.Date(), nullable=False),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["terreno_id"], ["terreno.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["casa_id"], ["casa.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade() -> None:
    op.drop_table("despesa")
    op.drop_table("cobranca_aluguel")
    op.drop_table("rateio_conta")
    op.drop_table("conta_compartilhada")
    op.drop_table("morador")
    op.drop_table("casa")
    op.drop_table("terreno")
    categoria_despesa.drop(op.get_bind(), checkfirst=True)
    tipo_conta.drop(op.get_bind(), checkfirst=True)
