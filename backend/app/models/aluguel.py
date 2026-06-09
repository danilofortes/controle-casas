import uuid
from datetime import date

from sqlalchemy import ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class CobrancaAluguel(Base, TimestampMixin):
    __tablename__ = "cobranca_aluguel"
    __table_args__ = (
        UniqueConstraint("casa_id", "competencia", name="uq_cobranca_casa_competencia"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    casa_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("casa.id", ondelete="CASCADE"))
    competencia: Mapped[str]
    valor_centavos: Mapped[int]
    vencimento: Mapped[date]
    pago: Mapped[bool] = mapped_column(default=False)
    pago_em: Mapped[date | None]
    # Cobranças geradas em lote (recorrência) compartilham este id, permitindo
    # propagar a alteração de valor para os meses seguintes ainda não pagos.
    recorrencia_id: Mapped[uuid.UUID | None] = mapped_column(index=True)

    casa: Mapped["Casa"] = relationship(back_populates="cobrancas")  # noqa: F821
