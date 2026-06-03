import uuid

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Terreno(Base, TimestampMixin):
    __tablename__ = "terreno"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    nome: Mapped[str]
    endereco: Mapped[str | None]

    # passive_deletes=True: deixa o banco resolver a cascata via ON DELETE das
    # FKs, evitando lazy-load dos filhos no contexto async (MissingGreenlet).
    casas: Mapped[list["Casa"]] = relationship(  # noqa: F821
        back_populates="terreno",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    contas: Mapped[list["ContaCompartilhada"]] = relationship(  # noqa: F821
        back_populates="terreno",
        cascade="all, delete-orphan",
        passive_deletes=True,
    )
    # Despesa tem FK terreno_id ON DELETE SET NULL: ao excluir o terreno o banco
    # apenas zera o vínculo (a despesa permanece). passive_deletes evita o
    # lazy-load para esse SET NULL.
    despesas: Mapped[list["Despesa"]] = relationship(  # noqa: F821
        back_populates="terreno",
        passive_deletes=True,
    )
