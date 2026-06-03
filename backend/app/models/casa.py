import uuid

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Casa(Base, TimestampMixin):
    __tablename__ = "casa"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    terreno_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("terreno.id", ondelete="CASCADE")
    )
    nome: Mapped[str]
    aluguel_centavos: Mapped[int] = mapped_column(default=0)
    dia_vencimento: Mapped[int] = mapped_column(default=10)
    ativo: Mapped[bool] = mapped_column(default=True)
    observacoes: Mapped[str | None]

    terreno: Mapped["Terreno"] = relationship(back_populates="casas")  # noqa: F821
    moradores: Mapped[list["Morador"]] = relationship(  # noqa: F821
        back_populates="casa",
        cascade="all, delete-orphan",
    )
    rateios: Mapped[list["RateioConta"]] = relationship(  # noqa: F821
        back_populates="casa",
        cascade="all, delete-orphan",
    )
    cobrancas: Mapped[list["CobrancaAluguel"]] = relationship(  # noqa: F821
        back_populates="casa",
        cascade="all, delete-orphan",
    )
    despesas: Mapped[list["Despesa"]] = relationship(  # noqa: F821
        back_populates="casa",
    )
