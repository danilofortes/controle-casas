import uuid

from pydantic import BaseModel


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


class RelatorioOut(BaseModel):
    competencia: str
    competencia_formatada: str
    casas: list[CasaRelatorio]
    totais: TotaisRelatorio


class ItemPendente(BaseModel):
    tipo: str  # "ALUGUEL" | "AGUA" | "LUZ"
    casa_id: uuid.UUID | None
    casa_nome: str | None
    competencia: str
    valor_centavos: int
    vencimento: str | None
    atrasado: bool


class DashboardOut(BaseModel):
    competencia: str
    competencia_formatada: str
    total_em_aberto_centavos: int
    qtd_itens_abertos: int
    qtd_itens_atrasados: int
    pendencias: list[ItemPendente]
