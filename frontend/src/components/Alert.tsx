import type { ReactNode } from "react";
import { Icon } from "./Icon";

interface AlertProps {
  children: ReactNode;
  className?: string;
}

/** Caixa de informação neutra com ícone, para textos explicativos. */
export function Alert({ children, className }: AlertProps) {
  return (
    <div className={`alert ${className ?? ""}`} role="note">
      <Icon name="info" size={20} />
      <span>{children}</span>
    </div>
  );
}
