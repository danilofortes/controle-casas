import { formatarCentavos } from "../lib/format";

interface Fatia {
  rotulo: string;
  valor: number;
  cor: string;
}

interface Props {
  fatias: Fatia[];
  titulo?: string;
}

export function GraficoDonut({ fatias, titulo = "Composição" }: Props) {
  const total = fatias.reduce((s, f) => s + f.valor, 0) || 1;
  const r = 54;
  const cx = 70;
  const cy = 70;
  const circ = 2 * Math.PI * r;
  let offset = 0;

  return (
    <div className="apex-donut-wrap">
      <svg width="140" height="140" viewBox="0 0 140 140" aria-hidden>
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--apex-line)" strokeWidth="14" />
        {fatias.map((f) => {
          const pct = f.valor / total;
          const dash = pct * circ;
          const el = (
            <circle
              key={f.rotulo}
              cx={cx}
              cy={cy}
              r={r}
              fill="none"
              stroke={f.cor}
              strokeWidth="14"
              strokeDasharray={`${dash} ${circ - dash}`}
              strokeDashoffset={-offset}
              transform={`rotate(-90 ${cx} ${cy})`}
            />
          );
          offset += dash;
          return el;
        })}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          fontSize="11"
          fill="var(--apex-muted)"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {titulo}
        </text>
        <text
          x={cx}
          y={cy + 14}
          textAnchor="middle"
          fontSize="15"
          fontWeight="700"
          fill="var(--apex-ink)"
          fontFamily="Plus Jakarta Sans, sans-serif"
        >
          {formatarCentavos(total)}
        </text>
      </svg>
      <div className="apex-donut-legend">
        {fatias.map((f) => (
          <div className="apex-donut-row" key={f.rotulo}>
            <span className="apex-donut-row-left">
              <span className="apex-legend-dot" style={{ background: f.cor }} />
              {f.rotulo}
            </span>
            <span className="apex-donut-row-value">
              {total > 0 ? Math.round((f.valor / total) * 100) : 0}% ·{" "}
              {formatarCentavos(f.valor)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
