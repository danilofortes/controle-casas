import uuid

from sqlalchemy import ForeignKey, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, gen_uuid


class DocumentoPdf(Base, TimestampMixin):
    __tablename__ = "documento_pdf"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    casa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("casa.id", ondelete="CASCADE"), index=True
    )
    nome: Mapped[str]
    tamanho_bytes: Mapped[int] = mapped_column(default=0)
    url: Mapped[str] = mapped_column(Text)
    storage_path: Mapped[str | None] = mapped_column(nullable=True)

    casa: Mapped["Casa"] = relationship(back_populates="pdfs")  # noqa: F821


class FotoCasa(Base, TimestampMixin):
    __tablename__ = "foto_casa"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    casa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("casa.id", ondelete="CASCADE"), index=True
    )
    legenda: Mapped[str | None]
    url: Mapped[str] = mapped_column(Text)
    storage_path: Mapped[str | None] = mapped_column(nullable=True)

    casa: Mapped["Casa"] = relationship(back_populates="fotos")  # noqa: F821


class AnotacaoDocumento(Base, TimestampMixin):
    __tablename__ = "anotacao_documento"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=gen_uuid)
    casa_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("casa.id", ondelete="CASCADE"), index=True
    )
    titulo: Mapped[str]
    texto: Mapped[str] = mapped_column(Text, default="")

    casa: Mapped["Casa"] = relationship(back_populates="anotacoes")  # noqa: F821
