import uuid

from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Terreno(Base, TimestampMixin):
    __tablename__ = "terreno"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    nome: Mapped[str]
    endereco: Mapped[str | None]

    casas: Mapped[list["Casa"]] = relationship(  # noqa: F821
        back_populates="terreno",
        cascade="all, delete-orphan",
    )
    contas: Mapped[list["ContaCompartilhada"]] = relationship(  # noqa: F821
        back_populates="terreno",
        cascade="all, delete-orphan",
    )
    despesas: Mapped[list["Despesa"]] = relationship(  # noqa: F821
        back_populates="terreno",
    )
