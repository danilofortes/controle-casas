import uuid

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.deps import SessionDep, UsuarioDep
from app.domain.rateio import CasaParticipante, RateioInvalido, calcular_rateio
from app.models import Casa, ContaCompartilhada, RateioConta, Terreno
from app.schemas.conta import (
    ContaCreate,
    ContaDetalheOut,
    ContaOut,
    ContaUpdate,
)
from app.services.moradores import mapa_moradores_atuais

router = APIRouter(prefix="/contas", tags=["contas"])


async def _conta_or_404(session: AsyncSession, conta_id: uuid.UUID) -> ContaCompartilhada:
    stmt = (
        select(ContaCompartilhada)
        .where(ContaCompartilhada.id == conta_id)
        .options(selectinload(ContaCompartilhada.rateios))
    )
    conta = await session.scalar(stmt)
    if conta is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Conta não encontrada.")
    return conta


async def _casas_participantes(
    session: AsyncSession, terreno_id: uuid.UUID, escolhidas: list[uuid.UUID] | None
) -> list[Casa]:
    if escolhidas:
        casas = list(
            await session.scalars(select(Casa).where(Casa.id.in_(escolhidas)))
        )
        encontradas = {c.id for c in casas}
        faltando = set(escolhidas) - encontradas
        if faltando:
            raise HTTPException(
                status.HTTP_404_NOT_FOUND,
                f"Casa(s) não encontrada(s): {', '.join(str(i) for i in faltando)}.",
            )
        fora = [c for c in casas if c.terreno_id != terreno_id]
        if fora:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY,
                "Há casas que não pertencem ao terreno informado.",
            )
        return casas
    return list(
        await session.scalars(
            select(Casa).where(Casa.terreno_id == terreno_id, Casa.ativo.is_(True))
        )
    )


@router.get("", response_model=list[ContaOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    terreno_id: uuid.UUID | None = None,
    competencia: str | None = None,
) -> list[ContaCompartilhada]:
    stmt = select(ContaCompartilhada).order_by(
        ContaCompartilhada.competencia.desc(), ContaCompartilhada.tipo
    )
    if terreno_id is not None:
        stmt = stmt.where(ContaCompartilhada.terreno_id == terreno_id)
    if competencia is not None:
        stmt = stmt.where(ContaCompartilhada.competencia == competencia)
    return list(await session.scalars(stmt))


@router.post("", response_model=ContaDetalheOut, status_code=status.HTTP_201_CREATED)
async def lancar(
    dados: ContaCreate, session: SessionDep, _: UsuarioDep
) -> ContaDetalheOut:
    if await session.get(Terreno, dados.terreno_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Terreno não encontrado.")

    casas = await _casas_participantes(
        session, dados.terreno_id, dados.casas_participantes
    )
    if not casas:
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Nenhuma casa participante encontrada para o rateio.",
        )

    pessoas = await mapa_moradores_atuais(session, [c.id for c in casas])
    participantes = [
        CasaParticipante(casa_id=str(c.id), pessoas=pessoas.get(c.id, 0))
        for c in casas
    ]

    try:
        fatias = calcular_rateio(dados.valor_total_centavos, participantes)
    except RateioInvalido as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    conta = ContaCompartilhada(
        terreno_id=dados.terreno_id,
        tipo=dados.tipo,
        competencia=dados.competencia,
        valor_total_centavos=dados.valor_total_centavos,
        vencimento=dados.vencimento,
    )
    conta.rateios = [
        RateioConta(
            casa_id=uuid.UUID(f.casa_id),
            pessoas_snapshot=f.pessoas,
            valor_centavos=f.valor_centavos,
        )
        for f in fatias
    ]
    session.add(conta)
    await session.commit()
    conta = await _conta_or_404(session, conta.id)
    return ContaDetalheOut.from_conta(conta)


@router.get("/{conta_id}", response_model=ContaDetalheOut)
async def detalhe(
    conta_id: uuid.UUID, session: SessionDep, _: UsuarioDep
) -> ContaDetalheOut:
    conta = await _conta_or_404(session, conta_id)
    return ContaDetalheOut.from_conta(conta)


@router.put("/{conta_id}", response_model=ContaDetalheOut)
async def editar(
    conta_id: uuid.UUID,
    dados: ContaUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> ContaDetalheOut:
    conta = await _conta_or_404(session, conta_id)

    if dados.vencimento is not None:
        conta.vencimento = dados.vencimento
    if dados.competencia is not None:
        conta.competencia = dados.competencia

    if dados.valor_total_centavos is not None:
        conta.valor_total_centavos = dados.valor_total_centavos
        # Recalcula mantendo o snapshot de pessoas já gravado em cada rateio.
        participantes = [
            CasaParticipante(casa_id=str(r.casa_id), pessoas=r.pessoas_snapshot)
            for r in conta.rateios
        ]
        try:
            fatias = calcular_rateio(conta.valor_total_centavos, participantes)
        except RateioInvalido as exc:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)
            ) from exc
        por_casa = {f.casa_id: f for f in fatias}
        for r in conta.rateios:
            r.valor_centavos = por_casa[str(r.casa_id)].valor_centavos

    await session.commit()
    conta = await _conta_or_404(session, conta_id)
    return ContaDetalheOut.from_conta(conta)


@router.delete("/{conta_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(conta_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    conta = await _conta_or_404(session, conta_id)
    await session.delete(conta)
    await session.commit()
