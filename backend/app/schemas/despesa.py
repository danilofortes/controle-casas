import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field, model_validator

from app.domain.money import formatar_brl
from app.models.base import CategoriaDespesa


class DespesaCreate(BaseModel):
    descricao: str = Field(..., min_length=1)
    categoria: CategoriaDespesa = CategoriaDespesa.OUTROS
    valor_centavos: int = Field(..., ge=0)
    data: date
    terreno_id: uuid.UUID | None = None
    casa_id: uuid.UUID | None = None

    @model_validator(mode="after")
    def _exige_vinculo(self) -> "DespesaCreate":
        if self.terreno_id is None and self.casa_id is None:
            raise ValueError(
                "A despesa deve estar vinculada a uma casa ou a um terreno."
            )
        return self


class DespesaUpdate(BaseModel):
    descricao: str | None = Field(default=None, min_length=1)
    categoria: CategoriaDespesa | None = None
    valor_centavos: int | None = Field(default=None, ge=0)
    data: date | None = None
    terreno_id: uuid.UUID | None = None
    casa_id: uuid.UUID | None = None


class DespesaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    terreno_id: uuid.UUID | None
    casa_id: uuid.UUID | None
    descricao: str
    categoria: CategoriaDespesa
    valor_centavos: int
    data: date
    created_at: datetime

    @computed_field
    @property
    def valor_formatado(self) -> str:
        return formatar_brl(self.valor_centavos)
