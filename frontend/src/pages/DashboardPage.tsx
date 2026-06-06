import { useState } from "react";
import {
  api,
  confirmarAluguel,
  confirmarRateio,
  type Dashboard,
  type ItemPendente,
  type Relatorio,
  type TipoPendencia,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon, type IconName } from "../components/Icon";
import { AtalhosRapidos } from "../components/AtalhosRapidos";
import { PageHeader } from "../components/PageHeader";
import { GraficoMensal } from "../components/GraficoMensal";
import { GraficoDonut } from "../components/GraficoDonut";
import {
  competenciaAtual,
  deslocarCompetencia,
  formatarCentavos,
  formatarCompetencia,
  formatarDiaMes,
} from "../lib/format";

const ICONE: Record<TipoPendencia, IconName> = {
  ALUGUEL: "key",
  AGUA: "water",
  LUZ: "bolt",
};

const ROTULO: Record<TipoPendencia, string> = {
  ALUGUEL: "Aluguel",
  AGUA: "Água",
  LUZ: "Luz",
};

function rotuloPrazo(dias: number | null): string {
  if (dias == null) return "vence em breve";
  if (dias <= 0) return "vence hoje";
  if (dias === 1) return "vence amanhã";
  return `vence em ${dias} dias`;
}

export function DashboardPage() {
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());

  const dash = useApi<Dashboard>(
    () => api.get<Dashboard>(`/dashboard?competencia=${competencia}`),
    [competencia],
  );
  const rel = useApi<Relatorio>(
    () => api.get<Relatorio>(`/relatorio?competencia=${competencia}`),
    [competencia],
  );

  const [confirmando, setConfirmando] = useState<string | null>(null);

  async function confirmar(p: ItemPendente) {
    const id = p.aluguel_id ?? p.rateio_id;
    if (!id) return;
    setConfirmando(id);
    try {
      if (p.aluguel_id) await confirmarAluguel(p.aluguel_id, true);
      else if (p.rateio_id) await confirmarRateio(p.rateio_id, true);
      dash.reload();
      rel.reload();
    } finally {
      setConfirmando(null);
    }
  }

  const recebido = rel.data?.totais.total_recebido_centavos ?? 0;
  const aReceber = rel.data?.totais.total_em_aberto_centavos ?? 0;
  const aReceberTotal = rel.data?.totais.total_a_receber_centavos ?? 0;
  const pct =
    aReceberTotal > 0 ? Math.round((recebido / aReceberTotal) * 100) : 0;

  const aluguel =
    rel.data?.casas.reduce((s, c) => s + c.aluguel_centavos, 0) ?? 0;
  const agua = rel.data?.casas.reduce((s, c) => s + c.agua_centavos, 0) ?? 0;
  const luz = rel.data?.casas.reduce((s, c) => s + c.luz_centavos, 0) ?? 0;

  const monthNav = (
    <div className="apex-month-nav">
      <button
        type="button"
        aria-label="Mês anterior"
        onClick={() => setCompetencia((c) => deslocarCompetencia(c, -1))}
      >
        <Icon name="chevronLeft" size={18} />
      </button>
      <span>{formatarCompetencia(competencia)}</span>
      <button
        type="button"
        aria-label="Próximo mês"
        onClick={() => setCompetencia((c) => deslocarCompetencia(c, 1))}
      >
        <Icon name="chevronRight" size={18} />
      </button>
    </div>
  );

  return (
    <div className="apex-page">
      <PageHeader
        title="Olá"
        subtitle={`Acompanhe aluguéis e rateio de ${formatarCompetencia(competencia)}`}
        actions={monthNav}
        showMenuButton={false}
      />

      <AtalhosRapidos />

      <div className="apex-stats">
        <div className="apex-stat-card balance">
          <div className="apex-stat-top">
            <span className="apex-stat-label">Total do mês</span>
            <span className="apex-stat-icon" aria-hidden>
              <Icon name="key" size={18} />
            </span>
          </div>
          <div className="apex-stat-value">{formatarCentavos(aReceberTotal)}</div>
          <span className="apex-trend up">{pct}% recebido</span>
        </div>
        <div className="apex-stat-card plain">
          <div className="apex-stat-top">
            <span className="apex-stat-label">Recebido</span>
            <span className="apex-stat-icon green" aria-hidden>
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="apex-stat-value">{formatarCentavos(recebido)}</div>
          <span className="apex-trend up">confirmado</span>
        </div>
        <div className="apex-stat-card plain">
          <div className="apex-stat-top">
            <span className="apex-stat-label">Em aberto</span>
            <span className="apex-stat-icon warn" aria-hidden>
              <Icon name="clock" size={18} />
            </span>
          </div>
          <div className="apex-stat-value">{formatarCentavos(aReceber)}</div>
          <span className="apex-trend down">
            {dash.data?.qtd_itens_atrasados ?? 0} atrasada(s)
          </span>
        </div>
      </div>

      <div className="apex-grid-mid">
        <div className="apex-panel">
          <div className="apex-panel-head">
            <h2 className="apex-panel-title">Recebimentos do mês</h2>
            <div className="apex-panel-actions">
              <span className="apex-btn-ghost">Por casa</span>
            </div>
          </div>
          <GraficoMensal
            recebido={recebido}
            emAberto={aReceber}
            competenciaLabel={formatarCompetencia(competencia)}
          />
        </div>
        <div className="apex-panel">
          <div className="apex-panel-head">
            <h2 className="apex-panel-title">Composição</h2>
          </div>
          <GraficoDonut
            fatias={[
              { rotulo: "Aluguel", valor: aluguel, cor: "var(--apex-primary)" },
              { rotulo: "Água", valor: agua, cor: "var(--apex-secondary)" },
              { rotulo: "Luz", valor: luz, cor: "var(--apex-muted)" },
            ]}
          />
        </div>
      </div>

      <div className="apex-grid-bottom">
        <div className="apex-panel">
          <div className="apex-panel-head">
            <h2 className="apex-panel-title">
              Pendências
              {dash.data && dash.data.qtd_itens_proximos > 0 && (
                <span className="tag tag-warn" style={{ marginLeft: 8, fontSize: 11 }}>
                  {dash.data.qtd_itens_proximos} vencendo
                </span>
              )}
            </h2>
          </div>

          {(dash.loading || rel.loading) && (
            <p className="loading">Carregando…</p>
          )}
          {dash.error && <p className="error-text">{dash.error}</p>}

          {dash.data && !dash.loading && dash.data.pendencias.length === 0 && (
            <p className="empty">Tudo em dia neste mês!</p>
          )}

          {dash.data?.pendencias.map((p, i) => {
            const id = p.aluguel_id ?? p.rateio_id ?? `${i}`;
            return (
              <div className="list-item" key={`${p.tipo}-${p.casa_id}-${i}`}>
                <div
                  className={`badge-icon ${
                    p.atrasado ? "is-accent" : p.vence_em_breve ? "is-warn" : ""
                  }`}
                >
                  <Icon name={ICONE[p.tipo]} size={22} />
                </div>
                <div className="li-main">
                  <div className="li-title">
                    {p.casa_nome ?? "Casa"} · {ROTULO[p.tipo]}
                  </div>
                  <div className="li-sub">
                    Vence {formatarDiaMes(p.vencimento)}
                    {p.atrasado && (
                      <span className="tag" style={{ marginLeft: 6 }}>
                        atrasado
                      </span>
                    )}
                    {!p.atrasado && p.vence_em_breve && (
                      <span className="tag tag-warn" style={{ marginLeft: 6 }}>
                        {rotuloPrazo(p.dias_para_vencer)}
                      </span>
                    )}
                  </div>
                </div>
                <div className="li-right">
                  <div className={`li-amount ${p.atrasado ? "is-accent" : ""}`}>
                    {formatarCentavos(p.valor_centavos)}
                  </div>
                  <button
                    className="confirm-btn"
                    aria-label="Confirmar recebimento"
                    disabled={confirmando === id}
                    onClick={() => confirmar(p)}
                  >
                    <Icon name="check" size={20} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="apex-panel">
          <div className="apex-panel-head">
            <h2 className="apex-panel-title">Por casa</h2>
          </div>
          {rel.data?.casas.map((c) => (
            <div className="apex-casa-card" key={c.casa_id}>
              <div>
                <div className="apex-casa-nome">{c.casa_nome}</div>
                <div className="apex-casa-sub">
                  Pago {formatarCentavos(c.total_pago_centavos)}
                </div>
              </div>
              <div
                className={`apex-casa-valor${c.em_aberto_centavos > 0 ? " is-open" : ""}`}
              >
                {formatarCentavos(c.em_aberto_centavos)}
              </div>
            </div>
          ))}
          {rel.data && rel.data.casas.length === 0 && (
            <p className="empty">Nenhuma casa com lançamentos.</p>
          )}
        </div>
      </div>

    </div>
  );
}
