import { useRef, useState } from "react";
import {
  api,
  ApiError,
  type Casa,
  type ResultadoAnalise,
} from "../lib/api";
import { useApi } from "../lib/useApi";
import { Icon } from "./Icon";
import { Modal } from "./Modal";
import { ModalConfirmarExtrato } from "./ModalConfirmarExtrato";

function lerArquivo(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.readAsDataURL(file);
  });
}

type Variant = "atalho" | "list";

interface Props {
  variant: Variant;
  /** Chamado após confirmar a baixa (opcional). */
  onConfirmado?: () => void;
}

/**
 * Gatilho + fluxo completo do FinanceBot: explica a feature, recebe um
 * comprovante (Pix/recibo), analisa com IA e abre o modal de confirmação que
 * dá baixa no pagamento. O matching por nome (pagador = morador) é feito no
 * backend, então não depende de uma casa pré-selecionada.
 */
export function FinanceBot({ variant, onConfirmado }: Props) {
  const casas = useApi<Casa[]>(() => api.get<Casa[]>("/casas"), []);
  const inputRef = useRef<HTMLInputElement>(null);

  const [modalAberto, setModalAberto] = useState(false);
  const [analisando, setAnalisando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [resultado, setResultado] = useState<ResultadoAnalise | null>(null);
  const [fileDataUrl, setFileDataUrl] = useState("");

  async function enviar(file: File) {
    setAnalisando(true);
    setErro(null);
    try {
      const dataUrl = await lerArquivo(file);
      setFileDataUrl(dataUrl);
      const comp = new Date().toISOString().slice(0, 7);
      const r = await api.post<ResultadoAnalise>("/ia/analisar-extrato", {
        file_data_url: dataUrl,
        competencia: comp,
      });
      setResultado(r);
      setModalAberto(false);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Falha ao analisar extrato.");
    } finally {
      setAnalisando(false);
    }
  }

  return (
    <>
      {variant === "atalho" ? (
        <button type="button" className="atalho" onClick={() => setModalAberto(true)}>
          <span className="atalho-icone">
            <Icon name="robot" size={24} color="var(--grey)" />
            <span className="atalho-mais" aria-hidden>
              <Icon name="plus" size={14} color="var(--grey)" />
            </span>
          </span>
          <span className="atalho-label">FinanceBot</span>
        </button>
      ) : (
        <button
          type="button"
          className="list-item list-item-btn"
          onClick={() => setModalAberto(true)}
        >
          <div className="badge-icon">
            <Icon name="robot" size={22} />
          </div>
          <div className="li-main">
            <div className="li-title">FinanceBot</div>
            <div className="li-sub">Reconhecer extrato de pagamento por IA</div>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf,image/png,image/jpeg,image/webp"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void enviar(f);
          e.target.value = "";
        }}
      />

      {modalAberto && (
        <Modal title="FinanceBot" onClose={() => (analisando ? null : setModalAberto(false))}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 44,
                height: 44,
                borderRadius: "16px 16px 16px 4px",
                background: "var(--ui-primary-soft)",
                flexShrink: 0,
              }}
            >
              <Icon name="robot" size={26} color="var(--ui-primary)" />
            </span>
            <p style={{ margin: 0, color: "var(--ink-soft)", lineHeight: 1.5 }}>
              Envie um comprovante de Pix ou recibo de pagamento recebido. A IA
              guarda o extrato na casa e dá baixa automática na cobrança do mês.
            </p>
          </div>

          <ol style={{ margin: "0 0 16px", paddingLeft: 20, color: "var(--ink)", lineHeight: 1.6 }}>
            <li>Envie o print ou PDF do comprovante recebido.</li>
            <li>O FinanceBot extrai pagador, valor e data.</li>
            <li>O extrato fica salvo e o pagamento é confirmado no sistema.</li>
          </ol>

          <div
            style={{
              display: "flex",
              gap: 10,
              alignItems: "flex-start",
              padding: "12px 14px",
              borderRadius: "var(--radius-sm)",
              background: "var(--ui-primary-soft)",
              borderLeft: "3px solid var(--ui-primary)",
              marginBottom: 20,
            }}
          >
            <Icon name="alert" size={18} color="var(--ui-primary)" style={{ flexShrink: 0, marginTop: 2 }} />
            <p style={{ margin: 0, fontSize: 14, color: "var(--ink)", lineHeight: 1.5 }}>
              Para a baixa automática funcionar, o nome de quem enviou o Pix
              precisa ser igual ao nome do morador da casa.
            </p>
          </div>

          {erro && <p className="error-text" style={{ marginBottom: 12 }}>{erro}</p>}

          <button
            type="button"
            className="ui-btn-primary full"
            disabled={analisando}
            onClick={() => inputRef.current?.click()}
          >
            <Icon name="receipt" size={16} />
            {analisando ? "Analisando…" : "Selecionar extrato"}
          </button>
        </Modal>
      )}

      {resultado && casas.data && (
        <ModalConfirmarExtrato
          resultado={resultado}
          casas={casas.data}
          fileDataUrl={fileDataUrl}
          onConfirmado={() => {
            setResultado(null);
            onConfirmado?.();
          }}
          onCancelar={() => setResultado(null)}
        />
      )}
    </>
  );
}
