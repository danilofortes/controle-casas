import type { ReactNode } from "react";

interface AnelProgressoProps {
  /** Percentual de preenchimento (0–100). */
  valor: number;
  /** Diâmetro externo do anel em px. */
  tamanho?: number;
  /** Espessura do traço em px. */
  espessura?: number;
  /** Conteúdo central. Quando omitido, mostra o percentual e o rótulo. */
  children?: ReactNode;
  /** Rótulo pequeno abaixo do percentual (ignorado se children for passado). */
  rotulo?: string;
  /** Cor do preenchimento. */
  cor?: string;
  /** Cor da trilha (fundo do anel). */
  corTrilho?: string;
}

/**
 * Anel de progresso circular (SVG). O traço começa no topo (rotate -90deg) e
 * anima suavemente via stroke-dashoffset.
 */
export function AnelProgresso({
  valor,
  tamanho = 120,
  espessura = 12,
  children,
  rotulo = "recebido",
  cor = "var(--secondary)",
  corTrilho = "rgba(118, 171, 174, 0.18)",
}: AnelProgressoProps) {
  const pct = Math.max(0, Math.min(100, valor));
  const raio = (tamanho - espessura) / 2;
  const circunferencia = 2 * Math.PI * raio;
  const offset = circunferencia * (1 - pct / 100);

  return (
    <div
      className="anel-progresso"
      style={{ width: tamanho, height: tamanho }}
    >
      <svg width={tamanho} height={tamanho} aria-hidden>
        <circle
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={corTrilho}
          strokeWidth={espessura}
        />
        <circle
          className="anel-progresso-arc"
          cx={tamanho / 2}
          cy={tamanho / 2}
          r={raio}
          fill="none"
          stroke={cor}
          strokeWidth={espessura}
          strokeLinecap="round"
          strokeDasharray={circunferencia}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${tamanho / 2} ${tamanho / 2})`}
        />
      </svg>
      <div className="anel-progresso-centro">
        {children ?? (
          <>
            <span className="anel-progresso-pct">{Math.round(pct)}%</span>
            {rotulo && <span className="anel-progresso-rotulo">{rotulo}</span>}
          </>
        )}
      </div>
    </div>
  );
}
