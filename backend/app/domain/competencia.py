"""Helpers para 'competência' (mês/ano de referência) no formato `YYYY-MM`."""

import re

_PADRAO = re.compile(r"^(\d{4})-(\d{2})$")


class CompetenciaInvalida(ValueError):
    """Erro de domínio para competência mal formatada."""


def validar_competencia(competencia: str) -> str:
    """Valida uma competência `YYYY-MM` e a devolve normalizada.

    Lança `CompetenciaInvalida` se o formato ou o mês forem inválidos.
    """
    if not isinstance(competencia, str):
        raise CompetenciaInvalida("Competência deve ser uma string no formato YYYY-MM.")
    m = _PADRAO.match(competencia.strip())
    if not m:
        raise CompetenciaInvalida(
            f"Competência inválida: '{competencia}'. Use o formato YYYY-MM (ex.: 2026-03)."
        )
    ano, mes = int(m.group(1)), int(m.group(2))
    if not 1 <= mes <= 12:
        raise CompetenciaInvalida(
            f"Mês inválido na competência: '{competencia}'. O mês deve estar entre 01 e 12."
        )
    return f"{ano:04d}-{mes:02d}"


def partes(competencia: str) -> tuple[int, int]:
    """Devolve (ano, mes) de uma competência válida."""
    validar_competencia(competencia)
    ano, mes = competencia.split("-")
    return int(ano), int(mes)


def proxima(competencia: str) -> str:
    """Retorna a competência do mês seguinte."""
    ano, mes = partes(competencia)
    if mes == 12:
        return f"{ano + 1:04d}-01"
    return f"{ano:04d}-{mes + 1:02d}"


def anterior(competencia: str) -> str:
    """Retorna a competência do mês anterior."""
    ano, mes = partes(competencia)
    if mes == 1:
        return f"{ano - 1:04d}-12"
    return f"{ano:04d}-{mes - 1:02d}"


def formatar_pt_br(competencia: str) -> str:
    """Formata a competência como 'MM/YYYY' (ex.: '2026-03' -> '03/2026')."""
    ano, mes = partes(competencia)
    return f"{mes:02d}/{ano:04d}"
