import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.money import formatar_brl


class CasaCreate(BaseModel):
    terreno_id: uuid.UUID
    nome: str = Field(..., min_length=1)
    aluguel_centavos: int = Field(default=0, ge=0)
    dia_vencimento: int = Field(default=10, ge=1, le=31)
    ativo: bool = True
    observacoes: str | None = None


class CasaUpdate(BaseModel):
    terreno_id: uuid.UUID | None = None
    nome: str | None = Field(default=None, min_length=1)
    aluguel_centavos: int | None = Field(default=None, ge=0)
    dia_vencimento: int | None = Field(default=None, ge=1, le=31)
    ativo: bool | None = None
    observacoes: str | None = None


class CasaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    terreno_id: uuid.UUID
    nome: str
    aluguel_centavos: int
    dia_vencimento: int
    ativo: bool
    observacoes: str | None
    created_at: datetime
    updated_at: datetime


class CasaDetalheOut(CasaOut):
    moradores_atuais: int = 0
    aluguel_formatado: str = ""

    @classmethod
    def from_casa(cls, casa, moradores_atuais: int) -> "CasaDetalheOut":
        base = CasaOut.model_validate(casa).model_dump()
        return cls(
            **base,
            moradores_atuais=moradores_atuais,
            aluguel_formatado=formatar_brl(casa.aluguel_centavos),
        )
