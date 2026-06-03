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
import { AnelProgresso } from "../components/AnelProgresso";
import { AtalhosRapidos } from "../components/AtalhosRapidos";
import { MenuApp } from "../components/MenuApp";
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
  const [menuAberto, setMenuAberto] = useState(false);

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

  return (
    <>
      <header className="screen-header">
        <div className="header-bar">
          <div>
            <h1>Olá</h1>
            <p className="subtitle">{formatarCompetencia(competencia)}</p>
          </div>
          <button
            className="back-btn header-menu-btn"
            aria-label="Abrir menu"
            onClick={() => setMenuAberto(true)}
          >
            <Icon name="menu" size={22} />
          </button>
        </div>
      </header>

      <div className="screen-body">
        <AtalhosRapidos />

        <div className="stat-row">
          <div className="stat">
            <span className="label">
              <Icon name="check" size={15} color="var(--secondary)" /> Recebido
            </span>
            <div className="value">{formatarCentavos(recebido)}</div>
          </div>
          <div className="stat">
            <span className="label">
              <Icon name="clock" size={15} color="var(--accent)" /> A receber
            </span>
            <div className="value is-accent">{formatarCentavos(aReceber)}</div>
          </div>
        </div>

        <div className="card progresso-card" style={{ marginTop: 14 }}>
          <AnelProgresso valor={pct} tamanho={116} espessura={12} />
          <div className="progresso-info">
            <div className="progresso-rotulo">% recebido do mês</div>
            <div className="progresso-valor">{formatarCentavos(recebido)}</div>
            <div className="progresso-legenda">
              <Icon name="key" size={15} />
              de {formatarCentavos(aReceberTotal)} a receber
            </div>
          </div>
        </div>

        <div className="month-nav">
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

        <h2 className="section-title">
          Pendências
          {dash.data && dash.data.qtd_itens_atrasados > 0 && (
            <span className="tag" style={{ marginLeft: 8 }}>
              {dash.data.qtd_itens_atrasados} atrasada(s)
            </span>
          )}
          {dash.data && dash.data.qtd_itens_proximos > 0 && (
            <span className="tag tag-warn" style={{ marginLeft: 8 }}>
              {dash.data.qtd_itens_proximos} vencendo
            </span>
          )}
        </h2>

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

      {menuAberto && <MenuApp onClose={() => setMenuAberto(false)} />}
    </>
  );
}
