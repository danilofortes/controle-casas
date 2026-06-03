import { useState, type FormEvent, type ReactNode } from "react";
import {
  api,
  ApiError,
  type Casa,
  type ContaDetalhe,
  type Terreno,
  type TipoConta,
} from "../../lib/api";
import { useApi } from "../../lib/useApi";
import {
  competenciaAtual,
  formatarCentavos,
  formatarCompetencia,
  hoje,
  paraCentavos,
} from "../../lib/format";
import { Alert } from "../Alert";

export interface FormProps {
  onSaved: (msg: string) => void;
}

/* ---------- Primitivos ---------- */

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

function MoneyInput({
  value,
  onChange,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="input-prefix">
      <span>R$</span>
      <input
        inputMode="decimal"
        placeholder={placeholder ?? "0,00"}
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}

function SubmitBar({
  salvando,
  erro,
  label,
}: {
  salvando: boolean;
  erro: string | null;
  label: string;
}) {
  return (
    <div className="form-actions">
      {erro && (
        <p className="error-text" style={{ padding: "0 0 12px" }}>
          {erro}
        </p>
      )}
      <button className="btn" type="submit" disabled={salvando}>
        {salvando ? "Salvando…" : label}
      </button>
    </div>
  );
}

function useSubmit() {
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  async function run(fn: () => Promise<void>) {
    setSalvando(true);
    setErro(null);
    try {
      await fn();
    } catch (e) {
      setErro(
        e instanceof ApiError
          ? e.message
          : "Não foi possível salvar. Tente novamente.",
      );
    } finally {
      setSalvando(false);
    }
  }

  return { salvando, erro, run };
}

/** Mostra estados de carregamento/erro/vazio antes de renderizar o formulário. */
function Gate({
  loading,
  error,
  vazio,
  mensagemVazio,
  children,
}: {
  loading: boolean;
  error: string | null;
  vazio: boolean;
  mensagemVazio: string;
  children: ReactNode;
}) {
  if (loading) return <p className="loading">Carregando…</p>;
  if (error) return <p className="error-text">{error}</p>;
  if (vazio) return <p className="empty">{mensagemVazio}</p>;
  return <>{children}</>;
}

/* ---------- Terreno ---------- */

export function TerrenoForm({ onSaved }: FormProps) {
  const [nome, setNome] = useState("");
  const [endereco, setEndereco] = useState("");
  const { salvando, erro, run } = useSubmit();

  function submeter(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      await api.post<Terreno>("/terrenos", {
        nome: nome.trim(),
        endereco: endereco.trim() || null,
      });
      onSaved("Terreno cadastrado.");
    });
  }

  return (
    <form onSubmit={submeter}>
      <Field label="Nome do terreno">
        <input
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          placeholder="Ex.: Terreno da Rua das Flores"
          required
        />
      </Field>
      <Field label="Endereço (opcional)">
        <input
          value={endereco}
          onChange={(e) => setEndereco(e.target.value)}
          placeholder="Rua, número, bairro"
        />
      </Field>
      <SubmitBar salvando={salvando} erro={erro} label="Cadastrar terreno" />
    </form>
  );
}

/* ---------- Casa ---------- */

