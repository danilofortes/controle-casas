"""Serviço de IA usando Gemini para análise do controle de aluguéis."""

from __future__ import annotations

import base64
import json
import re
import uuid
from datetime import date

import google.generativeai as genai

from app.core.config import settings

_model: genai.GenerativeModel | None = None


def _get_model() -> genai.GenerativeModel:
    global _model
    if _model is None:
        if not settings.gemini_api_key:
            raise RuntimeError(
                "GEMINI_API_KEY não configurada. "
                "Adicione a variável de ambiente no arquivo .env."
            )
        genai.configure(api_key=settings.gemini_api_key)
        _model = genai.GenerativeModel(settings.gemini_model)
    return _model


def _montar_contexto_dashboard(dados: dict) -> str:
    competencia = dados.get("competencia_formatada", dados.get("competencia", ""))
    total = dados.get("total_em_aberto_centavos", 0) / 100
    qtd_abertos = dados.get("qtd_itens_abertos", 0)
    qtd_atrasados = dados.get("qtd_itens_atrasados", 0)
    qtd_proximos = dados.get("qtd_itens_proximos", 0)
    pendencias = dados.get("pendencias", [])

    linhas = [
        f"Competência: {competencia}",
        f"Total em aberto: R$ {total:.2f}",
        f"Itens em aberto: {qtd_abertos}",
        f"Itens atrasados: {qtd_atrasados}",
        f"Itens vencem em breve (≤3 dias): {qtd_proximos}",
        "",
        "Pendências:",
    ]
    for p in pendencias:
        casa = p.get("casa_nome") or "Casa desconhecida"
        tipo = p.get("tipo", "")
        valor = p.get("valor_centavos", 0) / 100
        venc = p.get("vencimento", "")
        atrasado = " ⚠️ ATRASADO" if p.get("atrasado") else ""
        em_breve = " 🔔 VENCE EM BREVE" if p.get("vence_em_breve") else ""
        linhas.append(f"  - {casa} | {tipo} | R$ {valor:.2f} | vence {venc}{atrasado}{em_breve}")

    return "\n".join(linhas)


async def gerar_resumo(dados_dashboard: dict) -> str:
    model = _get_model()
    contexto = _montar_contexto_dashboard(dados_dashboard)
    prompt = f"""Você é um assistente financeiro de um sistema de controle de aluguéis residenciais.
Analise os dados abaixo e gere um resumo executivo em português, direto e útil para o administrador.
Destaque: situação geral, itens atrasados, o que precisa de atenção imediata e uma recomendação de ação.
Seja conciso (máximo 5 linhas).

{contexto}"""
    response = await model.generate_content_async(
        prompt,
        generation_config={"temperature": 0.3, "max_output_tokens": 400},
    )
    return response.text.strip()


async def responder_pergunta(pergunta: str, dados_dashboard: dict) -> str:
    model = _get_model()
    contexto = _montar_contexto_dashboard(dados_dashboard)
    prompt = f"""Você é um assistente de um sistema de controle de aluguéis residenciais.
Responda a pergunta do administrador com base nos dados fornecidos. Seja objetivo e responda em português.

Dados do período:
{contexto}

Pergunta: {pergunta}"""
    response = await model.generate_content_async(
        prompt,
        generation_config={"temperature": 0.3, "max_output_tokens": 500},
    )
    return response.text.strip()


def _extrair_json(texto: str) -> dict:
    """Extrai o primeiro bloco JSON da resposta do Gemini."""
    match = re.search(r'\{.*\}', texto, re.DOTALL)
    if not match:
        raise ValueError(f"Gemini não retornou JSON válido: {texto[:200]}")
    return json.loads(match.group())


