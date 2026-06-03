import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from app.deps import SessionDep, UsuarioDep
from app.domain.competencia import CompetenciaInvalida, partes, validar_competencia
from app.models import Casa, Despesa, Terreno
from app.schemas.despesa import DespesaCreate, DespesaOut, DespesaUpdate

router = APIRouter(prefix="/despesas", tags=["despesas"])


def _intervalo_mes(competencia: str) -> tuple[date, date]:
    """Primeiro dia do mês (inclusive) e do mês seguinte (exclusive)."""
    ano, mes = partes(competencia)
    inicio = date(ano, mes, 1)
    fim = date(ano + 1, 1, 1) if mes == 12 else date(ano, mes + 1, 1)
    return inicio, fim


async def _despesa_or_404(session, despesa_id: uuid.UUID) -> Despesa:
    despesa = await session.get(Despesa, despesa_id)
    if despesa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Despesa não encontrada.")
    return despesa


async def _validar_vinculos(
    session, terreno_id: uuid.UUID | None, casa_id: uuid.UUID | None
) -> None:
    if terreno_id is not None and await session.get(Terreno, terreno_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Terreno não encontrado.")
    if casa_id is not None and await session.get(Casa, casa_id) is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")


@router.get("", response_model=list[DespesaOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    terreno_id: uuid.UUID | None = None,
    casa_id: uuid.UUID | None = None,
    competencia: str | None = Query(
        default=None, description="Filtra pelo mês da despesa (YYYY-MM)."
    ),
) -> list[DespesaOut]:
    stmt = (
        select(Despesa)
        # Carrega casa/terreno para exibir os nomes na listagem.
        .options(joinedload(Despesa.casa), joinedload(Despesa.terreno))
        .order_by(Despesa.data.desc())
    )
    if terreno_id is not None:
        stmt = stmt.where(Despesa.terreno_id == terreno_id)
    if casa_id is not None:
        stmt = stmt.where(Despesa.casa_id == casa_id)
    if competencia is not None:
        try:
            competencia = validar_competencia(competencia)
        except CompetenciaInvalida as exc:
            raise HTTPException(
                status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)
            ) from exc
        inicio, fim = _intervalo_mes(competencia)
        stmt = stmt.where(Despesa.data >= inicio, Despesa.data < fim)

    despesas = await session.scalars(stmt)
    return [DespesaOut.from_despesa(d) for d in despesas]


@router.post("", response_model=DespesaOut, status_code=status.HTTP_201_CREATED)
async def criar(dados: DespesaCreate, session: SessionDep, _: UsuarioDep) -> Despesa:
    await _validar_vinculos(session, dados.terreno_id, dados.casa_id)
    despesa = Despesa(**dados.model_dump())
    session.add(despesa)
    await session.commit()
    await session.refresh(despesa)
    return despesa


@router.put("/{despesa_id}", response_model=DespesaOut)
async def editar(
    despesa_id: uuid.UUID,
    dados: DespesaUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> Despesa:
    despesa = await _despesa_or_404(session, despesa_id)
    payload = dados.model_dump(exclude_unset=True)
    await _validar_vinculos(
        session, payload.get("terreno_id"), payload.get("casa_id")
    )
    for campo, valor in payload.items():
        setattr(despesa, campo, valor)
    await session.commit()
    await session.refresh(despesa)
    return despesa


@router.delete("/{despesa_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(despesa_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    despesa = await _despesa_or_404(session, despesa_id)
    await session.delete(despesa)
    await session.commit()
