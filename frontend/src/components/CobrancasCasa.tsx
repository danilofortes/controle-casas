import type { ItemCobranca, TipoPendencia } from "../lib/api";
import { formatarCentavos, formatarDiaMes, hoje } from "../lib/format";
import { Icon, type IconName } from "./Icon";

export const ICONE: Record<TipoPendencia, IconName> = {
  ALUGUEL: "key",
  AGUA: "water",
  LUZ: "bolt",
};

export const ROTULO: Record<TipoPendencia, string> = {
  ALUGUEL: "Aluguel",
  AGUA: "Água",
  LUZ: "Luz",
};

interface CobrancasCasaProps {
  itens: ItemCobranca[];
  /** Id da cobrança em processamento (desabilita os botões dela). */
  busy?: string | null;
  /** Confirma/desfaz o recebimento. Se omitido, o botão não é exibido. */
  onAlternar?: (item: ItemCobranca) => void;
  /** Inicia a exclusão. Se omitido, o botão não é exibido. */
  onExcluir?: (item: ItemCobranca) => void;
}

/**
 * Lista de cobranças de uma casa (aluguel + rateios de água/luz) com as cores
 * de estado (paga/atrasada/pendente). Reutilizada na CasaPage (com ações) e no
 * Relatório (apenas leitura, sem callbacks).
 */
export function CobrancasCasa({
  itens,
  busy,
  onAlternar,
  onExcluir,
}: CobrancasCasaProps) {
  return (
    <>
      {itens.map((item) => {
        const id = item.aluguel_id ?? item.rateio_id ?? "";
        const atrasado = !item.pago && item.vencimento < hoje();
        const estado = item.pago
          ? "cobranca-paga"
          : atrasado
            ? "cobranca-atrasada"
            : "cobranca-pendente";
        return (
          <div className={`list-item ${estado}`} key={id}>
            <div className="badge-icon">
              <Icon name={ICONE[item.tipo]} size={22} />
            </div>
            <div className="li-main">
              <div className="li-title">{ROTULO[item.tipo]}</div>
              <div className="li-sub">
                {item.pago && item.pago_em
                  ? `Recebido em ${formatarDiaMes(item.pago_em)}`
                  : `Vence ${formatarDiaMes(item.vencimento)}`}
              </div>
            </div>
            <div className="li-right">
              <div className="li-amount">
                {formatarCentavos(item.valor_centavos)}
              </div>
              {onAlternar && (
                <button
                  className={`confirm-btn ${item.pago ? "is-paid" : ""}`}
                  aria-label={
                    item.pago
                      ? "Desfazer recebimento"
                      : "Confirmar recebimento"
                  }
                  disabled={busy === id}
                  onClick={() => onAlternar(item)}
                >
                  <Icon name="check" size={20} />
                </button>
              )}
              {onExcluir && (
                <button
                  className="confirm-btn is-danger"
                  aria-label={
                    item.aluguel_id ? "Excluir cobrança" : "Excluir conta"
                  }
                  disabled={busy === id}
                  onClick={() => onExcluir(item)}
                >
                  <Icon name="trash" size={18} />
                </button>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}
