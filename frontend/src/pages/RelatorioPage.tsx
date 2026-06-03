import { useState } from "react";
import { api, type Relatorio } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon } from "../components/Icon";
import {
  competenciaAtual,
  deslocarCompetencia,
  formatarCentavos,
  formatarCompetencia,
} from "../lib/format";

export function RelatorioPage() {
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const { data, loading, error } = useApi<Relatorio>(
    () => api.get<Relatorio>(`/relatorio?competencia=${competencia}`),
    [competencia],
  );

  const t = data?.totais;

  return (
    <>
      <header className="screen-header">
        <h1>Relatório</h1>
        <p className="subtitle">Resumo do mês por casa</p>
      </header>

      <div className="screen-body">
        <div className="month-nav" style={{ marginTop: 0 }}>
          <button
            aria-label="Mês anterior"
            onClick={() => setCompetencia((c) => deslocarCompetencia(c, -1))}
          >
            <Icon name="chevronLeft" size={20} />
          </button>
          <span className="month-label">{formatarCompetencia(competencia)}</span>
          <button
            aria-label="Próximo mês"
            onClick={() => setCompetencia((c) => deslocarCompetencia(c, 1))}
          >
            <Icon name="chevronRight" size={20} />
          </button>
        </div>

        <div className="stat-row" style={{ marginTop: 16 }}>
          <div className="stat">
            <span className="label">
              <Icon name="check" size={15} color="var(--secondary)" /> Recebido
            </span>
            <div className="value">
              {formatarCentavos(t?.total_recebido_centavos ?? 0)}
            </div>
          </div>
          <div className="stat">
            <span className="label">
              <Icon name="clock" size={15} color="var(--accent)" /> Em aberto
            </span>
            <div className="value is-accent">
              {formatarCentavos(t?.total_em_aberto_centavos ?? 0)}
            </div>
          </div>
        </div>

        {t && (
          <div className="card" style={{ marginTop: 14 }}>
            <Linha rotulo="A receber (total)" valor={t.total_a_receber_centavos} />
            <Linha rotulo="Despesas do mês" valor={t.total_despesas_centavos} />
          </div>
        )}

        <h2 className="section-title">Por casa</h2>

        {loading && <p className="loading">Carregando…</p>}
        {error && <p className="error-text">{error}</p>}
        {data && !loading && data.casas.length === 0 && (
          <p className="empty">Nenhuma casa com lançamentos neste mês.</p>
        )}

        {data?.casas.map((c) => (
          <div className="card" key={c.casa_id} style={{ marginBottom: 12 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                fontWeight: 700,
              }}
            >
              <span>{c.casa_nome}</span>
              <span
                className={c.em_aberto_centavos > 0 ? "li-amount is-accent" : "li-amount"}
              >
                {formatarCentavos(c.em_aberto_centavos)} em aberto
              </span>
            </div>
            <div style={{ marginTop: 10 }}>
              <Linha rotulo="Aluguel" valor={c.aluguel_centavos} compacto />
              <Linha rotulo="Água" valor={c.agua_centavos} compacto />
              <Linha rotulo="Luz" valor={c.luz_centavos} compacto />
              <Linha rotulo="Pago" valor={c.total_pago_centavos} compacto />
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function Linha({
  rotulo,
  valor,
  compacto,
}: {
  rotulo: string;
  valor: number;
  compacto?: boolean;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: compacto ? "4px 0" : "8px 0",
        fontSize: compacto ? 14 : 15,
        color: compacto ? "var(--ink-soft)" : "var(--ink)",
      }}
    >
      <span>{rotulo}</span>
      <span style={{ fontWeight: 600 }}>{formatarCentavos(valor)}</span>
    </div>
  );
}
