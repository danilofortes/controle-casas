import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Alert } from "../components/Alert";
import { Icon, type IconName } from "../components/Icon";
import { PageHeader } from "../components/PageHeader";
import { InstalarApp } from "../components/InstalarApp";
import { Modal } from "../components/Modal";
import { api, ApiError, type Configuracao } from "../lib/api";

type ConfigKey = "administradora";

interface ConfigItem {
  key: ConfigKey;
  icon: IconName;
  titulo: string;
  descricao: string;
}

const CONFIGS: ConfigItem[] = [
  {
    key: "administradora",
    icon: "users",
    titulo: "Casa administradora",
    descricao: "Pessoas da sua família na divisão das contas",
  },
];

const TITULOS: Record<ConfigKey, string> = {
  administradora: "Casa administradora",
};

export function AjustesPage() {
  const { sair } = useAuth();
  const [aberta, setAberta] = useState<ConfigKey | null>(null);
  const [mostrarInstalar, setMostrarInstalar] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [config, setConfig] = useState<Configuracao | null>(null);

  useEffect(() => {
    let ativo = true;
    api
      .get<Configuracao>("/config")
      .then((c) => ativo && setConfig(c))
      .catch(() => {});
    return () => {
      ativo = false;
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function resumo(key: ConfigKey): string {
    if (key === "administradora") {
      if (!config) return "Toque para configurar";
      const n = config.moradores_administradora;
      return `${n} ${n === 1 ? "pessoa" : "pessoas"} na contagem`;
    }
    return "";
  }

  function aoSalvar(novo: Configuracao, msg: string) {
    setConfig(novo);
    setAberta(null);
    setToast(msg);
  }

  return (
    <div className="apex-page">
      {toast && <div className="toast">{toast}</div>}

      <PageHeader title="Ajustes" subtitle="Preferências e conta" showNovo={false} />

      <div className="apex-panel" style={{ marginBottom: 16 }}>
        <div className="li-title">Casa em Dia</div>
        <div className="li-sub">Controle de aluguéis e contas · versão 0.1</div>
      </div>

      <div className="apex-panel">
        <h2 className="section-title" style={{ marginTop: 0 }}>Configurações</h2>
        {CONFIGS.map((c) => (
          <button
            className="list-item list-item-btn"
            key={c.key}
            onClick={() => setAberta(c.key)}
          >
            <div className="badge-icon">
              <Icon name={c.icon} size={22} />
            </div>
            <div className="li-main">
              <div className="li-title">{c.titulo}</div>
              <div className="li-sub">{resumo(c.key)}</div>
            </div>
            <Icon name="chevronRight" size={20} />
          </button>
        ))}

        <h2 className="section-title">Aplicativo</h2>
        <button
          className="list-item list-item-btn"
          onClick={() => setMostrarInstalar(true)}
        >
          <div className="badge-icon">
            <Icon name="home" size={22} />
          </div>
          <div className="li-main">
            <div className="li-title">Adicionar à tela inicial</div>
            <div className="li-sub">Instalar como app no celular</div>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>

        <h2 className="section-title">Conta</h2>
        <button className="btn apex-btn-primary" onClick={sair} style={{ width: "auto", padding: "12px 24px" }}>
          <Icon name="logout" size={20} />
          Sair
        </button>
        <p
          style={{
            textAlign: "center",
            color: "var(--muted)",
            fontSize: 13,
            marginTop: 16,
          }}
        >
          Você usa uma senha única compartilhada para acessar o sistema.
        </p>
      </div>

      {aberta && (
        <Modal title={TITULOS[aberta]} onClose={() => setAberta(null)}>
          {aberta === "administradora" && (
            <ConfigAdministradora
              inicial={config?.moradores_administradora ?? 0}
              onSaved={(c) =>
                aoSalvar(c, "Configuração da casa administradora salva.")
              }
            />
          )}
        </Modal>
      )}

      {mostrarInstalar && (
        <Modal
          title="Adicionar à tela inicial"
          onClose={() => setMostrarInstalar(false)}
        >
          <InstalarApp />
        </Modal>
      )}
    </div>
  );
}

function ConfigAdministradora({
  inicial,
  onSaved,
}: {
  inicial: number;
  onSaved: (c: Configuracao) => void;
}) {
  const [moradores, setMoradores] = useState(String(inicial));
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarInfo, setMostrarInfo] = useState(false);

  async function salvar() {
    setSalvando(true);
    setErro(null);
    try {
      const c = await api.put<Configuracao>("/config", {
        moradores_administradora: Number(moradores) || 0,
      });
      onSaved(c);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div>
      <div className="field">
        <label className="label-row">
          Moradores da casa administradora
          <button
            type="button"
            className="info-btn"
            aria-label="O que é isso?"
            aria-expanded={mostrarInfo}
            onClick={() => setMostrarInfo((v) => !v)}
          >
            <Icon name="info" size={18} />
          </button>
        </label>

        {mostrarInfo && (
          <Alert>
            Quantas pessoas da sua família moram na casa administradora. Esse
            número entra na divisão das contas de água e luz por cabeça, mas a
            parte de vocês não é cobrada dos inquilinos.
          </Alert>
        )}

        <input
          type="number"
          min={0}
          max={50}
          value={moradores}
          onChange={(e) => setMoradores(e.target.value)}
        />
        <div className="hint">
          Exemplo: 4 administradores + 1 inquilino = conta dividida por 5
          cabeças.
        </div>
      </div>

      <div className="form-actions">
        {erro && (
          <p className="error-text" style={{ padding: "0 0 12px" }}>
            {erro}
          </p>
        )}
        <button className="btn" onClick={salvar} disabled={salvando}>
          {salvando ? "Salvando…" : "Salvar"}
        </button>
      </div>
    </div>
  );
}
