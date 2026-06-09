import uuid
from datetime import date, timedelta

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError

from app.deps import SessionDep, UsuarioDep
from app.domain.competencia import proxima
from app.models import Casa, CobrancaAluguel
from app.services.aluguel_recorrencia import propagar_valor_meses_seguintes
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
    # Cobranças geradas em lote (repetir_meses > 1) compartilham um grupo de
    # recorrência, para que alterar o valor depois propague aos meses seguintes.
    recorrencia_id = uuid.uuid4() if dados.repetir_meses > 1 else None

    primeira: CobrancaAluguel | None = None
    competencia = dados.competencia
    for i in range(dados.repetir_meses):
        # Já existe cobrança nesta competência? No primeiro mês isso é conflito;
        # nos meses seguintes apenas pulamos para não duplicar.
        ja_existe = await session.scalar(
            select(CobrancaAluguel.id).where(
                CobrancaAluguel.casa_id == dados.casa_id,
                CobrancaAluguel.competencia == competencia,
            )
        )
        if ja_existe is not None:
            if i == 0:
                raise HTTPException(
                    status.HTTP_409_CONFLICT,
                    "Já existe uma cobrança de aluguel para esta casa nesta competência.",
                )
            competencia = proxima(competencia)
            continue

        # O vencimento informado só vale para a competência inicial; os meses
        # seguintes usam o dia de vencimento padrão da casa.
        vencimento = (
            dados.vencimento
            if (i == 0 and dados.vencimento)
            else _vencimento_padrao(competencia, casa.dia_vencimento)
        )
        aluguel = CobrancaAluguel(
            casa_id=dados.casa_id,
            competencia=competencia,
            valor_centavos=valor,
            vencimento=vencimento,
            recorrencia_id=recorrencia_id,
        )
        session.add(aluguel)
        if primeira is None:
            primeira = aluguel
        competencia = proxima(competencia)

    if primeira is None:
        # Todas as competências do intervalo já existiam (exceto a primeira, que
        # teria gerado 409). Caso de borda defensivo.
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existem cobranças para todas as competências do intervalo.",
        )

    try:
        await session.commit()
    except IntegrityError:
        await session.rollback()
        raise HTTPException(
            status.HTTP_409_CONFLICT,
            "Já existe uma cobrança de aluguel para esta casa nesta competência.",
        )
    await session.refresh(primeira)
    return primeira


@router.put("/{aluguel_id}", response_model=AluguelOut)
async def editar(
    aluguel_id: uuid.UUID,
    dados: AluguelUpdate,
    session: SessionDep,
    _: UsuarioDep,
) -> CobrancaAluguel:
    aluguel = await _aluguel_or_404(session, aluguel_id)
    campos = dados.model_dump(exclude_unset=True)
    for campo, valor in campos.items():
        setattr(aluguel, campo, valor)

    if "valor_centavos" in campos and aluguel.recorrencia_id is not None:
        await propagar_valor_meses_seguintes(
            session,
            recorrencia_id=aluguel.recorrencia_id,
            competencia_referencia=aluguel.competencia,
            valor_centavos=aluguel.valor_centavos,
        )

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
