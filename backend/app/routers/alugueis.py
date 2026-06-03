import uuid
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import SessionDep, UsuarioDep
from app.models import Casa, CobrancaAluguel
from app.schemas.aluguel import AluguelCreate, AluguelOut, AluguelUpdate
from app.schemas.conta import PagamentoUpdate

router = APIRouter(prefix="/alugueis", tags=["alugueis"])


def _vencimento_padrao(competencia: str, dia: int) -> date:
    ano, mes = (int(p) for p in competencia.split("-"))
    # Ajusta o dia para o último dia válido do mês (ex.: 31 em fevereiro).
    if mes == 12:
        prox = date(ano + 1, 1, 1)
    else:
        prox = date(ano, mes + 1, 1)
    ultimo_dia = (prox - timedelta(days=1)).day
    return date(ano, mes, min(dia, ultimo_dia))


async def _aluguel_or_404(session, aluguel_id: uuid.UUID) -> CobrancaAluguel:
    aluguel = await session.get(CobrancaAluguel, aluguel_id)
    if aluguel is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Cobrança de aluguel não encontrada.")
    return aluguel


@router.get("", response_model=list[AluguelOut])
async def listar(
    session: SessionDep,
    _: UsuarioDep,
    casa_id: uuid.UUID | None = None,
    competencia: str | None = None,
) -> list[CobrancaAluguel]:
    stmt = select(CobrancaAluguel).order_by(CobrancaAluguel.competencia.desc())
    if casa_id is not None:
        stmt = stmt.where(CobrancaAluguel.casa_id == casa_id)
    if competencia is not None:
        stmt = stmt.where(CobrancaAluguel.competencia == competencia)
    return list(await session.scalars(stmt))


@router.post("", response_model=AluguelOut, status_code=status.HTTP_201_CREATED)
async def registrar(
    dados: AluguelCreate, session: SessionDep, _: UsuarioDep
) -> CobrancaAluguel:
    casa = await session.get(Casa, dados.casa_id)
    if casa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")

    valor = dados.valor_centavos if dados.valor_centavos is not None else casa.aluguel_centavos
    vencimento = dados.vencimento or _vencimento_padrao(
        dados.competencia, casa.dia_vencimento
    )

    aluguel = CobrancaAluguel(
        casa_id=dados.casa_id,
        competencia=dados.competencia,
        valor_centavos=valor,
        vencimento=vencimento,
    )
    session.add(aluguel)
    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe uma cobrança de aluguel para esta casa nesta competência.",
        )
    await session.refresh(aluguel)
    return aluguel


@router.put("/{aluguel_id}", response_model=AluguelOut)
async def editar(
    aluguel_id: uuid.UUID,
    dados: AluguelUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> CobrancaAluguel:
    aluguel = await _aluguel_or_404(session, aluguel_id)
    for campo, valor in dados.model_dump(exclude_unset=True).items():
        setattr(aluguel, campo, valor)
    await session.commit()
    await session.refresh(aluguel)
    return aluguel


@router.delete("/{aluguel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def excluir(aluguel_id: uuid.UUID, session: SessionDep, _: UsuarioDep) -> None:
    aluguel = await _aluguel_or_404(session, aluguel_id)
    await session.delete(aluguel)
    await session.commit()


@router.patch("/{aluguel_id}/pagamento", response_model=AluguelOut)
async def pagamento(
    aluguel_id: uuid.UUID,
    dados: PagamentoUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> CobrancaAluguel:
    aluguel = await _aluguel_or_404(session, aluguel_id)
    aluguel.pago = dados.pago
    aluguel.pago_em = (dados.pago_em or date.today()) if dados.pago else None
    await session.commit()
    await session.refresh(aluguel)
    return aluguel
