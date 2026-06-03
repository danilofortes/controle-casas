from sqlalchemy.orm import Mapped, mapped_column

from app.models.base import Base


class Configuracao(Base):
    """Armazena preferências globais do sistema como pares chave/valor."""

    __tablename__ = "configuracao"

    chave: Mapped[str] = mapped_column(primary_key=True)
    valor: Mapped[str]