export function CasaForm({ onSaved }: FormProps) {
  const terrenos = useApi<Terreno[]>(() => api.get<Terreno[]>("/terrenos"), []);
  const [terrenoId, setTerrenoId] = useState("");
  const [nome, setNome] = useState("");
  const [aluguel, setAluguel] = useState("");
  const [dia, setDia] = useState("10");
  const [ativo, setAtivo] = useState(true);
  const [obs, setObs] = useState("");
  const { salvando, erro, run } = useSubmit();

  function submeter(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      await api.post<Casa>("/casas", {
        terreno_id: terrenoId,
        nome: nome.trim(),
        aluguel_centavos: paraCentavos(aluguel),
        dia_vencimento: Number(dia) || 10,
        ativo,
        observacoes: obs.trim() || null,
      });
      onSaved("Casa cadastrada.");
    });
  }

  return (
    <Gate
      loading={terrenos.loading}
      error={terrenos.error}
      vazio={(terrenos.data?.length ?? 0) === 0}
      mensagemVazio="Cadastre um terreno antes de adicionar casas."
    >
      <form onSubmit={submeter}>
        <Field label="Terreno">
          <select
            value={terrenoId}
            onChange={(e) => setTerrenoId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione o terreno
            </option>
            {terrenos.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome/identificação da casa">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Ex.: Casa 1, Casa dos fundos"
            required
          />
        </Field>
        <Field label="Aluguel mensal" hint="Valor padrão sugerido nas cobranças.">
          <MoneyInput value={aluguel} onChange={setAluguel} />
        </Field>
        <Field label="Dia de vencimento">
          <input
            type="number"
            min={1}
            max={31}
            value={dia}
            onChange={(e) => setDia(e.target.value)}
          />
        </Field>
        <Field label="Observações (opcional)">
          <textarea
            value={obs}
            onChange={(e) => setObs(e.target.value)}
            placeholder="Anotações sobre a casa"
          />
        </Field>
        <div className="check-row">
          <input
            id="casa-ativo"
            type="checkbox"
            checked={ativo}
            onChange={(e) => setAtivo(e.target.checked)}
          />
          <label htmlFor="casa-ativo">Casa ativa (alugada)</label>
        </div>
        <SubmitBar salvando={salvando} erro={erro} label="Cadastrar casa" />
      </form>
    </Gate>
  );
}

/* ---------- Morador ---------- */

export function MoradorForm({ onSaved }: FormProps) {
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  const [casaId, setCasaId] = useState("");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");
  const [adulto, setAdulto] = useState(true);
  const [idade, setIdade] = useState("");
  const [entrada, setEntrada] = useState(hoje());
  const [saida, setSaida] = useState("");
  const { salvando, erro, run } = useSubmit();

  function submeter(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const body: Record<string, unknown> = {
        nome: nome.trim(),
        telefone: telefone.trim() || null,
        adulto,
        data_entrada: entrada,
        data_saida: saida || null,
      };
      if (idade.trim()) body.idade = Number(idade);
      await api.post(`/casas/${casaId}/moradores`, body);
      onSaved("Morador registrado.");
    });
  }

  return (
    <Gate
      loading={casas.loading}
      error={casas.error}
      vazio={(casas.data?.length ?? 0) === 0}
      mensagemVazio="Cadastre uma casa antes de adicionar moradores."
    >
      <form onSubmit={submeter}>
        <Field label="Casa">
          <select
            value={casaId}
            onChange={(e) => setCasaId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione a casa
            </option>
            {casas.data?.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Nome do morador">
          <input
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            placeholder="Nome completo"
            required
          />
        </Field>
        <Field label="Telefone (opcional)">
          <input
            value={telefone}
            onChange={(e) => setTelefone(e.target.value)}
            placeholder="(00) 00000-0000"
            inputMode="tel"
          />
        </Field>
        <Field label="Idade (opcional)">
          <input
            type="number"
            min={0}
            max={130}
            value={idade}
            onChange={(e) => setIdade(e.target.value)}
            placeholder="Ex.: 34"
            inputMode="numeric"
          />
        </Field>
        <Field label="Data de entrada">
          <input
            type="date"
            value={entrada}
            onChange={(e) => setEntrada(e.target.value)}
            required
          />
        </Field>
        <Field
          label="Data de saída (opcional)"
          hint="Preencha apenas quando o morador deixar a casa."
        >
          <input
            type="date"
            value={saida}
            onChange={(e) => setSaida(e.target.value)}
          />
        </Field>
        <div className="check-row">
          <input
            id="morador-adulto"
            type="checkbox"
            checked={adulto}
            onChange={(e) => setAdulto(e.target.checked)}
          />
          <label htmlFor="morador-adulto">É adulto</label>
        </div>
        <Alert>
          Crianças contam na divisão das contas (consumo), mas o débito fica
          sempre no nome dos adultos da casa.
        </Alert>
        <SubmitBar salvando={salvando} erro={erro} label="Registrar morador" />
      </form>
    </Gate>
  );
}

/* ---------- Cobrança de aluguel ---------- */

export function AluguelForm({ onSaved }: FormProps) {
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  const [sel, setSel] = useState<Set<string>>(new Set());
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [etapa, setEtapa] = useState<"form" | "confirmar">("form");
  const [salvando, setSalvando] = useState(false);
  const [tentou, setTentou] = useState(false);
  const [okCount, setOkCount] = useState(0);
  const [errosCasas, setErrosCasas] = useState<string[]>([]);

  const lista = casas.data ?? [];
  const todas = lista.length > 0 && sel.size === lista.length;
  const selecionadas = lista.filter((c) => sel.has(c.id));

  function toggle(id: string) {
    setSel((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  function toggleTodas() {
    setSel(todas ? new Set() : new Set(lista.map((c) => c.id)));
  }

  function revisar(e: FormEvent) {
    e.preventDefault();
    if (sel.size === 0) return;
    setTentou(false);
    setErrosCasas([]);
    setEtapa("confirmar");
  }

  async function confirmar() {
    setSalvando(true);
    const erros: string[] = [];
    let ok = 0;
    for (const c of selecionadas) {
      try {
        const body: Record<string, unknown> = { casa_id: c.id, competencia };
        if (valor.trim()) body.valor_centavos = paraCentavos(valor);
        if (vencimento) body.vencimento = vencimento;
        await api.post("/alugueis", body);
        ok++;
      } catch (e) {
        erros.push(
          `${c.nome}: ${e instanceof ApiError ? e.message : "erro ao lançar"}`,
        );
      }
    }
    setSalvando(false);
    setOkCount(ok);
    setTentou(true);
    setErrosCasas(erros);
    if (erros.length === 0) {
      onSaved(`Cobrança lançada em ${ok} casa(s).`);
    }
  }

  const valorTexto = valor.trim()
    ? formatarCentavos(paraCentavos(valor))
    : "o aluguel de cada casa";

  return (
    <Gate
      loading={casas.loading}
      error={casas.error}
      vazio={lista.length === 0}
      mensagemVazio="Cadastre uma casa antes de lançar aluguéis."
    >
      {etapa === "form" ? (
        <form onSubmit={revisar}>
          <div className="field">
            <label>Casas</label>
            <div className="check-row" style={{ marginBottom: 4 }}>
              <input
                id="aluguel-todas"
                type="checkbox"
                checked={todas}
                onChange={toggleTodas}
              />
              <label htmlFor="aluguel-todas">
                Todas as casas ({lista.length})
              </label>
            </div>
            {lista.map((c) => (
              <div className="check-row" key={c.id} style={{ marginBottom: 4 }}>
                <input
                  id={`aluguel-${c.id}`}
                  type="checkbox"
                  checked={sel.has(c.id)}
                  onChange={() => toggle(c.id)}
                />
                <label htmlFor={`aluguel-${c.id}`}>
                  {c.nome}
                  <span className="li-sub" style={{ marginLeft: 8 }}>
                    {formatarCentavos(c.aluguel_centavos)}
                  </span>
                </label>
              </div>
            ))}
          </div>
          <Field label="Competência (mês)">
            <input
              type="month"
              value={competencia}
              onChange={(e) => setCompetencia(e.target.value)}
              required
            />
          </Field>
          <Field
            label="Valor (opcional)"
            hint="Vazio = usa o aluguel de cada casa. Se preencher, vale para todas as selecionadas."
          >
            <MoneyInput value={valor} onChange={setValor} />
          </Field>
          <Field
            label="Vencimento (opcional)"
            hint="Se vazio, usa o dia de vencimento de cada casa."
          >
            <input
              type="date"
              value={vencimento}
              onChange={(e) => setVencimento(e.target.value)}
            />
          </Field>
          <div className="form-actions">
            <button className="btn" type="submit" disabled={sel.size === 0}>
              Revisar lançamento
            </button>
          </div>
        </form>
      ) : (
        <div>
          <Alert>
            Em{" "}
            <strong>
              {todas
                ? `todas as casas (${selecionadas.length})`
                : selecionadas.map((c) => c.nome).join(", ")}
            </strong>{" "}
            será lançada a cobrança de <strong>{valorTexto}</strong> na
            competência <strong>{formatarCompetencia(competencia)}</strong>.
            Você confirma?
          </Alert>

          {tentou && errosCasas.length > 0 && (
            <div className="card" style={{ marginBottom: 12 }}>
              <p
                className="error-text"
                style={{ textAlign: "left", marginTop: 0 }}
              >
                {okCount > 0
                  ? `${okCount} lançada(s). Estas não foram lançadas:`
                  : "Nenhuma foi lançada:"}
              </p>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 13,
                  color: "var(--ink-soft)",
                }}
              >
                {errosCasas.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}

          {tentou && errosCasas.length > 0 ? (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setEtapa("form")}
              >
                Voltar
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={() =>
                  onSaved(
                    `Cobrança lançada em ${okCount} casa(s); ${errosCasas.length} não lançada(s).`,
                  )
                }
              >
                Concluir
              </button>
            </div>
          ) : (
            <div style={{ display: "flex", gap: 8 }}>
              <button
                className="btn btn-ghost"
                style={{ flex: 1 }}
                onClick={() => setEtapa("form")}
                disabled={salvando}
              >
                Voltar
              </button>
              <button
                className="btn"
                style={{ flex: 1 }}
                onClick={confirmar}
                disabled={salvando}
              >
                {salvando ? "Lançando…" : "Confirmar"}
              </button>
            </div>
          )}
        </div>
      )}
    </Gate>
  );
}

/* ---------- Conta compartilhada (água/luz) ---------- */

export function ContaForm({ tipo, onSaved }: FormProps & { tipo: TipoConta }) {
  const terrenos = useApi<Terreno[]>(() => api.get<Terreno[]>("/terrenos"), []);
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  const [terrenoId, setTerrenoId] = useState("");
  const [competencia, setCompetencia] = useState(competenciaAtual());
  const [valor, setValor] = useState("");
  const [vencimento, setVencimento] = useState("");
  const [resultado, setResultado] = useState<ContaDetalhe | null>(null);
  const { salvando, erro, run } = useSubmit();

  const rotulo = tipo === "AGUA" ? "água" : "luz";

  function nomeCasa(id: string): string {
    return casas.data?.find((c) => c.id === id)?.nome ?? "Casa";
  }

  function submeter(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const conta = await api.post<ContaDetalhe>("/contas", {
        terreno_id: terrenoId,
        tipo,
        competencia,
        valor_total_centavos: paraCentavos(valor),
        vencimento,
      });
      setResultado(conta);
    });
  }

  if (resultado) {
    return (
      <div>
        <p className="empty" style={{ padding: "8px 0 16px" }}>
          Conta de {rotulo} lançada e rateada por morador.
        </p>
        <div className="rateio-list">
          {resultado.rateios.map((r) => (
            <div className="rateio-row" key={r.id}>
              <div>
                <div className="li-title">{nomeCasa(r.casa_id)}</div>
                <div className="li-sub">
                  {r.pessoas_snapshot}{" "}
                  {r.pessoas_snapshot === 1 ? "pessoa" : "pessoas"}
                </div>
              </div>
              <strong>{formatarCentavos(r.valor_centavos)}</strong>
            </div>
          ))}
          {resultado.pessoas_administradora > 0 && (
            <div className="rateio-row rateio-admin">
              <div>
                <div className="li-title">Sua família (administradora)</div>
                <div className="li-sub">
                  {resultado.pessoas_administradora}{" "}
                  {resultado.pessoas_administradora === 1
                    ? "pessoa"
                    : "pessoas"}{" "}
                  · não cobrada
                </div>
              </div>
              <strong>
                {formatarCentavos(resultado.valor_administradora_centavos)}
              </strong>
            </div>
          )}
        </div>
        <div className="rateio-total">
          <span>Total da conta</span>
          <strong>{formatarCentavos(resultado.valor_total_centavos)}</strong>
        </div>
        <div className="form-actions">
          <button
            className="btn"
            type="button"
            onClick={() => onSaved(`Conta de ${rotulo} lançada.`)}
          >
            Concluir
          </button>
        </div>
      </div>
    );
  }

  return (
    <Gate
      loading={terrenos.loading || casas.loading}
      error={terrenos.error || casas.error}
      vazio={(terrenos.data?.length ?? 0) === 0}
      mensagemVazio="Cadastre um terreno e casas antes de lançar contas."
    >
      <form onSubmit={submeter}>
        <Alert>
          O rateio usa as casas ativas e os moradores atuais do terreno, somando
          as pessoas da casa administradora (configurável em Ajustes).
        </Alert>
        <Field label="Terreno">
          <select
            value={terrenoId}
            onChange={(e) => setTerrenoId(e.target.value)}
            required
          >
            <option value="" disabled>
              Selecione o terreno
            </option>
            {terrenos.data?.map((t) => (
              <option key={t.id} value={t.id}>
                {t.nome}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Competência (mês)">
          <input
            type="month"
            value={competencia}
            onChange={(e) => setCompetencia(e.target.value)}
            required
          />
        </Field>
        <Field label={`Valor total da conta de ${rotulo}`}>
          <MoneyInput value={valor} onChange={setValor} />
        </Field>
        <Field label="Vencimento">
          <input
            type="date"
            value={vencimento}
            onChange={(e) => setVencimento(e.target.value)}
            required
          />
        </Field>
        <SubmitBar salvando={salvando} erro={erro} label="Lançar e ratear" />
      </form>
    </Gate>
  );
}

/* ---------- Despesa ---------- */

const CATEGORIAS: { valor: string; rotulo: string }[] = [
  { valor: "MANUTENCAO", rotulo: "Manutenção" },
  { valor: "REPARO", rotulo: "Reparo" },
  { valor: "IMPOSTO", rotulo: "Imposto" },
  { valor: "OUTROS", rotulo: "Outros" },
];

export function DespesaForm({ onSaved }: FormProps) {
  const terrenos = useApi<Terreno[]>(() => api.get<Terreno[]>("/terrenos"), []);
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  const [descricao, setDescricao] = useState("");
  const [categoria, setCategoria] = useState("OUTROS");
  const [valor, setValor] = useState("");
  const [data, setData] = useState(hoje());
  const [vinculo, setVinculo] = useState("");
  const { salvando, erro, run } = useSubmit();

  function submeter(e: FormEvent) {
    e.preventDefault();
    run(async () => {
      const body: Record<string, unknown> = {
        descricao: descricao.trim(),
        categoria,
        valor_centavos: paraCentavos(valor),
        data,
      };
      if (vinculo.startsWith("t:")) body.terreno_id = vinculo.slice(2);
      else if (vinculo.startsWith("c:")) body.casa_id = vinculo.slice(2);
      await api.post("/despesas", body);
      onSaved("Despesa registrada.");
    });
  }

  return (
    <Gate
      loading={terrenos.loading || casas.loading}
      error={terrenos.error || casas.error}
      vazio={
        (terrenos.data?.length ?? 0) === 0 && (casas.data?.length ?? 0) === 0
      }
      mensagemVazio="Cadastre um terreno ou casa antes de registrar despesas."
    >
      <form onSubmit={submeter}>
        <Field label="Descrição">
          <input
            value={descricao}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder="Ex.: Troca de torneira"
            required
          />
        </Field>
        <Field label="Categoria">
          <select value={categoria} onChange={(e) => setCategoria(e.target.value)}>
            {CATEGORIAS.map((c) => (
              <option key={c.valor} value={c.valor}>
                {c.rotulo}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Valor">
          <MoneyInput value={valor} onChange={setValor} />
        </Field>
        <Field label="Data">
          <input
            type="date"
            value={data}
            onChange={(e) => setData(e.target.value)}
            required
          />
        </Field>
        <Field label="Vincular a" hint="Escolha o terreno ou a casa do gasto.">
          <select value={vinculo} onChange={(e) => setVinculo(e.target.value)} required>
            <option value="" disabled>
              Selecione
            </option>
            {terrenos.data?.map((t) => (
              <option key={`t-${t.id}`} value={`t:${t.id}`}>
                Terreno · {t.nome}
              </option>
            ))}
            {casas.data?.map((c) => (
              <option key={`c-${c.id}`} value={`c:${c.id}`}>
                Casa · {c.nome}
              </option>
            ))}
          </select>
        </Field>
        <SubmitBar salvando={salvando} erro={erro} label="Registrar despesa" />
      </form>
    </Gate>
  );
}
