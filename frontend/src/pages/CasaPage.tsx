import { useEffect, useState, type ReactNode } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  api,
  ApiError,
  confirmarAluguel,
  confirmarRateio,
  type Casa,
  type ContaDetalhe,
  type ItemCobranca,
  type Morador,
  type Terreno,
} from "../lib/api";
import { useApi, type UseApiResult } from "../lib/useApi";
import {
  competenciaAtual,
  deslocarCompetencia,
  formatarCentavos,
  formatarCompetencia,
  formatarDataCompleta,
  formatarDiaMes,
  hoje,
  paraCentavos,
} from "../lib/format";
import {
  PARENTESCO_OPCOES,
  SEXO_OPCOES,
  rotuloParentesco,
  rotuloSexo,
} from "../lib/morador";
import { Alert } from "../components/Alert";
import { Modal } from "../components/Modal";
import { ConfirmarExclusao } from "../components/ConfirmarExclusao";
import { Icon } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { CobrancasCasa, ROTULO } from "../components/CobrancasCasa";

type Aba = "cobrancas" | "moradores";

export function CasaPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const [aba, setAba] = useState<Aba>("cobrancas");
  const [excluindo, setExcluindo] = useState(false);
  const [confirmandoCasa, setConfirmandoCasa] = useState(false);
  const [editandoCasa, setEditandoCasa] = useState(false);

  const casa = useApi<Casa>(() => api.get<Casa>(`/casas/${id}`), [id]);
  const moradores = useApi<Morador[]>(
    () => api.get<Morador[]>(`/casas/${id}/moradores?incluir_inativos=true`),
    [id],
  );
  // Nome do terreno para enriquecer a mensagem de confirmação.
  const terrenoId = casa.data?.terreno_id;
  const terreno = useApi<Terreno | null>(
    () =>
      terrenoId
        ? api.get<Terreno>(`/terrenos/${terrenoId}`)
        : Promise.resolve(null),
    [terrenoId],
  );

  async function excluirCasa() {
    // A confirmação rica já informou a cascata, então enviamos confirmar=true.
    setExcluindo(true);
    try {
      await api.del(`/casas/${id}?confirmar=true`);
      navigate("/casas");
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Não foi possível excluir.");
      setExcluindo(false);
    }
  }

  const nomeCasa = casa.data?.nome ?? "esta casa";
  const nomeTerreno = terreno.data?.nome;
  const moradoresLista = moradores.data ?? [];
  const itensCasa: string[] = [];
  if (moradoresLista.length > 0) {
    itensCasa.push(
      `${moradoresLista.length} morador(es) serão excluídos: ${moradoresLista
        .map((m) => m.nome)
        .join(", ")}.`,
    );
  }
  itensCasa.push(
    "Todas as cobranças de aluguel e os rateios de contas desta casa também serão removidos.",
  );

  return (
    <div className="ui-page">
      <PageHeader
        title={casa.data?.nome ?? "Casa"}
        subtitle="Cobranças e moradores"
        showNovo={false}
        actions={
          <div style={{ display: "flex", gap: 8 }}>
            <button
              type="button"
              className="ui-btn-ghost"
              aria-label="Editar casa"
              onClick={() => setEditandoCasa(true)}
              disabled={!casa.data}
            >
              <Icon name="edit" size={16} />
              Editar
            </button>
            <button
              type="button"
              className="ui-btn-ghost"
              aria-label="Voltar"
              onClick={() => navigate("/casas")}
            >
              <Icon name="chevronLeft" size={16} />
              Voltar
            </button>
          </div>
        }
      />

      <div className="ui-panel">
        <div className="tabs">
          <button
            className={aba === "cobrancas" ? "active" : ""}
            onClick={() => setAba("cobrancas")}
          >
            Cobranças
          </button>
          <button
            className={aba === "moradores" ? "active" : ""}
            onClick={() => setAba("moradores")}
          >
            Moradores
          </button>
        </div>

        {aba === "cobrancas" ? (
          <Cobrancas casaId={id} moradores={moradores.data ?? []} />
        ) : (
          <Moradores casaId={id} lista={moradores} />
        )}

        <button
          className="btn-excluir"
          onClick={() => setConfirmandoCasa(true)}
          disabled={excluindo}
        >
          <Icon name="trash" size={18} />
          Excluir casa
        </button>
      </div>

      {editandoCasa && casa.data && (
        <Modal title="Editar casa" onClose={() => setEditandoCasa(false)}>
          <EdicaoCasa
            casa={casa.data}
            onCancel={() => setEditandoCasa(false)}
            onSaved={() => {
              setEditandoCasa(false);
              casa.reload();
            }}
          />
        </Modal>
      )}

      {confirmandoCasa && (
        <ConfirmarExclusao
          titulo="Excluir casa"
          descricao={
            nomeTerreno ? (
              <>
                Excluir a casa <strong>"{nomeCasa}"</strong> do terreno{" "}
                <strong>"{nomeTerreno}"</strong>?
              </>
            ) : (
              <>
                Excluir a casa <strong>"{nomeCasa}"</strong>?
              </>
            )
          }
          itens={itensCasa}
          textoConfirmar="Excluir casa"
          carregando={excluindo}
          onConfirmar={excluirCasa}
          onCancelar={() => setConfirmandoCasa(false)}
        />
      )}
    </div>
  );
}

