import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import DateTime, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column


class Base(DeclarativeBase):
    pass


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )


def gen_uuid() -> uuid.UUID:
    return uuid.uuid4()


class TipoConta(str, Enum):
    AGUA = "AGUA"
    LUZ = "LUZ"


class CategoriaDespesa(str, Enum):
    MANUTENCAO = "MANUTENCAO"
    REPARO = "REPARO"
    IMPOSTO = "IMPOSTO"
    OUTROS = "OUTROS"
