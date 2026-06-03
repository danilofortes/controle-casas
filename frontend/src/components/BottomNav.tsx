import { useLocation, useNavigate } from "react-router-dom";
import { Icon, type IconName } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const PRINCIPAIS: NavItem[] = [
  { to: "/", label: "Início", icon: "home" },
  { to: "/casas", label: "Casas", icon: "building" },
];

const SECUNDARIOS: NavItem[] = [
  { to: "/relatorio", label: "Relatório", icon: "chart" },
  { to: "/ajustes", label: "Ajustes", icon: "settings" },
];

export function BottomNav() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const ativo = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <nav className="bottom-nav">
      {PRINCIPAIS.map((item) => (
        <NavButton
          key={item.to}
          item={item}
          active={ativo(item.to)}
          onClick={navigate}
        />
      ))}
      <button
        className="nav-fab"
        aria-label="Novo lançamento"
        onClick={() => navigate("/novo")}
      >
        <Icon name="plus" size={28} />
      </button>
      {SECUNDARIOS.map((item) => (
        <NavButton
          key={item.to}
          item={item}
          active={ativo(item.to)}
          onClick={navigate}
        />
      ))}
    </nav>
  );
}

function NavButton({
  item,
  active,
  onClick,
}: {
  item: NavItem;
  active: boolean;
  onClick: (to: string) => void;
}) {
  return (
    <button
      className={`nav-btn ${active ? "active" : ""}`}
      onClick={() => onClick(item.to)}
    >
      <span className="nav-icon">
        <Icon name={item.icon} size={22} />
      </span>
      {item.label}
    </button>
  );
}
