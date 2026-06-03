import type { ReactNode } from "react";
import { Modal } from "./Modal";
import { Icon } from "./Icon";

interface ConfirmarExclusaoProps {
  /** Título do modal. Padrão: "Confirmar exclusão". */
  titulo?: string;
  /** Item principal a ser excluído, ex.: 'Excluir o terreno "Ouro Verde"?'. */
  descricao: ReactNode;
  /** O que será excluído junto em cascata (uma linha por item). */
  itens?: ReactNode[];
  /** Texto do botão destrutivo. Padrão: "Excluir". */
  textoConfirmar?: string;
  carregando?: boolean;
  onConfirmar: () => void;
  onCancelar: () => void;
}

/**
 * Confirmação visual de exclusão. Lista explicitamente o item e tudo o que
 * será removido em cascata, com nomes das entidades, antes de confirmar.
 */
export function ConfirmarExclusao({
  titulo = "Confirmar exclusão",
  descricao,
  itens,
  textoConfirmar = "Excluir",
  carregando = false,
  onConfirmar,
  onCancelar,
}: ConfirmarExclusaoProps) {
  return (
    <Modal title={titulo} onClose={onCancelar}>
      <div className="confirmar-exclusao">
        <div className="confirmar-descricao">
          <span className="confirmar-alerta" aria-hidden="true">
            <Icon name="alert" size={22} />
          </span>
          <p>{descricao}</p>
        </div>

        {itens && itens.length > 0 && (
          <ul className="confirmar-itens">
            {itens.map((item, i) => (
              <li key={i}>
                <Icon name="trash" size={16} />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        )}

        <div className="confirmar-acoes">
          <button
            className="btn btn-ghost"
            onClick={onCancelar}
            disabled={carregando}
          >
            Cancelar
          </button>
          <button
            className="btn btn-danger"
            onClick={onConfirmar}
            disabled={carregando}
          >
            {carregando ? "Excluindo…" : textoConfirmar}
          </button>
        </div>
      </div>
    </Modal>
  );
}
