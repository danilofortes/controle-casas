import uuid
from datetime import date

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class ExtratoPagamento(Base, TimestampMixin):
    """Extrato/recibo de pagamento enviado pelo administrador para confirmação via IA."""

    __tablename__ = "extrato_pagamento"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    casa_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("casa.id", ondelete="SET NULL"), nullable=True, index=True
    )
    competencia: Mapped[str]
    nome_pagador_extrato: Mapped[str]          # nome lido pela IA no documento
    valor_centavos: Mapped[int]                # valor lido pela IA
    data_pagamento: Mapped[date | None]        # data lida pela IA
    url: Mapped[str] = mapped_column(Text)     # URL pública no Supabase Storage
    storage_path: Mapped[str | None]           # path interno para exclusão
    # "pendente" | "confirmado" | "rejeitado"
    status: Mapped[str] = mapped_column(default="pendente")
    observacao: Mapped[str | None] = mapped_column(Text, nullable=True)

    casa: Mapped["Casa | None"] = relationship(back_populates="extratos")  # noqa: F821
