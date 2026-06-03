from decimal import Decimal

import pytest

from app.domain.money import (
    centavos_para_reais,
    formatar_brl,
    reais_para_centavos,
)


@pytest.mark.parametrize(
    "entrada,esperado",
    [
        ("1234,56", 123456),
        ("1.234,56", 123456),
        (1234.56, 123456),
        (10, 1000),
        (Decimal("0.99"), 99),
        ("0,01", 1),
    ],
)
def test_reais_para_centavos(entrada, esperado):
    assert reais_para_centavos(entrada) == esperado


def test_arredondamento_meio_acima():
    assert reais_para_centavos(Decimal("1.005")) == 101


def test_centavos_para_reais():
    assert centavos_para_reais(123456) == Decimal("1234.56")
    assert centavos_para_reais(1) == Decimal("0.01")


@pytest.mark.parametrize(
    "centavos,esperado",
    [
        (123456, "R$ 1.234,56"),
        (5000, "R$ 50,00"),
        (1, "R$ 0,01"),
        (0, "R$ 0,00"),
        (100000000, "R$ 1.000.000,00"),
        (-2550, "-R$ 25,50"),
    ],
)
def test_formatar_brl(centavos, esperado):
    assert formatar_brl(centavos) == esperado
