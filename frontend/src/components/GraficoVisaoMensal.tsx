import { formatarCentavos, formatarCompetencia } from "../lib/format";
import { Icon } from "./Icon";

const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

interface Props {
  competencia: string;
  recebido: number;
  emAberto: number;
}

function serieSintetica(atual: number, total: number, mesIdx: number, i: number): number {
  if (i === mesIdx) return atual;
  const base = total * (0.42 + 0.08 * Math.sin(i * 0.75 + 1.2) + i * 0.018);
  return Math.max(0, Math.round(base * (i < mesIdx ? 0.88 : 1.05)));
}

function rotuloEixo(valorCentavos: number): string {
  if (valorCentavos >= 100_000) {
    return `R$ ${(valorCentavos / 100_000).toFixed(0)}k`;
  }
  if (valorCentavos >= 1000) {
    return `R$ ${Math.round(valorCentavos / 1000)}k`;
  }
  return formatarCentavos(valorCentavos);
}

/** Curva suave passando pelos pontos (monotone). */
function curvaSuave(
  pontos: { x: number; y: number }[],
  fecharBase?: number,
): string {
  if (pontos.length < 2) return "";
  let d = `M ${pontos[0].x} ${pontos[0].y}`;
  for (let i = 0; i < pontos.length - 1; i++) {
    const p0 = pontos[i - 1] ?? pontos[i];
    const p1 = pontos[i];
    const p2 = pontos[i + 1];
    const p3 = pontos[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  if (fecharBase != null) {
    const ult = pontos[pontos.length - 1];
    const pri = pontos[0];
    d += ` L ${ult.x} ${fecharBase} L ${pri.x} ${fecharBase} Z`;
  }
  return d;
}

export function GraficoVisaoMensal({ competencia, recebido, emAberto }: Props) {
  const [, mesStr] = competencia.split("-");
  const mesIdx = Math.max(0, Math.min(11, Number(mesStr) - 1));
  const ano = competencia.split("-")[0];
  const total = Math.max(recebido + emAberto, 1);

  const recebidos = MESES.map((_, i) => serieSintetica(recebido, total, mesIdx, i));
  const abertos = MESES.map((_, i) => serieSintetica(emAberto, total, mesIdx, i));

  const maxVal = Math.max(...recebidos, ...abertos, 1);
  const escalaMax = Math.ceil(maxVal / 20_000) * 20_000 || 20_000;
  const ticks = [0, 0.33, 0.66, 1].map((t) => Math.round(escalaMax * t));

  const w = 560;
  const h = 220;
  const pad = { t: 24, r: 24, b: 36, l: 44 };
  const innerW = w - pad.l - pad.r;
  const innerH = h - pad.t - pad.b;

  const px = (i: number) => pad.l + (i / (MESES.length - 1)) * innerW;
  const py = (v: number) => pad.t + innerH - (v / escalaMax) * innerH;

  const ptsRecebido = recebidos.map((v, i) => ({ x: px(i), y: py(v) }));
  const ptsAberto = abertos.map((v, i) => ({ x: px(i), y: py(v) }));
  const focusX = px(mesIdx);

  const cardLeft = Math.min(Math.max((focusX / w) * 100, 18), 62);

  return (
    <div className="budget-chart-panel">
      <div className="budget-chart-head">
        <div className="budget-chart-title">
          <Icon name="chart" size={18} />
          Visão do mês
        </div>
        <div className="budget-chart-controls">
          <span className="budget-control">
            <Icon name="receipt" size={14} />
            {ano}
          </span>
          <span className="budget-control">Mensal</span>
        </div>
      </div>

      <div className="budget-chart-body">
        <svg
          viewBox={`0 0 ${w} ${h}`}
          width="100%"
          className="budget-chart-svg"
          aria-hidden
        >
          {ticks.slice(1).map((tick) => {
            const y = py(tick);
            return (
              <g key={tick}>
                <line
                  x1={pad.l}
                  y1={y}
                  x2={w - pad.r}
                  y2={y}
                  stroke="var(--apex-line)"
                  strokeWidth="1"
                />
                <text
                  x={pad.l - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--apex-muted)"
                  fontFamily="Plus Jakarta Sans, sans-serif"
                >
                  {rotuloEixo(tick)}
                </text>
              </g>
            );
          })}

          <path
            d={curvaSuave(ptsRecebido, h - pad.b)}
            fill="rgba(239, 200, 139, 0.28)"
            stroke="none"
          />
          <path
            d={curvaSuave(ptsRecebido)}
            fill="none"
            stroke="#c9a05a"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d={curvaSuave(ptsAberto)}
            fill="none"
            stroke="var(--spicy-paprika)"
            strokeWidth="2.5"
            strokeLinecap="round"
          />

          <line
            x1={focusX}
            y1={pad.t}
            x2={focusX}
            y2={h - pad.b}
            stroke="var(--apex-muted)"
            strokeWidth="1"
            strokeDasharray="4 4"
            opacity="0.55"
          />

          {MESES.map((m, i) => (
            <text
              key={m}
              x={px(i)}
              y={h - 10}
              textAnchor="middle"
              fontSize="11"
              fontWeight={i === mesIdx ? 700 : 500}
              fill={i === mesIdx ? "var(--apex-ink)" : "var(--apex-muted)"}
              fontFamily="Plus Jakarta Sans, sans-serif"
            >
              {m}
            </text>
          ))}
        </svg>

        <div className="budget-float-cards" style={{ left: `${cardLeft}%` }}>
          <div className="budget-float-card recebido">
            <div className="budget-float-head">
              <span
                className="budget-float-dot"
                style={{ background: "#c9a05a" }}
              />
              <span>Recebido</span>
              <span className="budget-float-date">{formatarCompetencia(competencia)}</span>
            </div>
            <div className="budget-float-value">{formatarCentavos(recebido)}</div>
          </div>
          <div className="budget-float-card aberto">
            <div className="budget-float-head">
              <span
                className="budget-float-dot"
                style={{ background: "var(--spicy-paprika)" }}
              />
              <span>Em aberto</span>
              <span className="budget-float-date">{formatarCompetencia(competencia)}</span>
            </div>
            <div className="budget-float-value">{formatarCentavos(emAberto)}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
