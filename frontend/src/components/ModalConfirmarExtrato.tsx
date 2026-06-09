import { useState } from "react";
import {
  api,
  ApiError,
  type Casa,
  type CobrancaPendente,
  type MoradorMatch,
  type ResultadoAnalise,
} from "../lib/api";
import { Modal } from "./Modal";
import { Icon } from "./Icon";

interface Props {
  resultado: ResultadoAnalise;
  casas: Casa[];
  fileDataUrl: string;
  onConfirmado: () => void;
  onCancelar: () => void;
}

function formatarReal(centavos: number): string {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function badgeConfianca(c: number): { label: string; cor: string } {
  if (c >= 0.8) return { label: `${Math.round(c * 100)}% confiança`, cor: "var(--color-success, #22c55e)" };
  if (c >= 0.5) return { label: `${Math.round(c * 100)}% confiança`, cor: "var(--color-warning, #f59e0b)" };
  return { label: `${Math.round(c * 100)}% confiança`, cor: "var(--color-danger, #ef4444)" };
}

export function ModalConfirmarExtrato({ resultado, casas, fileDataUrl, onConfirmado, onCancelar }: Props) {
  const [casaId, setCasaId] = useState<string>(resultado.match?.casa_id ?? "");
  const [baixarAluguel, setBaixarAluguel] = useState(
    resultado.acao === "baixar_aluguel" || resultado.acao === "baixar_tudo"
  );
  const [baixarRateios, setBaixarRateios] = useState(resultado.acao === "baixar_tudo");
  const [observacao, setObservacao] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const badge = badgeConfianca(resultado.confianca);
  const acaoCorAlerta =
    resultado.acao === "ajuste_manual" ? "var(--color-warning, #f59e0b)"
    : resultado.acao === "ambiguo" ? "var(--color-danger, #ef4444)"
    : "var(--color-success, #22c55e)";

  async function confirmar() {
    if (!casaId) {
      setErro("Selecione a casa antes de confirmar.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      await api.post("/ia/confirmar-extrato", {
        file_data_url: fileDataUrl,
        competencia: resultado.competencia,
        casa_id: casaId,
        nome_pagador_extrato: resultado.nome_pagador_extraido,
        valor_centavos: resultado.valor_centavos,
        data_pagamento: resultado.data_pagamento ?? null,
        aluguel_id: baixarAluguel && resultado.aluguel_pendente ? resultado.aluguel_pendente.id : null,
        rateio_ids: baixarRateios ? resultado.rateios_pendentes.map((r) => r.id) : [],
        observacao: observacao || null,
      });
      onConfirmado();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Erro ao confirmar extrato.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Modal title="Confirmar pagamento" onClose={onCancelar}>
      <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>

        {/* Badge confiança */}
        <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
          <span style={{
            padding: "2px 10px",
            borderRadius: "999px",
            background: badge.cor + "22",
            color: badge.cor,
            fontWeight: 600,
            fontSize: "0.8rem",
          }}>
            {badge.label}
          </span>
          <span style={{ fontSize: "0.85rem", color: "var(--color-text-secondary)" }}>
            IA identificou: <strong>{resultado.nome_pagador_extraido}</strong>
          </span>
        </div>

        {/* Mensagem da IA */}
        <div style={{
          padding: "0.75rem 1rem",
          borderRadius: "8px",
          background: acaoCorAlerta + "18",
          borderLeft: `3px solid ${acaoCorAlerta}`,
          fontSize: "0.875rem",
        }}>
          {resultado.mensagem}
        </div>

        {/* Valor extraído */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "0.75rem" }}>
          <div>
            <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
              Valor no extrato
            </label>
            <div style={{ fontWeight: 700, fontSize: "1.1rem" }}>
              {formatarReal(resultado.valor_centavos)}
            </div>
          </div>
          {resultado.data_pagamento && (
            <div>
              <label style={{ fontSize: "0.8rem", color: "var(--color-text-secondary)" }}>
                Data no extrato
              </label>
              <div style={{ fontWeight: 600 }}>
                {new Date(resultado.data_pagamento + "T00:00:00").toLocaleDateString("pt-BR")}
              </div>
            </div>
          )}
        </div>

        {/* Seleção de casa */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 500 }}>
            Casa
          </label>
          <select
            value={casaId}
            onChange={(e) => setCasaId(e.target.value)}
            style={{
              width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px",
              border: "1px solid var(--color-border)", background: "var(--color-bg-input)",
              color: "var(--color-text)",
            }}
          >
            <option value="">Selecione a casa...</option>
            {casas.map((c) => (
              <option key={c.id} value={c.id}>{c.nome}</option>
            ))}
          </select>
          {resultado.matches_possiveis.length > 0 && (
            <p style={{ fontSize: "0.78rem", color: "var(--color-text-secondary)", marginTop: "4px" }}>
              Sugestão da IA: {resultado.matches_possiveis.map(m => `${m.morador_nome} (${m.casa_nome})`).join(", ")}
            </p>
          )}
        </div>

        {/* Cobranças para baixar */}
        {(resultado.aluguel_pendente || resultado.rateios_pendentes.length > 0) && (
          <div>
            <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "6px", fontWeight: 500 }}>
              Dar baixa em:
            </label>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {resultado.aluguel_pendente && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={baixarAluguel}
                    onChange={(e) => setBaixarAluguel(e.target.checked)}
                  />
                  <span style={{ fontSize: "0.875rem" }}>
                    Aluguel — {formatarReal(resultado.aluguel_pendente.valor_centavos)}
                    <span style={{ color: "var(--color-text-secondary)", marginLeft: "6px" }}>
                      vence {new Date(resultado.aluguel_pendente.vencimento + "T00:00:00").toLocaleDateString("pt-BR")}
                    </span>
                  </span>
                </label>
              )}
              {resultado.rateios_pendentes.length > 0 && (
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                  <input
                    type="checkbox"
                    checked={baixarRateios}
                    onChange={(e) => setBaixarRateios(e.target.checked)}
                  />
                  <span style={{ fontSize: "0.875rem" }}>
                    {resultado.rateios_pendentes.map(r => r.tipo).join(" + ")} —{" "}
                    {formatarReal(resultado.rateios_pendentes.reduce((s, r) => s + r.valor_centavos, 0))}
                  </span>
                </label>
              )}
            </div>
          </div>
        )}

        {/* Observação */}
        <div>
          <label style={{ display: "block", fontSize: "0.85rem", marginBottom: "4px", fontWeight: 500 }}>
            Observação (opcional)
          </label>
          <input
            type="text"
            value={observacao}
            onChange={(e) => setObservacao(e.target.value)}
            placeholder="Ex.: pagamento adiantado, desconto aplicado..."
            style={{
              width: "100%", padding: "0.5rem 0.75rem", borderRadius: "6px",
              border: "1px solid var(--color-border)", background: "var(--color-bg-input)",
              color: "var(--color-text)", boxSizing: "border-box",
            }}
          />
        </div>

        {erro && (
          <p style={{ color: "var(--color-danger, #ef4444)", fontSize: "0.85rem" }}>{erro}</p>
        )}

        {/* Ações */}
        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "flex-end", marginTop: "0.5rem" }}>
          <button
            onClick={onCancelar}
            disabled={enviando}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: "6px",
              border: "1px solid var(--color-border)", background: "transparent",
              cursor: "pointer", color: "var(--color-text)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={confirmar}
            disabled={enviando || !casaId}
            style={{
              padding: "0.5rem 1.25rem", borderRadius: "6px",
              background: "var(--color-primary, #6366f1)", color: "#fff",
              border: "none", cursor: enviando ? "wait" : "pointer",
              fontWeight: 600, opacity: !casaId ? 0.5 : 1,
            }}
          >
            {enviando ? "Confirmando..." : "Confirmar pagamento"}
          </button>
        </div>
      </div>
    </Modal>
  );
}
