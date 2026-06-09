"""Propagação de valor em cobranças de aluguel recorrentes."""

from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import CobrancaAluguel


async def propagar_valor_meses_seguintes(
    session: AsyncSession,
    *,
    recorrencia_id,
    competencia_referencia: str,
    valor_centavos: int,
) -> int:
    """Atualiza cobranças não pagas do mesmo grupo com competência posterior."""
    futuras = await session.scalars(
        select(CobrancaAluguel).where(
            CobrancaAluguel.recorrencia_id == recorrencia_id,
            CobrancaAluguel.competencia > competencia_referencia,
            CobrancaAluguel.pago.is_(False),
        )
    )
    qtd = 0
    for cobranca in futuras:
        cobranca.valor_centavos = valor_centavos
        qtd += 1
    return qtd


async def propagar_valor_casa_recorrente(
    session: AsyncSession,
    *,
    casa_id,
    valor_centavos: int,
    competencia_min: str,
) -> int:
    """Atualiza cobranças recorrentes não pagas da casa a partir de uma competência."""
    pendentes = await session.scalars(
        select(CobrancaAluguel).where(
            CobrancaAluguel.casa_id == casa_id,
            CobrancaAluguel.recorrencia_id.is_not(None),
            CobrancaAluguel.pago.is_(False),
            CobrancaAluguel.competencia >= competencia_min,
        )
    )
    qtd = 0
    for cobranca in pendentes:
        cobranca.valor_centavos = valor_centavos
        qtd += 1
    return qtd
