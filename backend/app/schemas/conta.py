import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field

from app.domain.money import formatar_brl
from app.models.base import TipoConta
from app.schemas.common import Competencia


class ContaCreate(BaseModel):
    terreno_id: uuid.UUID
    tipo: TipoConta
    competencia: Competencia
    valor_total_centavos: int = Field(..., ge=0)
    vencimento: date
    casas_participantes: list[uuid.UUID] | None = Field(
        default=None,
        description="Casas que entram no rateio. Se omitido, usa as casas ativas do terreno.",
    )


class ContaUpdate(BaseModel):
    valor_total_centavos: int | None = Field(default=None, ge=0)
    vencimento: date | None = None
    competencia: Competencia | None = None


class RateioOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    conta_id: uuid.UUID
    casa_id: uuid.UUID
    pessoas_snapshot: int
    valor_centavos: int
    pago: bool
    pago_em: date | None

    @property
    def valor_formatado(self) -> str:  # pragma: no cover - conveniência
        return formatar_brl(self.valor_centavos)


class ContaOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    terreno_id: uuid.UUID
    tipo: TipoConta
    competencia: str
    valor_total_centavos: int
    vencimento: date
    created_at: datetime
    updated_at: datetime


class ContaDetalheOut(ContaOut):
    rateios: list[RateioOut] = []
    valor_total_formatado: str = ""

    @classmethod
    def from_conta(cls, conta) -> "ContaDetalheOut":
        base = ContaOut.model_validate(conta).model_dump()
        rateios = [RateioOut.model_validate(r) for r in conta.rateios]
        return cls(
            **base,
            rateios=rateios,
            valor_total_formatado=formatar_brl(conta.valor_total_centavos),
        )


class PagamentoUpdate(BaseModel):
    pago: bool
    pago_em: date | None = Field(
        default=None,
        description="Data do pagamento. Se 'pago=true' e omitido, usa a data de hoje.",
    )
