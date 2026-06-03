import pytest

from app.domain.rateio import (
    CasaParticipante,
    RateioInvalido,
    calcular_rateio,
)


def _soma(fatias) -> int:
    return sum(f.valor_centavos for f in fatias)


def test_exemplo_design_300_reais_4_1_1():
    casas = [
        CasaParticipante("a", 4),
        CasaParticipante("b", 1),
        CasaParticipante("c", 1),
    ]
    fatias = calcular_rateio(30000, casas)
    valores = {f.casa_id: f.valor_centavos for f in fatias}
    assert valores == {"a": 20000, "b": 5000, "c": 5000}
    assert _soma(fatias) == 30000


def test_resto_indivisivel_100_reais_1_1_1():
    casas = [
        CasaParticipante("a", 1),
        CasaParticipante("b", 1),
        CasaParticipante("c", 1),
    ]
    fatias = calcular_rateio(10000, casas)
    valores = sorted(f.valor_centavos for f in fatias)
    assert valores == [3333, 3333, 3334]
    assert _soma(fatias) == 10000


def test_uma_unica_casa_recebe_tudo():
    fatias = calcular_rateio(12345, [CasaParticipante("a", 3)])
    assert len(fatias) == 1
    assert fatias[0].valor_centavos == 12345
    assert _soma(fatias) == 12345


def test_total_impar_soma_exata():
    casas = [CasaParticipante("a", 2), CasaParticipante("b", 3)]
    fatias = calcular_rateio(10001, casas)
    assert _soma(fatias) == 10001


def test_pessoas_variadas_soma_exata():
    casas = [
        CasaParticipante("a", 5),
        CasaParticipante("b", 2),
        CasaParticipante("c", 1),
        CasaParticipante("d", 7),
    ]
    fatias = calcular_rateio(99999, casas)
    assert _soma(fatias) == 99999
    # casa com mais pessoas nunca recebe menos que casa com menos pessoas
    por_casa = {f.casa_id: f.valor_centavos for f in fatias}
    assert por_casa["d"] >= por_casa["a"] >= por_casa["b"] >= por_casa["c"]


def test_total_pessoas_zero_levanta_erro():
    casas = [CasaParticipante("a", 0), CasaParticipante("b", 0)]
    with pytest.raises(RateioInvalido):
        calcular_rateio(10000, casas)


def test_lista_vazia_levanta_erro():
    with pytest.raises(RateioInvalido):
        calcular_rateio(10000, [])


def test_valor_negativo_levanta_erro():
    with pytest.raises(RateioInvalido):
        calcular_rateio(-100, [CasaParticipante("a", 1)])


def test_valor_zero_distribui_zero():
    casas = [CasaParticipante("a", 1), CasaParticipante("b", 2)]
    fatias = calcular_rateio(0, casas)
    assert _soma(fatias) == 0
    assert all(f.valor_centavos == 0 for f in fatias)


def test_casa_sem_pessoas_recebe_zero():
    casas = [CasaParticipante("a", 0), CasaParticipante("b", 4)]
    fatias = calcular_rateio(10000, casas)
    por_casa = {f.casa_id: f.valor_centavos for f in fatias}
    assert por_casa["a"] == 0
    assert por_casa["b"] == 10000
    assert _soma(fatias) == 10000


def test_distribuicao_centavos_deterministica():
    casas = [
        CasaParticipante("z", 1),
        CasaParticipante("a", 1),
        CasaParticipante("m", 1),
    ]
    fatias = calcular_rateio(10000, casas)
    por_casa = {f.casa_id: f.valor_centavos for f in fatias}
    # desempate por casa_id (ordem alfabética) recebe o centavo extra
    assert por_casa["a"] == 3334
    assert por_casa["m"] == 3333
    assert por_casa["z"] == 3333


@pytest.mark.parametrize("total", [1, 7, 13, 9999, 123457, 1000000])
def test_soma_sempre_exata_varios_totais(total):
    casas = [
        CasaParticipante("a", 3),
        CasaParticipante("b", 5),
        CasaParticipante("c", 2),
    ]
    fatias = calcular_rateio(total, casas)
    assert _soma(fatias) == total
