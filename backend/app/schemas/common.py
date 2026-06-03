from pydantic import AfterValidator
from typing import Annotated

from app.domain.competencia import CompetenciaInvalida, validar_competencia


def _validar_competencia(v: str) -> str:
    try:
        return validar_competencia(v)
    except CompetenciaInvalida as exc:
        raise ValueError(str(exc)) from exc


Competencia = Annotated[str, AfterValidator(_validar_competencia)]