function EdicaoCasa({
  casa,
  onCancel,
  onSaved,
}: {
  casa: Casa;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const terrenos = useApi<Terreno[]>(() => api.get<Terreno[]>("/terrenos"), []);
  const [terrenoId, setTerrenoId] = useState(casa.terreno_id);
  const [nome, setNome] = useState(casa.nome);
  const [aluguel, setAluguel] = useState(formatarCentavos(casa.aluguel_centavos));
  const [dia, setDia] = useState(String(casa.dia_vencimento));
  const [ativo, setAtivo] = useState(casa.ativo);
  const [obs, setObs] = useState(casa.observacoes ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.put(`/casas/${casa.id}`, {
        terreno_id: terrenoId,
        nome: nome.trim(),
        aluguel_centavos: paraCentavos(aluguel),
        dia_vencimento: Number(dia) || 10,
        ativo,
        observacoes: obs.trim() || null,
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 0 }}>
      <div className="field">
        <label>Terreno</label>
        <select
          value={terrenoId}
          onChange={(e) => setTerrenoId(e.target.value)}
          disabled={terrenos.loading}
        >
          {terrenos.data?.map((t) => (
            <option key={t.id} value={t.id}>
              {t.nome}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Nome da casa</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="field">
        <label>Aluguel mensal</label>
        <input
          value={aluguel}
          onChange={(e) => setAluguel(e.target.value)}
          inputMode="decimal"
          placeholder="R$ 0,00"
        />
        <p className="hint">
          Ao alterar, cobranças recorrentes não pagas deste mês em diante
          acompanham o novo valor.
        </p>
      </div>
      <div className="field">
        <label>Dia de vencimento</label>
        <input
          type="number"
          min={1}
          max={31}
          value={dia}
          onChange={(e) => setDia(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Observações (opcional)</label>
        <textarea value={obs} onChange={(e) => setObs(e.target.value)} />
      </div>
      <div className="check-row">
        <input
          id="edit-casa-ativo"
          type="checkbox"
          checked={ativo}
          onChange={(e) => setAtivo(e.target.checked)}
        />
        <label htmlFor="edit-casa-ativo">Casa ativa (alugada)</label>
      </div>
      {erro && <p className="error-text">{erro}</p>}
      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={onCancel}
          disabled={salvando}
        >
          Cancelar
        </button>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar casa"}
        </button>
      </div>
    </div>
  );
}

function Cobrancas({
  casaId,
  moradores,
}: {
  casaId: string;
  moradores: Morador[];
}) {
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [busy, setBusy] = useState<string | null>(null);
  // Item cuja exclusão está sendo confirmada (aluguel ou conta).
  const [confirmando, setConfirmando] = useState<ItemCobranca | null>(null);
  const [excluindo, setExcluindo] = useState(false);
  // Detalhe da conta para listar as casas afetadas pelo rateio.
  const [contaDetalhe, setContaDetalhe] = useState<ContaDetalhe | null>(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);

  const itens = useApi<ItemCobranca[]>(
    () =>
      api.get<ItemCobranca[]>(
        `/casas/${casaId}/cobrancas?competencia=${competencia}`,
      ),
    [competencia],
  );

  const adultos = moradores
    .filter((m) => m.adulto && !m.data_saida)
    .map((m) => m.nome);

  // Ao confirmar a exclusão de uma conta de água/luz, busca o detalhe para
  // listar todas as casas cujo rateio será removido.
  useEffect(() => {
    if (!confirmando || confirmando.aluguel_id || !confirmando.conta_id) {
      setContaDetalhe(null);
      return;
    }
    let ativo = true;
    setCarregandoDetalhe(true);
    setContaDetalhe(null);
    api
      .get<ContaDetalhe>(`/contas/${confirmando.conta_id}`)
      .then((d) => ativo && setContaDetalhe(d))
      .catch(() => ativo && setContaDetalhe(null))
      .finally(() => ativo && setCarregandoDetalhe(false));
    return () => {
      ativo = false;
    };
  }, [confirmando]);

  async function alternar(item: ItemCobranca) {
    const id = item.aluguel_id ?? item.rateio_id;
    if (!id) return;
    setBusy(id);
    try {
      if (item.aluguel_id) await confirmarAluguel(item.aluguel_id, !item.pago);
      else if (item.rateio_id) await confirmarRateio(item.rateio_id, !item.pago);
      itens.reload();
    } finally {
      setBusy(null);
    }
  }

  async function confirmarExclusao() {
    const item = confirmando;
    if (!item) return;
    setExcluindo(true);
    try {
      if (item.aluguel_id) {
        await api.del(`/alugueis/${item.aluguel_id}`);
      } else if (item.conta_id) {
        // Exclui a conta inteira do mês: remove o rateio de todas as casas.
        await api.del(`/contas/${item.conta_id}`);
      }
      setConfirmando(null);
      itens.reload();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Não foi possível excluir.");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <>
      <Alert>
        {adultos.length > 0 ? (
          <>
            Débito em nome de: <strong>{adultos.join(", ")}</strong>
          </>
        ) : (
          "Nenhum adulto cadastrado nesta casa. Adicione um na aba Moradores — o débito fica sempre no nome dos adultos."
        )}
      </Alert>

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

      {itens.loading && <p className="loading">Carregando…</p>}
      {itens.error && <p className="error-text">{itens.error}</p>}
      {itens.data && !itens.loading && itens.data.length === 0 && (
        <p className="empty">Nenhuma cobrança lançada neste mês.</p>
      )}

      {itens.data && (
        <CobrancasCasa
          itens={itens.data}
          busy={busy}
          onAlternar={alternar}
          onExcluir={setConfirmando}
        />
      )}

      {confirmando && (
        <ConfirmarExclusao
          titulo={
            confirmando.aluguel_id ? "Excluir cobrança" : "Excluir conta"
          }
          descricao={descricaoConfirmacao(
            confirmando,
            competencia,
            contaDetalhe,
            carregandoDetalhe,
          )}
          itens={itensConfirmacao(confirmando, contaDetalhe, carregandoDetalhe)}
          textoConfirmar="Excluir"
          carregando={excluindo}
          onConfirmar={confirmarExclusao}
          onCancelar={() => setConfirmando(null)}
        />
      )}
    </>
  );
}

/** Texto principal da confirmação de exclusão de uma cobrança/conta. */
function descricaoConfirmacao(
  item: ItemCobranca,
  competencia: string,
  conta: ContaDetalhe | null,
  carregando: boolean,
): ReactNode {
  const mes = formatarCompetencia(item.competencia || competencia);
  if (item.aluguel_id) {
    return (
      <>
        Excluir a cobrança de aluguel de <strong>{mes}</strong> (
        {formatarCentavos(item.valor_centavos)})?
      </>
    );
  }
  // Conta de água/luz: usa o valor total da conta quando disponível.
  const valor = conta
    ? formatarCentavos(conta.valor_total_centavos)
    : carregando
      ? "…"
      : formatarCentavos(item.valor_centavos);
  return (
    <>
      Excluir a conta de <strong>{ROTULO[item.tipo]}</strong> de{" "}
      <strong>{mes}</strong> ({valor})?
    </>
  );
}

/** Itens em cascata da confirmação (casas afetadas pelo rateio da conta). */
function itensConfirmacao(
  item: ItemCobranca,
  conta: ContaDetalhe | null,
  carregando: boolean,
): ReactNode[] {
  if (item.aluguel_id) return [];
  if (carregando) return ["Carregando casas afetadas…"];
  if (conta && conta.rateios.length > 0) {
    const nomes = conta.rateios.map((r) => r.casa_nome ?? "Casa").join(", ");
    return [`O rateio das seguintes casas será excluído: ${nomes}.`];
  }
  // Detalhe indisponível: texto genérico.
  return ["Isto remove o rateio de todas as casas participantes desta conta."];
}

function Moradores({
  casaId,
  lista,
}: {
  casaId: string;
  lista: UseApiResult<Morador[]>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [selecionado, setSelecionado] = useState<Morador | null>(null);
  const [modoEdicao, setModoEdicao] = useState(false);
  const [adicionando, setAdicionando] = useState(false);
  const [novoNome, setNovoNome] = useState("");
  const [novoAdulto, setNovoAdulto] = useState(true);
  const [novaIdade, setNovaIdade] = useState("");
  const [novoParentesco, setNovoParentesco] = useState("");
  const [novoSexo, setNovoSexo] = useState("");
  const [novaEntrada, setNovaEntrada] = useState(hoje());

  async function adicionar() {
    if (!novoNome.trim()) return;
    setBusy("novo");
    try {
      const body: Record<string, unknown> = {
        nome: novoNome.trim(),
        adulto: novoAdulto,
        data_entrada: novaEntrada,
      };
      if (novaIdade.trim()) body.idade = Number(novaIdade);
      if (novoParentesco) body.parentesco = novoParentesco;
      if (novoSexo) body.sexo = novoSexo;
      await api.post(`/casas/${casaId}/moradores`, body);
      setNovoNome("");
      setNovoAdulto(true);
      setNovaIdade("");
      setNovoParentesco("");
      setNovoSexo("");
      setNovaEntrada(hoje());
      setAdicionando(false);
      lista.reload();
    } finally {
      setBusy(null);
    }
  }

  function fechar() {
    setSelecionado(null);
    setModoEdicao(false);
  }

  return (
    <>
      {lista.loading && <p className="loading">Carregando…</p>}
      {lista.error && <p className="error-text">{lista.error}</p>}
      {lista.data && !lista.loading && lista.data.length === 0 && (
        <p className="empty">Nenhum morador cadastrado nesta casa.</p>
      )}

      {lista.data?.map((m) => (
        <button
          className="list-item list-item-btn"
          key={m.id}
          style={{ opacity: m.data_saida ? 0.6 : 1 }}
          onClick={() => {
            setSelecionado(m);
            setModoEdicao(false);
          }}
        >
          <div className="badge-icon">
            <Icon name="users" size={22} />
          </div>
          <div className="li-main">
            <div className="li-title">
              {m.nome}{" "}
              <span className={`tag ${m.adulto ? "" : "tag-neutral"}`}>
                {m.adulto ? "Adulto" : "Criança"}
              </span>
            </div>
            <div className="li-sub">
              Desde {formatarDiaMes(m.data_entrada)}
              {m.data_saida ? ` · saiu em ${formatarDiaMes(m.data_saida)}` : ""}
            </div>
          </div>
          <Icon name="chevronRight" size={18} />
        </button>
      ))}

      {adicionando ? (
        <div className="card" style={{ marginTop: 6 }}>
          <div className="field">
            <label>Nome do morador</label>
            <input
              value={novoNome}
              onChange={(e) => setNovoNome(e.target.value)}
              placeholder="Nome completo"
            />
          </div>
          <div className="field">
            <label>Idade (opcional)</label>
            <input
              type="number"
              min={0}
              max={130}
              value={novaIdade}
              onChange={(e) => setNovaIdade(e.target.value)}
              placeholder="Ex.: 34"
              inputMode="numeric"
            />
          </div>
          <div className="field">
            <label>Data de entrada</label>
            <input
              type="date"
              value={novaEntrada}
              onChange={(e) => setNovaEntrada(e.target.value)}
            />
          </div>
          <div className="field">
            <label>Parentesco (opcional)</label>
            <select
              value={novoParentesco}
              onChange={(e) => setNovoParentesco(e.target.value)}
            >
              <option value="">Selecione</option>
              {PARENTESCO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Sexo (opcional)</label>
            <select value={novoSexo} onChange={(e) => setNovoSexo(e.target.value)}>
              <option value="">Selecione</option>
              {SEXO_OPCOES.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </div>
          <div className="check-row">
            <input
              id="novo-adulto"
              type="checkbox"
              checked={novoAdulto}
              onChange={(e) => setNovoAdulto(e.target.checked)}
            />
            <label htmlFor="novo-adulto">É adulto</label>
          </div>
          <button className="btn" disabled={busy === "novo"} onClick={adicionar}>
            {busy === "novo" ? "Salvando…" : "Adicionar morador"}
          </button>
        </div>
      ) : (
        <button
          className="btn btn-ghost"
          style={{ marginTop: 6 }}
          onClick={() => setAdicionando(true)}
        >
          <Icon name="plus" size={18} />
          Adicionar morador
        </button>
      )}

      {selecionado && (
        <Modal title={selecionado.nome} onClose={fechar}>
          {modoEdicao ? (
            <EdicaoMorador
              morador={selecionado}
              onCancel={() => setModoEdicao(false)}
              onSaved={() => {
                fechar();
                lista.reload();
              }}
            />
          ) : (
            <VisualizarMorador
              morador={selecionado}
              onEditar={() => setModoEdicao(true)}
            />
          )}
        </Modal>
      )}
    </>
  );
}

function InfoLinha({
  rotulo,
  valor,
  vazio,
}: {
  rotulo: string;
  valor: string;
  vazio?: boolean;
}) {
  return (
    <div className="info-linha">
      <span className="info-rotulo">{rotulo}</span>
      <span className={`info-valor ${vazio ? "is-vazio" : ""}`}>{valor}</span>
    </div>
  );
}

function VisualizarMorador({
  morador,
  onEditar,
}: {
  morador: Morador;
  onEditar: () => void;
}) {
  return (
    <div>
      <div className="info-list">
        <InfoLinha rotulo="Tipo" valor={morador.adulto ? "Adulto" : "Criança"} />
        <InfoLinha
          rotulo="Idade"
          valor={morador.idade != null ? `${morador.idade} anos` : "Não informado"}
          vazio={morador.idade == null}
        />
        <InfoLinha
          rotulo="Parentesco"
          valor={rotuloParentesco(morador.parentesco)}
          vazio={!morador.parentesco}
        />
        <InfoLinha
          rotulo="Sexo"
          valor={rotuloSexo(morador.sexo)}
          vazio={!morador.sexo}
        />
        <InfoLinha
          rotulo="Telefone"
          valor={morador.telefone?.trim() ? morador.telefone : "Não informado"}
          vazio={!morador.telefone?.trim()}
        />
        <InfoLinha
          rotulo="Entrada"
          valor={formatarDataCompleta(morador.data_entrada)}
        />
        {morador.data_saida && (
          <InfoLinha
            rotulo="Saída"
            valor={formatarDataCompleta(morador.data_saida)}
          />
        )}
      </div>
      <button className="btn" style={{ marginTop: 16 }} onClick={onEditar}>
        <Icon name="edit" size={18} />
        Editar morador
      </button>
    </div>
  );
}

function EdicaoMorador({
  morador,
  onCancel,
  onSaved,
}: {
  morador: Morador;
  onCancel: () => void;
  onSaved: () => void;
}) {
  const [nome, setNome] = useState(morador.nome);
  const [telefone, setTelefone] = useState(morador.telefone ?? "");
  const [adulto, setAdulto] = useState(morador.adulto);
  const [idade, setIdade] = useState(
    morador.idade != null ? String(morador.idade) : "",
  );
  const [parentesco, setParentesco] = useState(morador.parentesco ?? "");
  const [sexo, setSexo] = useState(morador.sexo ?? "");
  const [entrada, setEntrada] = useState(morador.data_entrada);
  const [saida, setSaida] = useState(morador.data_saida ?? "");
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [confirmandoExcluir, setConfirmandoExcluir] = useState(false);

  async function excluir() {
    setSalvando(true);
    setErro(null);
    try {
      await api.del(`/moradores/${morador.id}`);
      onSaved();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível excluir.");
      setSalvando(false);
    }
  }

  async function salvar() {
    if (!nome.trim()) return;
    setSalvando(true);
    setErro(null);
    try {
      await api.put(`/moradores/${morador.id}`, {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        adulto,
        idade: idade.trim() ? Number(idade) : null,
        parentesco: parentesco || null,
        sexo: sexo || null,
        data_entrada: entrada,
        data_saida: saida || null,
      });
      onSaved();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div className="field">
        <label>Nome</label>
        <input value={nome} onChange={(e) => setNome(e.target.value)} />
      </div>
      <div className="field">
        <label>Parentesco (opcional)</label>
        <select
          value={parentesco}
          onChange={(e) => setParentesco(e.target.value)}
        >
          <option value="">Selecione</option>
          {PARENTESCO_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Sexo (opcional)</label>
        <select value={sexo} onChange={(e) => setSexo(e.target.value)}>
          <option value="">Selecione</option>
          {SEXO_OPCOES.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label>Telefone (opcional)</label>
        <input
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          inputMode="tel"
          placeholder="(00) 00000-0000"
        />
      </div>
      <div className="field">
        <label>Idade (opcional)</label>
        <input
          type="number"
          min={0}
          max={130}
          value={idade}
          onChange={(e) => setIdade(e.target.value)}
          inputMode="numeric"
          placeholder="Ex.: 34"
        />
      </div>
      <div className="field">
        <label>Data de entrada</label>
        <input
          type="date"
          value={entrada}
          onChange={(e) => setEntrada(e.target.value)}
        />
      </div>
      <div className="field">
        <label>Data de saída (opcional)</label>
        <input
          type="date"
          value={saida}
          onChange={(e) => setSaida(e.target.value)}
        />
      </div>
      <div className="check-row">
        <input
          id={`edit-adulto-${morador.id}`}
          type="checkbox"
          checked={adulto}
          onChange={(e) => setAdulto(e.target.checked)}
        />
        <label htmlFor={`edit-adulto-${morador.id}`}>É adulto</label>
      </div>

      {erro && (
        <p className="error-text" style={{ padding: "0 0 12px" }}>
          {erro}
        </p>
      )}

      <div style={{ display: "flex", gap: 8 }}>
        <button
          className="btn btn-ghost"
          style={{ flex: 1 }}
          onClick={onCancel}
          disabled={salvando}
        >
          Cancelar
        </button>
        <button
          className="btn"
          style={{ flex: 1 }}
          onClick={salvar}
          disabled={salvando}
        >
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>

      {confirmandoExcluir ? (
        <div className="excluir-confirm">
          <span>Excluir {morador.nome} definitivamente?</span>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              className="btn-mini"
              onClick={() => setConfirmandoExcluir(false)}
              disabled={salvando}
            >
              Não
            </button>
            <button
              className="btn-mini is-danger"
              onClick={excluir}
              disabled={salvando}
            >
              {salvando ? "Excluindo…" : "Sim, excluir"}
            </button>
          </div>
        </div>
      ) : (
        <button
          className="btn-excluir"
          onClick={() => setConfirmandoExcluir(true)}
          disabled={salvando}
        >
          <Icon name="trash" size={18} />
          Excluir morador
        </button>
      )}
    </div>
  );
}
