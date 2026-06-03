import uuid
from datetime import date

from pydantic import BaseModel, computed_field

from app.domain.money import formatar_brl


class CasaRelatorio(BaseModel):
    casa_id: uuid.UUID
    casa_nome: str
    aluguel_centavos: int
    agua_centavos: int
    luz_centavos: int
    total_devido_centavos: int
    total_pago_centavos: int
    em_aberto_centavos: int


class TotaisRelatorio(BaseModel):
    total_a_receber_centavos: int
    total_recebido_centavos: int
    total_em_aberto_centavos: int
    total_despesas_centavos: int


class AdministradoraItem(BaseModel):
    """Fatia da casa administradora numa conta de água/luz da competência."""

    conta_id: uuid.UUID
    tipo: str  # "AGUA" | "LUZ"
    competencia: str
    vencimento: date
    valor_centavos: int
    terreno_nome: str | None = None


class AdministradoraRelatorio(BaseModel):
    """Parte da casa administradora nas contas de água/luz da competência.

    A administradora entra na divisão por cabeça, mas não é cobrada: sua fatia
    em cada conta é ``valor_total − soma(rateios cobrados)``.
    """

    agua_centavos: int
    luz_centavos: int
    total_centavos: int
    itens: list[AdministradoraItem] = []


class RelatorioOut(BaseModel):
    competencia: str
    competencia_formatada: str
    casas: list[CasaRelatorio]
    totais: TotaisRelatorio
    administradora: AdministradoraRelatorio


class ItemPendente(BaseModel):
    tipo: str  # "ALUGUEL" | "AGUA" | "LUZ"
    casa_id: uuid.UUID | None
    casa_nome: str | None
    competencia: str
    valor_centavos: int
    vencimento: str | None
    atrasado: bool
    # Dias até o vencimento (negativo = já passou). vence_em_breve = a até 3
    # dias do vencimento e ainda não atrasado.
    dias_para_vencer: int | None = None
    vence_em_breve: bool = False
    # IDs para confirmar o recebimento direto da pendência.
    aluguel_id: uuid.UUID | None = None
    rateio_id: uuid.UUID | None = None


class DashboardOut(BaseModel):
    competencia: str
    competencia_formatada: str
    total_em_aberto_centavos: int
    qtd_itens_abertos: int
    qtd_itens_atrasados: int
    qtd_itens_proximos: int = 0
    pendencias: list[ItemPendente]


class ItemCobranca(BaseModel):
    """Cobrança de uma casa numa competência (aluguel ou rateio de conta)."""

    tipo: str  # "ALUGUEL" | "AGUA" | "LUZ"
    aluguel_id: uuid.UUID | None = None
    rateio_id: uuid.UUID | None = None
    # Conta de água/luz à qual o rateio pertence (permite excluir a conta toda).
    conta_id: uuid.UUID | None = None
    competencia: str
    valor_centavos: int
    vencimento: date
    pago: bool
    pago_em: date | None

    @computed_field
    @property
    def valor_formatado(self) -> str:
        return formatar_brl(self.valor_centavos)
