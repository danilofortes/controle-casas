import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { api, type Relatorio } from "../lib/api";
import { competenciaAtual, formatarCentavos } from "../lib/format";
import { useApi } from "../lib/useApi";
import { Icon, type IconName } from "./Icon";

interface NavItem {
  to: string;
  label: string;
  icon: IconName;
}

const NAV: NavItem[] = [
  { to: "/", label: "Início", icon: "home" },
  { to: "/casas", label: "Casas", icon: "building" },
  { to: "/documentos", label: "Documentos", icon: "file" },
  { to: "/relatorio", label: "Relatório", icon: "chart" },
  { to: "/ajustes", label: "Ajustes", icon: "settings" },
];

export function AppSidebar() {
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const { sair } = useAuth();
  const comp = competenciaAtual();

  const rel = useApi<Relatorio>(
    () => api.get<Relatorio>(`/relatorio?competencia=${comp}`),
    [],
  );

  const ativo = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const recebido = rel.data?.totais.total_recebido_centavos ?? 0;
  const total = rel.data?.totais.total_a_receber_centavos ?? 0;
  const pct = total > 0 ? Math.round((recebido / total) * 100) : 0;
  const emAberto = rel.data?.totais.total_em_aberto_centavos ?? 0;

  return (
    <aside className="app-sidebar" aria-label="Navegação principal">
      <button
        type="button"
        className="app-brand"
        onClick={() => navigate("/")}
        aria-label="Ir para o início"
      >
        <span className="app-brand-icon" aria-hidden>
          <Icon name="home" size={20} />
        </span>
        Casa em Dia
      </button>

      <nav className="app-nav">
        {NAV.map((item) => (
          <button
            key={item.to}
            type="button"
            className={`app-nav-item${ativo(item.to) ? " is-active" : ""}`}
            onClick={() => navigate(item.to)}
          >
            <Icon name={item.icon} size={18} />
            {item.label}
          </button>
        ))}
        <button
          type="button"
          className="app-nav-item is-cta"
          onClick={() => navigate("/novo")}
        >
          <Icon name="plus" size={18} />
          Novo lançamento
        </button>
      </nav>

      <p className="app-sidebar-label">Resumo do mês</p>
      <div className="ui-quick-stat">
        <div className="ui-quick-stat-head">
          <span>Recebido</span>
          <span className="ui-badge-up">+{pct}%</span>
        </div>
        <div className="ui-quick-stat-value">{formatarCentavos(recebido)}</div>
        <div className="ui-progress" style={{ marginTop: 10 }}>
          <div
            className="ui-progress-fill primary"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <div className="ui-quick-stat">
        <div className="ui-quick-stat-head">
          <span>Em aberto</span>
        </div>
        <div className="ui-quick-stat-value">{formatarCentavos(emAberto)}</div>
        <div className="ui-progress" style={{ marginTop: 10 }}>
          <div
            className="ui-progress-fill secondary"
            style={{
              width: `${total > 0 ? Math.round((emAberto / total) * 100) : 0}%`,
            }}
          />
        </div>
      </div>

      <div className="app-sidebar-footer">
        <div className="ui-user">
          <div className="ui-avatar" aria-hidden />
          <div>
            <div className="ui-user-name">Administrador</div>
            <div className="ui-user-email">Terreno compartilhado</div>
          </div>
        </div>
        <button type="button" className="app-nav-item" onClick={sair}>
          <Icon name="logout" size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
