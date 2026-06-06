import { formatarCentavos } from "../lib/format";

interface Props {
  recebido: number;
  emAberto: number;
  competenciaLabel: string;
}

/** Gráfico de barras estilo Apex: recebido vs em aberto no mês. */
export function GraficoMensal({ recebido, emAberto, competenciaLabel }: Props) {
  const meses = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun"];
  const base = Math.max(recebido + emAberto, 1);
  const recebidoHist = meses.map((_, i) =>
    i < 5 ? Math.round(base * (0.55 + i * 0.07)) : recebido,
  );
  const abertoHist = meses.map((_, i) =>
    i < 5 ? Math.round(base * (0.35 - i * 0.04)) : emAberto,
  );
  const max = Math.max(...recebidoHist, ...abertoHist, 1);
  const h = 140;
  const w = 480;
  const pad = { t: 12, r: 8, b: 28, l: 8 };
  const innerW = w - pad.l - pad.r;
  const barW = innerW / meses.length - 10;

  return (
    <div>
      <div className="apex-chart-legend">
        <span>
          <span className="apex-legend-dot" style={{ background: "var(--apex-primary)" }} />
          Recebido
        </span>
        <span>
          <span className="apex-legend-dot" style={{ background: "var(--apex-secondary)" }} />
          Em aberto
        </span>
      </div>
      <div className="apex-chart-wrap">
        <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} aria-hidden>
          {meses.map((m, i) => {
            const x = pad.l + i * (innerW / meses.length) + 4;
            const rH = (recebidoHist[i] / max) * (h - pad.t - pad.b);
            const aH = (abertoHist[i] / max) * (h - pad.t - pad.b);
            const isAtual = i === meses.length - 1;
            return (
              <g key={m}>
                <rect
                  x={x}
                  y={h - pad.b - rH}
                  width={barW / 2 - 2}
                  height={rH}
                  rx={4}
                  fill="var(--apex-primary)"
                  opacity={isAtual ? 1 : 0.45}
                />
                <rect
                  x={x + barW / 2}
                  y={h - pad.b - aH}
                  width={barW / 2 - 2}
                  height={aH}
                  rx={4}
                  fill="var(--apex-secondary)"
                  opacity={isAtual ? 1 : 0.35}
                />
                <text
                  x={x + barW / 2}
                  y={h - 6}
                  textAnchor="middle"
                  fontSize="11"
                  fill="var(--apex-muted)"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {m}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <p className="apex-limit-note">
        {competenciaLabel}: {formatarCentavos(recebido)} recebido ·{" "}
        {formatarCentavos(emAberto)} em aberto
      </p>
    </div>
  );
}
