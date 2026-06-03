"""Rateio de contas compartilhadas por cabeça (Requisito 6).

Função pura, sem dependência de banco ou HTTP. Usa o **método dos maiores restos**
(largest remainder) para distribuir os centavos de arredondamento, garantindo que
a soma das fatias seja EXATAMENTE igual ao valor total.
"""

from dataclasses import dataclass


class RateioInvalido(ValueError):
    """Erro de domínio do rateio (ex.: total de pessoas igual a zero)."""


@dataclass(frozen=True)
class CasaParticipante:
    """Casa que participa de um rateio, com o snapshot de pessoas."""

    casa_id: str
    pessoas: int


@dataclass(frozen=True)
class FatiaRateio:
    """Fatia resultante do rateio para uma casa."""

    casa_id: str
    pessoas: int
    valor_centavos: int


def calcular_rateio(
    valor_total_centavos: int, casas: list[CasaParticipante]
) -> list[FatiaRateio]:
    """Divide `valor_total_centavos` entre as casas proporcionalmente às pessoas.

    Regras:
    - `valor = floor(total * pessoas / total_pessoas)` em centavos.
    - O resto (em centavos) é distribuído pelas casas de maior resto fracionário.
    - `sum(fatias) == valor_total_centavos` sempre.
    - `total_pessoas == 0` levanta `RateioInvalido`.

    A ordem de desempate dos restos é determinística: maior resto primeiro e, em
    empate, pela ordem de `casa_id` (string), garantindo resultado reproduzível.
    """
    if valor_total_centavos < 0:
        raise RateioInvalido("O valor total não pode ser negativo.")

    total_pessoas = sum(c.pessoas for c in casas)
    if total_pessoas == 0:
        raise RateioInvalido(
            "Total de pessoas é zero; não é possível ratear a conta."
        )

    bases: list[int] = []
    restos: list[tuple[int, int]] = []  # (resto, índice)
    soma = 0
    for i, c in enumerate(casas):
        bruto = valor_total_centavos * c.pessoas
        base = bruto // total_pessoas
        resto = bruto % total_pessoas
        bases.append(base)
        soma += base
        restos.append((resto, i))

    sobra = valor_total_centavos - soma
    ordem = sorted(restos, key=lambda r: (-r[0], str(casas[r[1]].casa_id)))
    for _, idx in ordem[:sobra]:
        bases[idx] += 1

    return [
        FatiaRateio(
            casa_id=c.casa_id,
            pessoas=c.pessoas,
            valor_centavos=bases[i],
        )
        for i, c in enumerate(casas)
    ]
