import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class PdfCreate(BaseModel):
    nome: str = Field(..., min_length=1, max_length=255)
    tamanho_bytes: int = Field(default=0, ge=0)
    url: str = Field(..., min_length=1)


class PdfOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    casa_id: uuid.UUID
    nome: str
    tamanho_bytes: int
    url: str
    created_at: datetime


class FotoCreate(BaseModel):
    legenda: str | None = Field(default=None, max_length=255)
    url: str = Field(..., min_length=1)


class FotoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    casa_id: uuid.UUID
    legenda: str | None
    url: str
    created_at: datetime


class AnotacaoCreate(BaseModel):
    titulo: str = Field(..., min_length=1, max_length=255)
    texto: str = Field(default="")


class AnotacaoUpdate(BaseModel):
    titulo: str | None = Field(default=None, min_length=1, max_length=255)
    texto: str | None = None


class AnotacaoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    casa_id: uuid.UUID
    titulo: str
    texto: str
    created_at: datetime
    updated_at: datetime


class CasaDocumentosOut(BaseModel):
    casa_id: uuid.UUID
    casa_nome: str
    pdfs: list[PdfOut]
    fotos: list[FotoOut]
    anotacoes: list[AnotacaoOut]
