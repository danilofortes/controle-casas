import { useNavigate } from "react-router-dom";
import { Icon, type IconName } from "./Icon";
import { Modal } from "./Modal";
import { useAuth } from "../auth/AuthContext";
import type { FormKey } from "../pages/NovoPage";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

interface NovoItem {
  form: FormKey;
  label: string;
  icon: IconName;
}

const NAVEGAR: NavItem[] = [
  { to: "/", label: "Início", icon: "home" },
  { to: "/casas", label: "Casas", icon: "building" },
  { to: "/relatorio", label: "Relatório", icon: "chart" },
  { to: "/ajustes", label: "Ajustes", icon: "settings" },
];

const NOVOS: NovoItem[] = [
  { form: "terreno", label: "Terreno", icon: "map" },
  { form: "casa", label: "Casa", icon: "building" },
  { form: "morador", label: "Morador", icon: "users" },
  { form: "aluguel", label: "Aluguel", icon: "key" },
  { form: "agua", label: "Conta de água", icon: "water" },
  { form: "luz", label: "Conta de luz", icon: "bolt" },
  { form: "despesa", label: "Despesa", icon: "receipt" },
];

export function MenuApp({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const { sair } = useAuth();

  function ir(to: string) {
    onClose();
    navigate(to);
  }

  function novoLancamento(form: FormKey) {
    onClose();
    navigate("/novo", { state: { form } });
  }

  function sairDaConta() {
    onClose();
    sair();
  }

  return (
    <Modal title="Menu" onClose={onClose}>
      <div className="menu-grupo">
        <p className="menu-grupo-titulo">Navegar</p>
        {NAVEGAR.map((item) => (
          <button
            key={item.to}
            className="list-item list-item-btn"
            onClick={() => ir(item.to)}
          >
            <div className="badge-icon">
              <Icon name={item.icon} size={22} />
            </div>
            <div className="li-main">
              <div className="li-title">{item.label}</div>
            </div>
            <Icon name="chevronRight" size={20} />
          </button>
        ))}
      </div>

      <div className="menu-grupo">
        <p className="menu-grupo-titulo">Novo lançamento</p>
        <div className="menu-grid">
          {NOVOS.map((item) => (
            <button
              key={item.form}
              className="menu-tile"
              onClick={() => novoLancamento(item.form)}
            >
              <div className="badge-icon">
                <Icon name={item.icon} size={22} />
              </div>
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="menu-grupo">
        <p className="menu-grupo-titulo">Conta</p>
        <button
          className="list-item list-item-btn"
          onClick={() => ir("/ajustes")}
        >
          <div className="badge-icon">
            <Icon name="plus" size={22} />
          </div>
          <div className="li-main">
            <div className="li-title">Instalar app</div>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>
        <button className="list-item list-item-btn" onClick={sairDaConta}>
          <div className="badge-icon is-accent">
            <Icon name="logout" size={22} />
          </div>
          <div className="li-main">
            <div className="li-title">Sair</div>
          </div>
          <Icon name="chevronRight" size={20} />
        </button>
      </div>
    </Modal>
  );
}
