import uuid
from datetime import date

from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, TipoConta, gen_uuid


class ContaCompartilhada(Base, TimestampMixin):
    __tablename__ = "conta_compartilhada"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    terreno_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("terreno.id", ondelete="CASCADE")
    )
    tipo: Mapped[TipoConta] = mapped_column(
        SAEnum(TipoConta, name="tipo_conta")
    )
    competencia: Mapped[str]
    valor_total_centavos: Mapped[int]
    vencimento: Mapped[date]

    terreno: Mapped["Terreno"] = relationship(back_populates="contas")  # noqa: F821
    rateios: Mapped[list["RateioConta"]] = relationship(
        back_populates="conta",
        cascade="all, delete-orphan",
    )


class RateioConta(Base):
    __tablename__ = "rateio_conta"
    __table_args__ = (
        UniqueConstraint("conta_id", "casa_id", name="uq_rateio_conta_casa"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    conta_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conta_compartilhada.id", ondelete="CASCADE")
    )
    casa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("casa.id", ondelete="CASCADE"))
    pessoas_snapshot: Mapped[int]
    valor_centavos: Mapped[int]
    pago: Mapped[bool] = mapped_column(default=False)
    pago_em: Mapped[date | None]

    conta: Mapped["ContaCompartilhada"] = relationship(back_populates="rateios")
    casa: Mapped["Casa"] = relationship(back_populates="rateios")  # noqa: F821
