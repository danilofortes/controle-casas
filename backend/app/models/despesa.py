import uuid
from datetime import date, datetime

from sqlalchemy import (
    DateTime,
    Enum as SAEnum,
    ForeignKey,
    func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, CategoriaDespesa, gen_uuid


class Despesa(Base):
    __tablename__ = "despesa"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    terreno_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("terreno.id", ondelete="SET NULL")
    )
    casa_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("casa.id", ondelete="SET NULL")
    )
    descricao: Mapped[str]
    categoria: Mapped[CategoriaDespesa] = mapped_column(
        SAEnum(CategoriaDespesa, name="categoria_despesa"),
        default=CategoriaDespesa.OUTROS,
    )
    valor_centavos: Mapped[int]
    data: Mapped[date]
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    terreno: Mapped["Terreno | None"] = relationship(  # noqa: F821
        back_populates="despesas"
    )
    casa: Mapped["Casa | None"] = relationship(back_populates="despesas")  # noqa: F821
