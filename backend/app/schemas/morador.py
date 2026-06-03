import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


class MoradorCreate(BaseModel):
    nome: str = Field(..., min_length=1)
    telefone: str | None = None
    responsavel: bool = False
    adulto: bool = True
    data_entrada: date
    data_saida: date | None = None


class MoradorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1)
    telefone: str | None = None
    responsavel: bool | None = None
    adulto: bool | None = None
    data_entrada: date | None = None
    data_saida: date | None = None


class MoradorOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    casa_id: uuid.UUID
    nome: str
    telefone: str | None
    responsavel: bool
    adulto: bool
    data_entrada: date
    data_saida: date | None
    created_at: datetime
    updated_at: datetime