async def analisar_extrato(
    file_bytes: bytes,
    mime_type: str,
    moradores: list[dict],          # [{id, nome, casa_id, casa_nome, responsavel}]
    cobrancas: list[dict],          # [{tipo, id, casa_id, valor_centavos, vencimento, pago}]
    competencia: str,
) -> dict:
    """
    Envia o extrato/recibo para o Gemini e retorna análise estruturada.
    Retorna dict com: nome_pagador, valor_centavos, data_pagamento,
                      morador_id_match, confianca, matches_possiveis, mensagem_ia
    """
    model = _get_model()

    # Monta lista de moradores para o Gemini comparar
    lista_moradores = "\n".join(
        f"  - id={m['id']} | nome={m['nome']} | casa={m['casa_nome']}"
        + (" (responsável)" if m.get("responsavel") else "")
        for m in moradores
    )

    prompt = f"""Você é um sistema de reconhecimento de comprovantes de pagamento de aluguel.

Analise a imagem/documento anexo (extrato PIX, comprovante bancário ou recibo) e extraia as informações.

MORADORES CADASTRADOS no sistema (competência {competencia}):
{lista_moradores}

Retorne APENAS um JSON com exatamente estas chaves:
{{
  "nome_pagador": "nome exato como aparece no documento",
  "valor_centavos": 85000,
  "data_pagamento": "2025-06-05",
  "morador_id_match": "uuid-do-morador-mais-provavel-ou-null",
  "matches_possiveis": ["uuid1", "uuid2"],
  "confianca": 0.95,
  "observacao": "breve explicação do raciocínio"
}}

Regras:
- valor_centavos: valor em centavos (R$ 850,00 = 85000)
- data_pagamento: formato ISO YYYY-MM-DD ou null se não encontrado
- morador_id_match: UUID do morador com nome mais parecido, ou null se nenhum bater
- matches_possiveis: lista de UUIDs de candidatos (pode ser só 1 ou vários)
- confianca: 0.0 a 1.0 (>= 0.8 = alta confiança, < 0.8 = ambíguo)
- Compare nomes com tolerância: apelidos, abreviações, ordem de sobrenome invertida"""

    part_arquivo = {
        "inline_data": {
            "mime_type": mime_type,
            "data": base64.b64encode(file_bytes).decode(),
        }
    }

    response = await model.generate_content_async(
        [prompt, part_arquivo],
        generation_config={
            "temperature": 0.1,
            "max_output_tokens": 600,
            "response_mime_type": "application/json",
        },
    )
    return _extrair_json(response.text)


def calcular_acao(
    valor_extrato: int,
    aluguel: dict | None,        # {id, valor_centavos, vencimento}
    rateios: list[dict],         # [{id, tipo, valor_centavos, vencimento}]
) -> tuple[str, str]:
    """
    Aplica as regras de negócio e retorna (acao, mensagem).

    Ações possíveis:
      baixar_aluguel  — valor bate com aluguel apenas
      baixar_tudo     — valor bate com aluguel + todos os rateios pendentes
      ajuste_manual   — valor não fecha exatamente (maior ou menor)
      sem_pendencia   — não há cobrança pendente para esta casa no período
    """
    if not aluguel:
        return "sem_pendencia", "Não há aluguel pendente para esta casa no período informado."

    val_aluguel = aluguel["valor_centavos"]
    val_rateios = sum(r["valor_centavos"] for r in rateios)
    val_total = val_aluguel + val_rateios
    fmt = lambda c: f"R$ {c/100:.2f}"

    if valor_extrato == val_aluguel:
        return (
            "baixar_aluguel",
            f"Valor {fmt(valor_extrato)} bate exatamente com o aluguel. Baixa do aluguel será registrada.",
        )

    if rateios and valor_extrato == val_total:
        tipos = " + ".join(r["tipo"] for r in rateios)
        return (
            "baixar_tudo",
            f"Valor {fmt(valor_extrato)} bate com aluguel + {tipos} ({fmt(val_total)}). Baixa total será registrada.",
        )

    if valor_extrato > val_aluguel:
        return (
            "ajuste_manual",
            f"Valor recebido {fmt(valor_extrato)} é maior que o aluguel {fmt(val_aluguel)}. "
            f"Verifique se inclui água/luz ({fmt(val_rateios)}) e ajuste manualmente se necessário.",
        )

    # valor_extrato < val_aluguel
    return (
        "ajuste_manual",
        f"Valor recebido {fmt(valor_extrato)} é menor que o aluguel {fmt(val_aluguel)}. "
        "Pagamento parcial — verifique e ajuste manualmente.",
    )
