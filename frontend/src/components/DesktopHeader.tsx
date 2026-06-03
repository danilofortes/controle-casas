import { useLocation, useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

const LINKS = [
  { to: "/", label: "Início" },
  { to: "/casas", label: "Casas" },
  { to: "/relatorio", label: "Relatório" },
  { to: "/ajustes", label: "Ajustes" },
];

/** Barra de navegação superior, exibida apenas em telas largas (desktop). */
export function DesktopHeader() {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const ativo = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <header className="desktop-header">
      <div className="desktop-header-inner">
        <button
          className="dh-brand"
          onClick={() => navigate("/")}
          aria-label="Ir para o início"
        >
          <img src="/logo.svg" alt="" width={34} height={34} />
          <span>Casa em Dia</span>
        </button>

        <nav className="dh-nav">
          {LINKS.map((l) => (
            <button
              key={l.to}
              className={`dh-link ${ativo(l.to) ? "active" : ""}`}
              onClick={() => navigate(l.to)}
            >
              {l.label}
            </button>
          ))}
        </nav>

        <button className="dh-novo" onClick={() => navigate("/novo")}>
          <Icon name="plus" size={18} />
          Novo
        </button>
      </div>
    </header>
  );
}
