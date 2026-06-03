import uuid

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select

from app.deps import SessionDep, UsuarioDep
from app.domain.competencia import CompetenciaInvalida, validar_competencia
from app.models import (
    Casa,
    CobrancaAluguel,
    ContaCompartilhada,
    RateioConta,
    Terreno,
)
from app.models.base import TipoConta
from app.schemas.casa import CasaCreate, CasaDetalheOut, CasaOut, CasaUpdate
from app.schemas.relatorio import ItemCobranca
from app.services.moradores import contar_moradores_atuais

router = APIRouter(prefix="/casas", tags=["casas"])


async def _get_or_404(session, casa_id: uuid.UUID) -> Casa:
    casa = await session.get(Casa, casa_id)
    if casa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")
    return casa


async def _validar_terreno(session, terreno_id: uuid.UUID) -> None:
    if await session.get(Terreno, terreno_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Terreno não encontrado.")


@router.get("", response_model=list[CasaOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    terreno_id: uuid.UUID | None = None,
) -> list[Casa]:
    stmt = select(Casa).order_by(Casa.nome)
    if terreno_id is not None:
        stmt = stmt.where(Casa.terreno_id == terreno_id)
    return list(await session.scalars(stmt))


@router.post("", response_model=CasaOut, status_code=status.HTTP_201_CREATED)
async def criar(dados: CasaCreate, session: SessionDep, _: UsuarioDep) -> Casa:
    await _validar_terreno(session, dados.terreno_id)
    casa = Casa(**dados.model_dump())
    session.add(casa)
    await session.commit()
    await session.refresh(casa)
    return casa


@router.get("/{casa_id}", response_model=CasaDetalheOut)
async def detalhe(
    casa_id: uuid.UUID, session: SessionDep, _: UsuarioDep
) -> CasaDetalheOut:
    casa = await _get_or_404(session, casa_id)
    qtd = await contar_moradores_atuais(session, casa_id)
    return CasaDetalheOut.from_casa(casa, qtd)


@router.get("/{casa_id}/cobrancas", response_model=list[ItemCobranca])
async def cobrancas(
    casa_id: uuid.UUID,
    session: SessionDep,
    _: UsuarioDep,
    competencia: str = Query(..., description="Competência YYYY-MM"),
) -> list[ItemCobranca]:
    await _get_or_404(session, casa_id)
    try:
        competencia = validar_competencia(competencia)
    except CompetenciaInvalida as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    itens: list[ItemCobranca] = []

    aluguel = await session.scalar(
        select(CobrancaAluguel).where(
            CobrancaAluguel.casa_id == casa_id,
            CobrancaAluguel.competencia == competencia,
        )
    )
    if aluguel is not None:
        itens.append(
            ItemCobranca(
                tipo="ALUGUEL",
                aluguel_id=aluguel.id,
                competencia=competencia,
                valor_centavos=aluguel.valor_centavos,
                vencimento=aluguel.vencimento,
                pago=aluguel.pago,
                pago_em=aluguel.pago_em,
            )
        )

    stmt = (
        select(RateioConta, ContaCompartilhada)
        .join(ContaCompartilhada, RateioConta.conta_id == ContaCompartilhada.id)
        .where(
            RateioConta.casa_id == casa_id,
            ContaCompartilhada.competencia == competencia,
        )
        .order_by(ContaCompartilhada.tipo)
    )
    for rateio, conta in (await session.execute(stmt)).all():
        tipo = "AGUA" if conta.tipo == TipoConta.AGUA else "LUZ"
        itens.append(
            ItemCobranca(
                tipo=tipo,
                rateio_id=rateio.id,
                competencia=competencia,
                valor_centavos=rateio.valor_centavos,
                vencimento=conta.vencimento,
                pago=rateio.pago,
                pago_em=rateio.pago_em,
            )
        )

    return itens


@router.put("/{casa_id}", response_model=CasaOut)
async def editar(
    casa_id: uuid.UUID, dados: CasaUpdate, session: SessionDep, _: UsuarioDep
) -> Casa:
    casa = await _get_or_404(session, casa_id)
    payload = dados.model_dump(exclude_unset=True)
    if "terreno_id" in payload and payload["terreno_id"] is not None:
        await _validar_terreno(session, payload["terreno_id"])
    for campo, valor in payload.items():
        setattr(casa, campo, valor)
    await session.commit()
    await session.refresh(casa)
    return casa


@router.delete("/{casa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(casa_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    casa = await _get_or_404(session, casa_id)
    await session.delete(casa)
    await session.commit()
