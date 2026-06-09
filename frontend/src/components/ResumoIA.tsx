import { useState, type CSSProperties, type FormEvent } from "react";
import { api, ApiError, type RespostaIA } from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon } from "./Icon";
import { MarkdownLite } from "./MarkdownLite";

interface Props {
  competencia: string;
}

const avatarBase: CSSProperties = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  background: "var(--ui-primary-soft)",
  flexShrink: 0,
};

/**
 * Card de IA na visão do mês: mostra um resumo gerado pelo Gemini e permite
 * perguntas em linguagem natural sobre os aluguéis daquela competência.
 */
export function ResumoIA({ competencia }: Props) {
  const resumo = useApi<RespostaIA>(
    () => api.get<RespostaIA>(`/ia/resumo?competencia=${competencia}`),
    [competencia],
  );

  const [pergunta, setPergunta] = useState("");
  const [resposta, setResposta] = useState<string | null>(null);
  const [perguntando, setPerguntando] = useState(false);
  const [erroPergunta, setErroPergunta] = useState<string | null>(null);

  async function perguntar(e: FormEvent) {
    e.preventDefault();
    const q = pergunta.trim();
    if (!q || perguntando) return;
    setPerguntando(true);
    setErroPergunta(null);
    setResposta(null);
    try {
      const r = await api.post<RespostaIA>("/ia/pergunta", {
        pergunta: q,
        competencia,
      });
      setResposta(r.resposta);
    } catch (err) {
      setErroPergunta(
        err instanceof ApiError ? err.message : "Não foi possível responder agora.",
      );
    } finally {
      setPerguntando(false);
    }
  }

  return (
    <div className="ui-panel ia-card" style={{ marginBottom: 20 }}>
      <div
        className="ui-panel-head"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}
      >
        <h2
          className="ui-panel-title"
          style={{ display: "flex", alignItems: "center", gap: 10 }}
        >
          <span
            aria-hidden="true"
            style={{
              ...avatarBase,
              width: 30,
              height: 30,
              borderRadius: "12px 12px 12px 3px",
            }}
          >
            <Icon name="robot" size={18} color="var(--ui-primary)" />
          </span>
          Resumo do mês (IA)
        </h2>
        <button
          type="button"
          className="ui-btn-ghost"
          onClick={resumo.reload}
          disabled={resumo.loading}
        >
          {resumo.loading ? "Gerando…" : "Atualizar"}
        </button>
      </div>

      <div style={{ marginTop: 12 }}>
        {resumo.loading && (
          <div className="ia-skel" aria-label="Gerando resumo">
            <span />
            <span />
            <span />
          </div>
        )}
        {resumo.error && !resumo.loading && (
          <p className="error-text" style={{ margin: 0 }}>{resumo.error}</p>
        )}
        {resumo.data && !resumo.loading && (
          <MarkdownLite
            text={resumo.data.resposta}
            style={{ color: "var(--ink)" }}
          />
        )}
      </div>

      <form
        onSubmit={perguntar}
        style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid var(--ui-line)" }}
      >
        <label
          htmlFor="ia-pergunta"
          style={{
            display: "block",
            fontSize: 14,
            fontWeight: 600,
            marginBottom: 8,
            color: "var(--ink-soft)",
          }}
        >
          Pergunte sobre os aluguéis deste mês
        </label>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <input
            id="ia-pergunta"
            type="text"
            value={pergunta}
            onChange={(e) => setPergunta(e.target.value)}
            placeholder="Ex.: quem ainda não pagou o aluguel?"
            style={{
              flex: "1 1 220px",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              border: "1px solid var(--ui-line)",
              background: "var(--white)",
              color: "var(--ink)",
            }}
          />
          <button
            type="submit"
            className="ui-btn-primary"
            disabled={perguntando || !pergunta.trim()}
          >
            {perguntando ? "Pensando…" : "Perguntar"}
          </button>
        </div>

        {erroPergunta && (
          <p className="error-text" style={{ marginTop: 10 }}>{erroPergunta}</p>
        )}
        {perguntando && !resposta && (
          <p className="loading" style={{ marginTop: 10 }}>Consultando a IA…</p>
        )}
        {resposta && !perguntando && (
          <div style={{ marginTop: 12, display: "flex", gap: 10, alignItems: "flex-start" }}>
            <span
              aria-hidden="true"
              style={{ ...avatarBase, width: 28, height: 28, borderRadius: "12px 12px 12px 3px", marginTop: 2 }}
            >
              <Icon name="robot" size={16} color="var(--ui-primary)" />
            </span>
            <MarkdownLite
              text={resposta}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "3px 12px 12px 12px",
                background: "var(--ui-primary-soft)",
                fontSize: 14,
                color: "var(--ink)",
              }}
            />
          </div>
        )}
      </form>
    </div>
  );
}
