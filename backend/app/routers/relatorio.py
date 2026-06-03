from datetime import date

from fastapi import APIRouter, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.deps import SessionDep, UsuarioDep
from app.domain.competencia import (
    CompetenciaInvalida,
    formatar_pt_br,
    partes,
    validar_competencia,
)
from app.models import Casa, CobrancaAluguel, ContaCompartilhada, Despesa
from app.models.base import TipoConta
from app.schemas.relatorio import (
    AdministradoraItem,
    AdministradoraRelatorio,
    CasaRelatorio,
    RelatorioOut,
    TotaisRelatorio,
)

router = APIRouter(tags=["relatorio"])


def _intervalo_mes(competencia: str) -> tuple[date, date]:
    ano, mes = partes(competencia)
    inicio = date(ano, mes, 1)
    if mes == 12:
        fim = date(ano + 1, 1, 1)
    else:
        fim = date(ano, mes + 1, 1)
    return inicio, fim


@router.get("/relatorio", response_model=RelatorioOut)
async def relatorio(
    session: SessionDep,
    _: UsuarioDep,
    competencia: str = Query(..., description="Competência no formato YYYY-MM"),
) -> RelatorioOut:
    try:
        competencia = validar_competencia(competencia)
    except CompetenciaInvalida as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    casas = list(await session.scalars(select(Casa).order_by(Casa.nome)))
    cobrancas = list(
        await session.scalars(
            select(CobrancaAluguel).where(CobrancaAluguel.competencia == competencia)
        )
    )
    contas = list(
        await session.scalars(
            select(ContaCompartilhada)
            .where(ContaCompartilhada.competencia == competencia)
            .options(
                selectinload(ContaCompartilhada.rateios),
                selectinload(ContaCompartilhada.terreno),
            )
        )
    )
    inicio, fim = _intervalo_mes(competencia)
    despesas = list(
        await session.scalars(
            select(Despesa).where(Despesa.data >= inicio, Despesa.data < fim)
        )
    )

    cobranca_por_casa = {c.casa_id: c for c in cobrancas}
    agua_por_casa: dict = {}
    luz_por_casa: dict = {}
    # Fatia da casa administradora por tipo: valor_total − soma(rateios cobrados),
    # somada entre todas as contas da competência (mesma lógica do
    # ``valor_administradora_centavos`` de ContaDetalheOut).
    admin_agua = 0
    admin_luz = 0
    admin_itens: list[AdministradoraItem] = []
    for conta in contas:
        destino = agua_por_casa if conta.tipo == TipoConta.AGUA else luz_por_casa
        for r in conta.rateios:
            destino.setdefault(r.casa_id, []).append(r)
        fatia_admin = conta.valor_total_centavos - sum(
            r.valor_centavos for r in conta.rateios
        )
        tipo = "AGUA" if conta.tipo == TipoConta.AGUA else "LUZ"
        if conta.tipo == TipoConta.AGUA:
            admin_agua += fatia_admin
        else:
            admin_luz += fatia_admin
        # Uma linha por conta com fatia administradora efetiva (> 0).
        if fatia_admin > 0:
            admin_itens.append(
                AdministradoraItem(
                    conta_id=conta.id,
                    tipo=tipo,
                    competencia=conta.competencia,
                    vencimento=conta.vencimento,
                    valor_centavos=fatia_admin,
                    terreno_nome=getattr(conta.terreno, "nome", None),
                )
            )

    linhas: list[CasaRelatorio] = []
    tot_receber = tot_recebido = tot_aberto = 0
    for casa in casas:
        cobranca = cobranca_por_casa.get(casa.id)
        aluguel = cobranca.valor_centavos if cobranca else 0
        agua_rateios = agua_por_casa.get(casa.id, [])
        luz_rateios = luz_por_casa.get(casa.id, [])
        agua = sum(r.valor_centavos for r in agua_rateios)
        luz = sum(r.valor_centavos for r in luz_rateios)

        devido = aluguel + agua + luz
        pago = 0
        if cobranca and cobranca.pago:
            pago += cobranca.valor_centavos
        pago += sum(r.valor_centavos for r in agua_rateios if r.pago)
        pago += sum(r.valor_centavos for r in luz_rateios if r.pago)
        aberto = devido - pago

        if devido == 0 and pago == 0:
            continue

        linhas.append(
            CasaRelatorio(
                casa_id=casa.id,
                casa_nome=casa.nome,
                aluguel_centavos=aluguel,
                agua_centavos=agua,
                luz_centavos=luz,
                total_devido_centavos=devido,
                total_pago_centavos=pago,
                em_aberto_centavos=aberto,
            )
        )
        tot_receber += devido
        tot_recebido += pago
        tot_aberto += aberto

    totais = TotaisRelatorio(
        total_a_receber_centavos=tot_receber,
        total_recebido_centavos=tot_recebido,
        total_em_aberto_centavos=tot_aberto,
        total_despesas_centavos=sum(d.valor_centavos for d in despesas),
    )
    administradora = AdministradoraRelatorio(
        agua_centavos=admin_agua,
        luz_centavos=admin_luz,
        total_centavos=admin_agua + admin_luz,
        itens=admin_itens,
    )
    return RelatorioOut(
        competencia=competencia,
        competencia_formatada=formatar_pt_br(competencia),
        casas=linhas,
        totais=totais,
        administradora=administradora,
    )
