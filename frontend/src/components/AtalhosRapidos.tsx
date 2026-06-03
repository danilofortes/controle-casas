import { useNavigate } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import type { FormKey } from "../pages/NovoPage";

interface Atalho {
  label: string;
  icon: IconName;
  /** Formulário a abrir em /novo, ou rota direta. */
  form?: FormKey;
  to?: string;
}

const ATALHOS: Atalho[] = [
  { label: "Aluguel", icon: "key", form: "aluguel" },
  { label: "Água", icon: "water", form: "agua" },
  { label: "Luz", icon: "bolt", form: "luz" },
  { label: "Casa", icon: "building", form: "casa" },
  { label: "Morador", icon: "users", form: "morador" },
  { label: "Despesa", icon: "receipt", form: "despesa" },
  { label: "Terreno", icon: "map", form: "terreno" },
  { label: "Relatório", icon: "chart", to: "/relatorio" },
];

/**
 * Faixa horizontal de atalhos rápidos (estilo Itaú): ícones com label curto,
 * com scroll por toque/trackpad e "espiada" do próximo item. Sem auto-rotação.
 */
export function AtalhosRapidos() {
  const navigate = useNavigate();

  function abrir(a: Atalho) {
    if (a.to) navigate(a.to);
    else if (a.form) navigate("/novo", { state: { form: a.form } });
  }

  return (
    <div className="atalhos">
      {ATALHOS.map((a) => (
        <button key={a.label} className="atalho" onClick={() => abrir(a)}>
          <span className="atalho-icone">
            <Icon name={a.icon} size={24} color="var(--ink-soft)" />
          </span>
          <span className="atalho-label">{a.label}</span>
        </button>
      ))}
    </div>
  );
}
