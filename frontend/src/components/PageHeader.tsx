import type { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Icon } from "./Icon";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  onMenu?: () => void;
  badgeCount?: number;
  actions?: ReactNode;
  showNovo?: boolean;
  showMenuButton?: boolean;
}

export function PageHeader({
  title,
  subtitle,
  onMenu,
  badgeCount = 0,
  actions,
  showNovo = true,
  showMenuButton = true,
}: PageHeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="ui-header">
      <div className="ui-greeting">
        <h1>{title}</h1>
        {subtitle && <p>{subtitle}</p>}
      </div>
      <div className="ui-header-actions">
        {actions}
        {badgeCount > 0 && (
          <button
            type="button"
            className="ui-icon-btn"
            aria-label={`${badgeCount} pendência(s)`}
            onClick={onMenu}
          >
            <Icon name="alert" size={18} />
            <span className="dot" aria-hidden />
          </button>
        )}
        {onMenu && showMenuButton && (
          <button
            type="button"
            className="ui-icon-btn header-menu-btn"
            aria-label="Abrir menu"
            onClick={onMenu}
          >
            <Icon name="menu" size={18} />
          </button>
        )}
        {showNovo && (
          <button
            type="button"
            className="ui-btn-primary hide-mobile"
            onClick={() => navigate("/novo")}
          >
            <Icon name="plus" size={16} />
            Novo lançamento
          </button>
        )}
      </div>
    </header>
  );
}
