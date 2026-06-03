import pytest

from app.domain.competencia import (
    CompetenciaInvalida,
    anterior,
    formatar_pt_br,
    partes,
    proxima,
    validar_competencia,
)


def test_validar_ok():
    assert validar_competencia("2026-03") == "2026-03"
    assert validar_competencia("  2026-03  ") == "2026-03"


@pytest.mark.parametrize("valor", ["2026-13", "2026-00", "26-03", "2026/03", "abc", "2026-3"])
def test_validar_invalida(valor):
    with pytest.raises(CompetenciaInvalida):
        validar_competencia(valor)


def test_partes():
    assert partes("2026-03") == (2026, 3)


def test_proxima_e_virada_de_ano():
    assert proxima("2026-03") == "2026-04"
    assert proxima("2026-12") == "2027-01"


def test_anterior_e_virada_de_ano():
    assert anterior("2026-03") == "2026-02"
    assert anterior("2026-01") == "2025-12"


def test_formatar_pt_br():
    assert formatar_pt_br("2026-03") == "03/2026"
