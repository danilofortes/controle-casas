import uuid
from datetime import date

from sqlalchemy import ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class Morador(Base, TimestampMixin):
    __tablename__ = "morador"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    casa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("casa.id", ondelete="CASCADE")
    )
    nome: Mapped[str]
    telefone: Mapped[str | None]
    responsavel: Mapped[bool] = mapped_column(default=False)
    # Adultos respondem pelo débito da casa; crianças contam na divisão por
    # cabeça (consumo), mas nunca recebem a cobrança em seu nome.
    adulto: Mapped[bool] = mapped_column(default=True)
    idade: Mapped[int | None]
    parentesco: Mapped[str | None]
    sexo: Mapped[str | None]
    data_entrada: Mapped[date]
    data_saida: Mapped[date | None]

    casa: Mapped["Casa"] = relationship(back_populates="moradores")  # noqa: F821
