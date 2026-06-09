"""Endpoints de IA — resumos, perguntas e processamento de extratos de pagamento."""

from __future__ import annotations

import re
import uuid
from datetime import date

from fastapi import APIRouter, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import selectinload

from app.core.storage import StorageError, decodificar_data_url, storage
from app.deps import SessionDep, UsuarioDep
from app.models import Casa, CobrancaAluguel, ExtratoPagamento, Morador, RateioConta
from app.routers.dashboard import dashboard as _dashboard_handler
from app.schemas.extrato import (
    AnalisarExtratoIn,
    CobrancaPendente,
    ConfirmarExtratoIn,
    ExtratoOut,
    MoradorMatch,
    ResultadoAnalise,
)
from app.schemas.ia import PerguntaIn, RespostaIA
from app.services import ia as ia_service

router = APIRouter(tags=["ia"])


# ──────────────────────────────────────────
#  Helpers
# ──────────────────────────────────────────

def _competencia_atual() -> str:
    hoje = date.today()
    return f"{hoje.year:04d}-{hoje.month:02d}"


async def _obter_dados_dashboard(session, usuario, competencia: str) -> dict:
    resultado = await _dashboard_handler(session=session, _=usuario, competencia=competencia)
    return resultado.model_dump()


# ──────────────────────────────────────────
#  Resumo e perguntas
# ──────────────────────────────────────────

@router.get("/ia/resumo", response_model=RespostaIA)
async def resumo_ia(
    session: SessionDep,
    usuario: UsuarioDep,
    competencia: str | None = None,
) -> RespostaIA:
    comp = competencia or _competencia_atual()
    try:
        dados = await _obter_dados_dashboard(session, usuario, comp)
        resposta = await ia_service.gerar_resumo(dados)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Erro ao consultar IA: {exc}") from exc
    return RespostaIA(resposta=resposta, competencia=comp)


@router.post("/ia/pergunta", response_model=RespostaIA)
async def pergunta_ia(
    body: PerguntaIn,
    session: SessionDep,
    usuario: UsuarioDep,
) -> RespostaIA:
    comp = body.competencia or _competencia_atual()
    try:
        dados = await _obter_dados_dashboard(session, usuario, comp)
        resposta = await ia_service.responder_pergunta(body.pergunta, dados)
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Erro ao consultar IA: {exc}") from exc
    return RespostaIA(resposta=resposta, competencia=comp)


# ──────────────────────────────────────────
#  Processamento de extratos
# ──────────────────────────────────────────

