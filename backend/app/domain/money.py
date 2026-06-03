"""Helpers para valores monetários.

Convenção do sistema: dinheiro é sempre armazenado e manipulado como inteiros
em centavos (int). A conversão para/de reais e a formatação pt-BR ficam aqui.
"""

from decimal import ROUND_HALF_UP, Decimal


def reais_para_centavos(valor_reais: str | float | int | Decimal) -> int:
    """Converte um valor em reais para centavos (int), arredondando meio-acima.

    Aceita string ("1234.56" ou "1234,56"), float, int ou Decimal.
    """
    if isinstance(valor_reais, str):
        texto = valor_reais.strip()
        if "," in texto:
            # Formato pt-BR: ponto é separador de milhar e vírgula é decimal.
            texto = texto.replace(".", "").replace(",", ".")
        dec = Decimal(texto)
    else:
        dec = Decimal(str(valor_reais))
    centavos = (dec * 100).quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return int(centavos)


def centavos_para_reais(valor_centavos: int) -> Decimal:
    """Converte centavos (int) para um Decimal em reais (ex.: 123456 -> 1234.56)."""
    return (Decimal(valor_centavos) / 100).quantize(Decimal("0.01"))


def formatar_brl(valor_centavos: int) -> str:
    """Formata centavos como moeda brasileira (ex.: 123456 -> 'R$ 1.234,56')."""
    negativo = valor_centavos < 0
    inteiro_centavos = abs(valor_centavos)
    reais, centavos = divmod(inteiro_centavos, 100)
    reais_str = f"{reais:,}".replace(",", ".")
    sinal = "-" if negativo else ""
    return f"{sinal}R$ {reais_str},{centavos:02d}"
