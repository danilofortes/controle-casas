import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.domain.money import formatar_brl
from app.schemas.common import Competencia


class AluguelCreate(BaseModel):
    casa_id: uuid.UUID
    competencia: Competencia
    valor_centavos: int | None = Field(
        default=None,
        ge=0,
        description="Se omitido, usa o valor de aluguel padrão da casa como sugestão.",
    )
    vencimento: date | None = Field(
        default=None,
        description="Se omitido, usa o dia de vencimento da casa na competência informada.",
    )


class AluguelUpdate(BaseModel):
    valor_centavos: int | None = Field(default=None, ge=0)
    vencimento: date | None = None


class AluguelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    casa_id: uuid.UUID
    competencia: str
    valor_centavos: int
    vencimento: date
    pago: bool
    pago_em: date | None
    created_at: datetime
    updated_at: datetime

    @computed_field
    @property
    def valor_formatado(self) -> str:
        return formatar_brl(self.valor_centavos)

    @computed_field
    @property
    def atrasado(self) -> bool:
        return (not self.pago) and self.vencimento < date.today()
