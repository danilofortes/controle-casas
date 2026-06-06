import uuid
from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

ParentescoMorador = Literal[
    "conjuge",
    "filho",
    "filha",
    "pai",
    "mae",
    "irmao",
    "irma",
    "neto",
    "neta",
    "outro",
]
SexoMorador = Literal["masculino", "feminino", "outro"]


class MoradorCreate(BaseModel):
    nome: str = Field(..., min_length=1)
    telefone: str | None = None
    responsavel: bool = False
    adulto: bool = True
    idade: int | None = Field(default=None, ge=0, le=130)
    parentesco: ParentescoMorador | None = None
    sexo: SexoMorador | None = None
    data_entrada: date
    data_saida: date | None = None


class MoradorUpdate(BaseModel):
    nome: str | None = Field(default=None, min_length=1)
    telefone: str | None = None
    responsavel: bool | None = None
    adulto: bool | None = None
    idade: int | None = Field(default=None, ge=0, le=130)
    parentesco: ParentescoMorador | None = None
    sexo: SexoMorador | None = None
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
    idade: int | None
    parentesco: ParentescoMorador | None
    sexo: SexoMorador | None
    data_entrada: date
    data_saida: date | None
    created_at: datetime
    updated_at: datetime
