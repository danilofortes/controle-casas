"""Serviço de IA usando Gemini para análise do controle de aluguéis."""

from __future__ import annotations

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
        _model = genai.GenerativeModel("gemini-1.5-flash")
    return _model


def _montar_contexto_dashboard(dados: dict) -> str:
    """Converte os dados do dashboard em texto estruturado para o Gemini."""
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
    """Gera um resumo em linguagem natural do dashboard para o período."""
    model = _get_model()
    contexto = _montar_contexto_dashboard(dados_dashboard)

    prompt = f"""Você é um assistente financeiro de um sistema de controle de aluguéis residenciais.

Analise os dados abaixo e gere um resumo executivo em português, direto e útil para o administrador.
Destaque: situação geral, itens atrasados, o que precisa de atenção imediata e uma recomendação de ação.
Seja conciso (máximo 5 linhas).

{contexto}"""

    response = await model.generate_content_async(prompt)
    return response.text.strip()


async def responder_pergunta(pergunta: str, dados_dashboard: dict) -> str:
    """Responde uma pergunta em linguagem natural sobre os dados do período."""
    model = _get_model()
    contexto = _montar_contexto_dashboard(dados_dashboard)

    prompt = f"""Você é um assistente de um sistema de controle de aluguéis residenciais.
Responda a pergunta do administrador com base nos dados fornecidos.
Seja objetivo e responda em português.

Dados do período:
{contexto}

Pergunta: {pergunta}"""

    response = await model.generate_content_async(prompt)
    return response.text.strip()