@router.post("/ia/analisar-extrato", response_model=ResultadoAnalise)
async def analisar_extrato(
    body: AnalisarExtratoIn,
    session: SessionDep,
    _: UsuarioDep,
) -> ResultadoAnalise:
    """
    Recebe um extrato/recibo (data URL base64) e usa o Gemini para:
    1. Extrair nome do pagador, valor e data
    2. Identificar o morador correspondente
    3. Calcular a ação sugerida com base nas cobranças pendentes
    Retorna os dados para exibição no modal de confirmação.
    """
    comp = body.competencia or _competencia_atual()

    # Decodifica arquivo
    try:
        mime_type, file_bytes = decodificar_data_url(body.file_data_url)
    except Exception as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, f"Arquivo inválido: {exc}") from exc

    if mime_type not in ("application/pdf", "image/jpeg", "image/png", "image/webp", "image/gif"):
        raise HTTPException(
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            "Formato não suportado. Envie PDF, PNG, JPG ou WebP.",
        )

    # Busca todos os moradores ativos
    moradores_db = list(await session.scalars(
        select(Morador)
        .join(Casa)
        .where(Casa.ativo == True)  # noqa: E712
        .options(selectinload(Morador.casa))
    ))
    moradores_payload = [
        {
            "id": str(m.id),
            "nome": m.nome,
            "casa_id": str(m.casa_id),
            "casa_nome": m.casa.nome,
            "responsavel": m.responsavel,
        }
        for m in moradores_db
    ]

    # Busca cobranças pendentes do período
    cobrancas_db = list(await session.scalars(
        select(CobrancaAluguel).where(
            CobrancaAluguel.competencia == comp,
            CobrancaAluguel.pago == False,  # noqa: E712
        )
    ))
    rateios_db = list(await session.scalars(
        select(RateioConta)
        .join(CobrancaAluguel.__class__, False)  # evitar join errado; fazemos direto
    ))
    # Rateios pendentes do período via conta compartilhada
    from app.models.conta import ContaCompartilhada
    rateios_db = list(await session.scalars(
        select(RateioConta)
        .join(ContaCompartilhada, RateioConta.conta_id == ContaCompartilhada.id)
        .where(
            ContaCompartilhada.competencia == comp,
            RateioConta.pago == False,  # noqa: E712
        )
    ))

    cobrancas_payload = [
        {
            "tipo": "ALUGUEL",
            "id": str(c.id),
            "casa_id": str(c.casa_id),
            "valor_centavos": c.valor_centavos,
            "vencimento": c.vencimento.isoformat(),
        }
        for c in cobrancas_db
    ]

    # Chama o Gemini
    try:
        resultado_ia = await ia_service.analisar_extrato(
            file_bytes=file_bytes,
            mime_type=mime_type,
            moradores=moradores_payload,
            cobrancas=cobrancas_payload,
            competencia=comp,
        )
    except RuntimeError as exc:
        raise HTTPException(status.HTTP_503_SERVICE_UNAVAILABLE, str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status.HTTP_502_BAD_GATEWAY, f"Erro ao consultar IA: {exc}") from exc

    # Parseia resultado da IA
    nome_pagador = resultado_ia.get("nome_pagador", "")
    valor_centavos = int(resultado_ia.get("valor_centavos", 0))
    data_str = resultado_ia.get("data_pagamento")
    confianca = float(resultado_ia.get("confianca", 0.0))
    morador_id_match_str = resultado_ia.get("morador_id_match")
    matches_possiveis_str = resultado_ia.get("matches_possiveis", [])

    data_pagamento: date | None = None
    if data_str:
        try:
            data_pagamento = date.fromisoformat(data_str)
        except ValueError:
            pass

    # Monta índice de moradores por id
    mor_index = {str(m.id): m for m in moradores_db}

    def _build_match(mid_str: str) -> MoradorMatch | None:
        m = mor_index.get(mid_str)
        if not m:
            return None
        return MoradorMatch(
            morador_id=m.id,
            morador_nome=m.nome,
            casa_id=m.casa_id,
            casa_nome=m.casa.nome,
            confianca=confianca,
        )

    match_principal = _build_match(morador_id_match_str) if morador_id_match_str else None
    matches_possiveis = [
        mm for mid in matches_possiveis_str if (mm := _build_match(mid)) is not None
    ]

    # Se confiança alta e temos match → busca cobranças desta casa
    aluguel_pendente: CobrancaPendente | None = None
    rateios_pendentes: list[CobrancaPendente] = []

    casa_id_alvo = match_principal.casa_id if match_principal else None
    if casa_id_alvo:
        for c in cobrancas_db:
            if c.casa_id == casa_id_alvo:
                aluguel_pendente = CobrancaPendente(
                    tipo="ALUGUEL",
                    id=c.id,
                    valor_centavos=c.valor_centavos,
                    vencimento=c.vencimento,
                )
                break

        from app.models.base import TipoConta
        for r in rateios_db:
            if r.casa_id == casa_id_alvo:
                # Busca tipo da conta
                conta = await session.get(
                    __import__("app.models.conta", fromlist=["ContaCompartilhada"]).ContaCompartilhada,
                    r.conta_id,
                )
                tipo_str = "AGUA" if conta and conta.tipo == TipoConta.AGUA else "LUZ"
                rateios_pendentes.append(
                    CobrancaPendente(
                        tipo=tipo_str,
                        id=r.id,
                        valor_centavos=r.valor_centavos,
                        vencimento=conta.vencimento if conta else date.today(),
                    )
                )

    # Calcula ação sugerida
    if confianca < 0.8 or not match_principal:
        acao = "ambiguo"
        mensagem = (
            f"Não foi possível identificar o morador com certeza (confiança {confianca:.0%}). "
            "Selecione manualmente a casa e o morador correspondente."
        )
    else:
        aluguel_dict = (
            {"id": aluguel_pendente.id, "valor_centavos": aluguel_pendente.valor_centavos, "vencimento": aluguel_pendente.vencimento}
            if aluguel_pendente else None
        )
        rateios_dict = [
            {"id": r.id, "tipo": r.tipo, "valor_centavos": r.valor_centavos}
            for r in rateios_pendentes
        ]
        acao, mensagem = ia_service.calcular_acao(valor_centavos, aluguel_dict, rateios_dict)

    return ResultadoAnalise(
        nome_pagador_extraido=nome_pagador,
        valor_centavos=valor_centavos,
        data_pagamento=data_pagamento,
        confianca=confianca,
        match=match_principal,
        matches_possiveis=matches_possiveis,
        aluguel_pendente=aluguel_pendente,
        rateios_pendentes=rateios_pendentes,
        acao=acao,
        mensagem=mensagem,
        competencia=comp,
    )


@router.post("/ia/confirmar-extrato", response_model=ExtratoOut, status_code=status.HTTP_201_CREATED)
async def confirmar_extrato(
    body: ConfirmarExtratoIn,
    session: SessionDep,
    _: UsuarioDep,
) -> ExtratoPagamento:
    """
    Admin confirmou o modal. Executa:
    1. Salva o arquivo no Supabase Storage
    2. Cria registro de ExtratoPagamento
    3. Dá baixa nas cobranças selecionadas
    """
    # Valida casa
    casa = await session.get(Casa, body.casa_id)
    if casa is None:
        raise HTTPException(status.HTTP_404_NOT_FOUND, "Casa não encontrada.")

    # Persiste arquivo
    try:
        arquivo = await storage.persistir(
            url=body.file_data_url,
            casa_id=body.casa_id,
            tipo="extratos",
            nome_arquivo=f"extrato_{body.competencia}.pdf",
        )
    except StorageError as exc:
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, str(exc)) from exc

    hoje = date.today()

    # Cria registro do extrato
    extrato = ExtratoPagamento(
        casa_id=body.casa_id,
        competencia=body.competencia,
        nome_pagador_extrato=body.nome_pagador_extrato,
        valor_centavos=body.valor_centavos,
        data_pagamento=body.data_pagamento or hoje,
        url=arquivo.url,
        storage_path=arquivo.storage_path,
        status="confirmado",
        observacao=body.observacao,
    )
    session.add(extrato)

    # Baixa do aluguel
    if body.aluguel_id:
        aluguel = await session.get(CobrancaAluguel, body.aluguel_id)
        if aluguel and aluguel.casa_id == body.casa_id:
            aluguel.pago = True
            aluguel.pago_em = body.data_pagamento or hoje

    # Baixa dos rateios
    for rateio_id in body.rateio_ids:
        rateio = await session.get(RateioConta, rateio_id)
        if rateio and rateio.casa_id == body.casa_id:
            rateio.pago = True
            rateio.pago_em = body.data_pagamento or hoje

    await session.commit()
    await session.refresh(extrato)
    return extrato
