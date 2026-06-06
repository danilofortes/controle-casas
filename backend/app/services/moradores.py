"""Consultas auxiliares sobre moradores (cabeças atuais)."""

import uuid
from datetime import date

from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Morador


def _filtro_atuais(referencia: date):
    return or_(Morador.data_saida.is_(None), Morador.data_saida > referencia)


async def contar_moradores_atuais(
    session: AsyncSession, casa_id: uuid.UUID, referencia: date | None = None
) -> int:
    """Conta cabeças atuais de uma casa: moradores sem saída (ou com saída futura)."""
    ref = referencia or date.today()
    stmt = select(func.count(Morador.id)).where(
        Morador.casa_id == casa_id, _filtro_atuais(ref)
    )
    return int((await session.scalar(stmt)) or 0)


async def mapa_primeiro_adulto_nome(
    session: AsyncSession, casa_ids: list[uuid.UUID], referencia: date | None = None
) -> dict[uuid.UUID, str]:
    """Primeiro adulto atual por casa (responsável primeiro, depois nome)."""
    if not casa_ids:
        return {}
    ref = referencia or date.today()
    stmt = (
        select(Morador.casa_id, Morador.nome)
        .where(
            Morador.casa_id.in_(casa_ids),
            Morador.adulto.is_(True),
            _filtro_atuais(ref),
        )
        .order_by(Morador.responsavel.desc(), Morador.nome)
    )
    resultado: dict[uuid.UUID, str] = {}
    for casa_id, nome in (await session.execute(stmt)).all():
        if casa_id not in resultado:
            resultado[casa_id] = nome
    return resultado


async def mapa_moradores_atuais(
    session: AsyncSession, casa_ids: list[uuid.UUID], referencia: date | None = None
) -> dict[uuid.UUID, int]:
    """Mapeia casa_id -> nº de cabeças atuais para um conjunto de casas."""
    if not casa_ids:
        return {}
    ref = referencia or date.today()
    stmt = (
        select(Morador.casa_id, func.count(Morador.id))
        .where(Morador.casa_id.in_(casa_ids), _filtro_atuais(ref))
        .group_by(Morador.casa_id)
    )
    resultado = {cid: 0 for cid in casa_ids}
    for casa_id, qtd in (await session.execute(stmt)).all():
        resultado[casa_id] = int(qtd)
    return resultado
