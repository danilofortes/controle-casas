import { useState } from "react";
import { api, ApiError, type Despesa, type Relatorio } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon } from "../components/Icon";
import { ConfirmarExclusao } from "../components/ConfirmarExclusao";
import {
  competenciaAtual,
  deslocarCompetencia,
  formatarCentavos,
  formatarCompetencia,
} from "../lib/format";

export function RelatorioPage() {
  const [competencia, setCompetencia] = useState<string>(competenciaAtual());
  const {
    data,
    loading,
    error,
    reload: reloadRelatorio,
  } = useApi<Relatorio>(
    () => api.get<Relatorio>(`/relatorio?competencia=${competencia}`),
    [competencia],
  );
  const despesas = useApi<Despesa[]>(
    () => api.get<Despesa[]>(`/despesas?competencia=${competencia}`),
    [competencia],
  );

  const [confirmando, setConfirmando] = useState<Despesa | null>(null);
  const [excluindo, setExcluindo] = useState(false);

  async function excluirDespesa() {
    const d = confirmando;
    if (!d) return;
    setExcluindo(true);
    try {
      await api.del(`/despesas/${d.id}`);
      setConfirmando(null);
      despesas.reload();
      // O resumo mostra o total de despesas do mês, então recarrega também.
      reloadRelatorio();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Não foi possível excluir.");
    } finally {
      setExcluindo(false);
    }
  }

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

        <h2 className="section-title">Despesas</h2>

        {despesas.loading && <p className="loading">Carregando…</p>}
        {despesas.error && <p className="error-text">{despesas.error}</p>}
        {despesas.data && !despesas.loading && despesas.data.length === 0 && (
          <p className="empty">Nenhuma despesa neste mês.</p>
        )}

        {despesas.data?.map((d) => {
          const local = d.casa_nome ?? d.terreno_nome;
          return (
            <div className="list-item" key={d.id}>
              <div className="badge-icon">
                <Icon name="receipt" size={22} />
              </div>
              <div className="li-main">
                <div className="li-title">{d.descricao}</div>
                <div className="li-sub">{local ?? "Sem vínculo"}</div>
              </div>
              <div className="li-right">
                <div className="li-amount">
                  {formatarCentavos(d.valor_centavos)}
                </div>
                <button
                  className="confirm-btn is-danger"
                  aria-label="Excluir despesa"
                  onClick={() => setConfirmando(d)}
                >
                  <Icon name="trash" size={18} />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {confirmando && (
        <ConfirmarExclusao
          titulo="Excluir despesa"
          descricao={
            <>
              Excluir a despesa <strong>"{confirmando.descricao}"</strong> (
              {formatarCentavos(confirmando.valor_centavos)})?
            </>
          }
          textoConfirmar="Excluir despesa"
          carregando={excluindo}
          onConfirmar={excluirDespesa}
          onCancelar={() => setConfirmando(null)}
        />
      )}
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
