import uuid
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict


class AnalisarExtratoIn(BaseModel):
    """Payload enviado pelo frontend para análise do extrato."""
    file_data_url: str       # data URL base64 (image/png, image/jpeg, application/pdf)
    competencia: str | None = None  # YYYY-MM; usa mês atual se omitido


class ConfirmarExtratoIn(BaseModel):
    """Payload de confirmação após o admin revisar o modal."""
    file_data_url: str
    competencia: str
    casa_id: uuid.UUID
    nome_pagador_extrato: str
    valor_centavos: int
    data_pagamento: date | None = None
    aluguel_id: uuid.UUID | None = None
    rateio_ids: list[uuid.UUID] = []
    observacao: str | None = None


class ExtratoUpdateIn(BaseModel):
    """Edição manual de um extrato já registrado (todos os campos opcionais)."""
    competencia: str | None = None
    nome_pagador_extrato: str | None = None
    valor_centavos: int | None = None
    data_pagamento: date | None = None
    status: str | None = None
    observacao: str | None = None


class ExtratoOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    casa_id: uuid.UUID | None
    competencia: str
    nome_pagador_extrato: str
    valor_centavos: int
    data_pagamento: date | None
    url: str
    status: str
    observacao: str | None
    created_at: datetime


# --- Resultado da análise da IA ---

class MoradorMatch(BaseModel):
    morador_id: uuid.UUID
    morador_nome: str
    casa_id: uuid.UUID
    casa_nome: str
    confianca: float  # 0.0 a 1.0


class CobrancaPendente(BaseModel):
    tipo: str              # "ALUGUEL" | "AGUA" | "LUZ"
    id: uuid.UUID
    valor_centavos: int
    vencimento: date


class ResultadoAnalise(BaseModel):
    """Retorno do endpoint de análise — exibido no modal de confirmação."""
    nome_pagador_extraido: str
    valor_centavos: int
    data_pagamento: date | None
    confianca: float

    # Match encontrado (pode ser None se ambíguo)
    match: MoradorMatch | None
    matches_possiveis: list[MoradorMatch]  # lista quando ambíguo

    # Cobranças pendentes da casa identificada no período
    aluguel_pendente: CobrancaPendente | None
    rateios_pendentes: list[CobrancaPendente]

    # Ação sugerida pela IA
    acao: str   # "baixar_aluguel" | "baixar_tudo" | "ajuste_manual" | "ambiguo" | "sem_pendencia"
    mensagem: str  # explicação humanizada para exibir no modal
    competencia: str
