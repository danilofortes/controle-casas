from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import SessionDep, UsuarioDep
from app.domain.competencia import (
    CompetenciaInvalida,
    formatar_pt_br,
    validar_competencia,
)
from app.models import Casa, CobrancaAluguel, ContaCompartilhada
from app.models.base import TipoConta
from app.schemas.relatorio import DashboardOut, ItemPendente

router = APIRouter(tags=["dashboard"])


def _competencia_atual() -> str:
    hoje = date.today()
    return f"{hoje.year:04d}-{hoje.month:02d}"


@router.get("/dashboard", response_model=DashboardOut)
async def dashboard(
    session: SessionDep,
    _: UsuarioDep,
    competencia: str | None = Query(default=None, description="Competência YYYY-MM"),
) -> DashboardOut:
    if competencia is None:
        competencia = _competencia_atual()
    else:
        try:
            competencia = validar_competencia(competencia)
        except CompetenciaInvalida as exc:
            raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    hoje = date.today()
    casas = {
        c.id: c for c in await session.scalars(select(Casa))
    }

    cobrancas = list(
        await session.scalars(
            select(CobrancaAluguel).where(
                CobrancaAluguel.competencia == competencia,
                CobrancaAluguel.pago.is_(False),
            )
        )
    )
    contas = list(
        await session.scalars(
            select(ContaCompartilhada)
            .where(ContaCompartilhada.competencia == competencia)
            .options(selectinload(ContaCompartilhada.rateios))
        )
    )

    pendencias: list[ItemPendente] = []
    total_aberto = 0
    qtd_atrasados = 0

    for cobranca in cobrancas:
        atrasado = cobranca.vencimento < hoje
        qtd_atrasados += int(atrasado)
        total_aberto += cobranca.valor_centavos
        casa = casas.get(cobranca.casa_id)
        pendencias.append(
            ItemPendente(
                tipo="ALUGUEL",
                casa_id=cobranca.casa_id,
                casa_nome=casa.nome if casa else None,
                competencia=competencia,
                valor_centavos=cobranca.valor_centavos,
                vencimento=cobranca.vencimento.isoformat(),
                atrasado=atrasado,
                aluguel_id=cobranca.id,
            )
        )

    for conta in contas:
        atrasado_conta = conta.vencimento < hoje
        tipo = "AGUA" if conta.tipo == TipoConta.AGUA else "LUZ"
        for r in conta.rateios:
            if r.pago:
                continue
            qtd_atrasados += int(atrasado_conta)
            total_aberto += r.valor_centavos
            casa = casas.get(r.casa_id)
            pendencias.append(
                ItemPendente(
                    tipo=tipo,
                    casa_id=r.casa_id,
                    casa_nome=casa.nome if casa else None,
                    competencia=competencia,
                    valor_centavos=r.valor_centavos,
                    vencimento=conta.vencimento.isoformat(),
                    atrasado=atrasado_conta,
                    rateio_id=r.id,
                )
            )

    pendencias.sort(key=lambda p: (not p.atrasado, p.vencimento or ""))

    return DashboardOut(
        competencia=competencia,
        competencia_formatada=formatar_pt_br(competencia),
        total_em_aberto_centavos=total_aberto,
        qtd_itens_abertos=len(pendencias),
        qtd_itens_atrasados=qtd_atrasados,
        pendencias=pendencias,
    )
