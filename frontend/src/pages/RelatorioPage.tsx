import { useState } from "react";
import {
  api,
  ApiError,
  type CategoriaDespesa,
  type Casa,
  type Despesa,
  type ItemCobranca,
  type Relatorio,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon, type IconName } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { GraficoDonut } from "../components/GraficoDonut";
import { GraficoVisaoMensal } from "../components/GraficoVisaoMensal";
import { Alert } from "../components/Alert";
import { ConfirmarExclusao } from "../components/ConfirmarExclusao";
import { CobrancasCasa } from "../components/CobrancasCasa";
import {
  competenciaAtual,
  deslocarCompetencia,
  formatarCentavos,
  formatarCompetencia,
  formatarDiaMes,
} from "../lib/format";

// Valor sentinela do seletor para a visão da própria casa administradora.
const ADMIN = "__ADMIN__";

// Ícone por categoria de despesa (fallback "receipt").
const ICONE_CATEGORIA: Record<CategoriaDespesa, IconName> = {
  MANUTENCAO: "wrench",
  REPARO: "hammer",
  IMPOSTO: "landmark",
  OUTROS: "receipt",
};

function iconeDespesa(categoria: CategoriaDespesa | undefined): IconName {
  return (categoria && ICONE_CATEGORIA[categoria]) ?? "receipt";
}

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

  // Visão detalhada por casa (estilo CasaPage), apenas leitura.
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  // Começa na visão da casa administradora (a fatia água/luz dos donos).
  const [casaSelecionada, setCasaSelecionada] = useState<string>(ADMIN);
  const cobrancasCasa = useApi<ItemCobranca[]>(
    () =>
      casaSelecionada && casaSelecionada !== ADMIN
        ? api.get<ItemCobranca[]>(
            `/casas/${casaSelecionada}/cobrancas?competencia=${competencia}`,
          )
        : Promise.resolve([]),
    [casaSelecionada, competencia],
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

  // Quebra do mês: soma aluguel/água/luz de todas as casas + despesas do mês.
  const quebra = (() => {
    const aluguel =
      data?.casas.reduce((s, c) => s + c.aluguel_centavos, 0) ?? 0;
    const agua = data?.casas.reduce((s, c) => s + c.agua_centavos, 0) ?? 0;
    const luz = data?.casas.reduce((s, c) => s + c.luz_centavos, 0) ?? 0;
    const despesasMes = t?.total_despesas_centavos ?? 0;
    const total = aluguel + agua + luz + despesasMes;
    const pct = (v: number) => (total > 0 ? Math.round((v / total) * 100) : 0);
    return [
      { rotulo: "Aluguel", icone: "key" as IconName, valor: aluguel, pct: pct(aluguel) },
      { rotulo: "Água", icone: "water" as IconName, valor: agua, pct: pct(agua) },
      { rotulo: "Luz", icone: "bolt" as IconName, valor: luz, pct: pct(luz) },
      {
        rotulo: "Despesas",
        icone: "receipt" as IconName,
        valor: despesasMes,
        pct: pct(despesasMes),
      },
    ];
  })();

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
        title="Relatório"
        subtitle="Resumo do mês por casa e terreno"
        actions={monthNav}
      />

      <div className="apex-stats">
        <div className="apex-stat-card balance">
          <div className="apex-stat-top">
            <span className="apex-stat-label">A receber (total)</span>
            <span className="apex-stat-icon" aria-hidden>
              <Icon name="chart" size={18} />
            </span>
          </div>
          <div className="apex-stat-value">
            {formatarCentavos(t?.total_a_receber_centavos ?? 0)}
          </div>
        </div>
        <div className="apex-stat-card plain">
          <div className="apex-stat-top">
            <span className="apex-stat-label">Recebido</span>
            <span className="apex-stat-icon green" aria-hidden>
              <Icon name="check" size={18} />
            </span>
          </div>
          <div className="apex-stat-value">
            {formatarCentavos(t?.total_recebido_centavos ?? 0)}
          </div>
        </div>
        <div className="apex-stat-card plain">
          <div className="apex-stat-top">
            <span className="apex-stat-label">Em aberto</span>
            <span className="apex-stat-icon warn" aria-hidden>
              <Icon name="clock" size={18} />
            </span>
          </div>
          <div className="apex-stat-value">
            {formatarCentavos(t?.total_em_aberto_centavos ?? 0)}
          </div>
        </div>
      </div>

      {data && (
        <GraficoVisaoMensal
          competencia={competencia}
          recebido={t?.total_recebido_centavos ?? 0}
          emAberto={t?.total_em_aberto_centavos ?? 0}
        />
      )}

      <div className="apex-grid-mid">
        {data && (
          <div className="apex-panel">
            <div className="apex-panel-head">
              <h2 className="apex-panel-title">Resumo do mês</h2>
            </div>
            <div className="quebra-grid">
              {quebra.map((q) => (
                <div className="quebra-card" key={q.rotulo}>
                  <div className="quebra-topo">
                    <div className="quebra-icone">
                      <Icon name={q.icone} size={20} />
                    </div>
                    <span className="quebra-pct">{q.pct}%</span>
                  </div>
                  <div>
                    <div className="quebra-rotulo">{q.rotulo}</div>
                    <div className="quebra-valor">
                      {formatarCentavos(q.valor)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            {t && (
              <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--apex-line)" }}>
                <Linha rotulo="Despesas do mês" valor={t.total_despesas_centavos} />
              </div>
            )}
          </div>
        )}
        {data && (
          <div className="apex-panel">
            <div className="apex-panel-head">
              <h2 className="apex-panel-title">Composição</h2>
            </div>
            <GraficoDonut
              fatias={quebra.slice(0, 3).map((q, i) => ({
                rotulo: q.rotulo,
                valor: q.valor,
                cor: ["var(--apex-primary)", "var(--apex-secondary)", "var(--apex-muted)"][i],
              }))}
            />
          </div>
        )}

        {data?.administradora && (
          <div className="apex-panel">
            <h2
              className="apex-panel-title"
              style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}
            >
              <Icon name="home" size={18} color="var(--secondary)" />
              Casa administradora
            </h2>
            <div>
              <div className="admin-total">
                {formatarCentavos(data.administradora.total_centavos)}
              </div>
              <div style={{ marginTop: 4 }}>
                <Linha
                  rotulo="Água"
                  valor={data.administradora.agua_centavos}
                  compacto
                />
                <Linha
                  rotulo="Luz"
                  valor={data.administradora.luz_centavos}
                  compacto
                />
              </div>
            </div>
            <Alert>
              Esta é a parte da casa administradora nas contas de água/luz (entra
              na divisão por cabeça, mas não é cobrada dos inquilinos).
            </Alert>
          </div>
        )}

        <h2 className="section-title">Por casa</h2>

        {loading && <p className="loading">Carregando…</p>}
        {error && <p className="error-text">{error}</p>}
        {data && !loading && data.casas.length === 0 && (
          <p className="empty">Nenhuma casa com lançamentos neste mês.</p>
        )}

        {data?.casas.map((c) => (
          <div className="apex-panel" key={c.casa_id} style={{ marginBottom: 12 }}>
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

        <h2 className="section-title">Por casa (detalhe)</h2>

        <div className="casa-picker">
          <label htmlFor="casa-detalhe">Selecione uma casa</label>
          <select
            id="casa-detalhe"
            value={casaSelecionada}
            onChange={(e) => setCasaSelecionada(e.target.value)}
          >
            <option value={ADMIN}>Casa administradora</option>
            {casas.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </div>

        {casas.error && <p className="error-text">{casas.error}</p>}

        {casaSelecionada === ADMIN ? (
          (data?.administradora.itens.length ?? 0) === 0 ? (
            <p className="empty">Nenhuma conta de água/luz neste mês.</p>
          ) : (
            data?.administradora.itens.map((item) => (
              <div className="list-item cobranca-pendente" key={item.conta_id}>
                <div className="badge-icon">
                  <Icon name={item.tipo === "AGUA" ? "water" : "bolt"} size={22} />
                </div>
                <div className="li-main">
                  <div className="li-title">
                    {item.tipo === "AGUA" ? "Água" : "Luz"}
                  </div>
                  <div className="li-sub">
                    Vence {formatarDiaMes(item.vencimento)}
                    {item.terreno_nome ? ` · ${item.terreno_nome}` : ""}
                  </div>
                </div>
                <div className="li-right">
                  <div className="li-amount">
                    {formatarCentavos(item.valor_centavos)}
                  </div>
                </div>
              </div>
            ))
          )
        ) : (
          casaSelecionada && (
            <>
              {cobrancasCasa.loading && <p className="loading">Carregando…</p>}
              {cobrancasCasa.error && (
                <p className="error-text">{cobrancasCasa.error}</p>
              )}
              {cobrancasCasa.data &&
                !cobrancasCasa.loading &&
                cobrancasCasa.data.length === 0 && (
                  <p className="empty">Nenhuma cobrança lançada neste mês.</p>
                )}
              {cobrancasCasa.data && !cobrancasCasa.loading && (
                <CobrancasCasa itens={cobrancasCasa.data} />
              )}
            </>
          )
        )}

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
                <Icon name={iconeDespesa(d.categoria)} size={22} />
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
    </div>
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
