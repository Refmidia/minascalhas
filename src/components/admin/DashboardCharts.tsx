import { useMemo, useSyncExternalStore } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { TooltipProps } from "recharts";

type ChartData = {
  daily: { labels: string[]; values: number[] };
  status: { labels: string[]; values: number[] };
};

const STATUS_STYLES: Record<string, { color: string; soft: string }> = {
  Agendado: { color: "#3b82f6", soft: "rgba(59, 130, 246, 0.14)" },
  Orçamentado: { color: "#EAB308", soft: "rgba(234, 179, 8, 0.14)" },
  Orcamentado: { color: "#EAB308", soft: "rgba(234, 179, 8, 0.14)" },
  Confirmado: { color: "#CA8A04", soft: "rgba(202, 138, 4, 0.14)" },
  Finalizado: { color: "#8b5cf6", soft: "rgba(139, 92, 246, 0.14)" },
};

const STATUS_FALLBACK = [
  { color: "#3b82f6", soft: "rgba(59, 130, 246, 0.14)" },
  { color: "#EAB308", soft: "rgba(234, 179, 8, 0.14)" },
  { color: "#CA8A04", soft: "rgba(202, 138, 4, 0.14)" },
  { color: "#8b5cf6", soft: "rgba(139, 92, 246, 0.14)" },
];

function statusStyle(name: string, index: number) {
  return STATUS_STYLES[name] ?? STATUS_FALLBACK[index % STATUS_FALLBACK.length];
}

function subscribeTheme(cb: () => void) {
  const obs = new MutationObserver(cb);
  obs.observe(document.documentElement, { attributes: true, attributeFilter: ["data-bs-theme"] });
  return () => obs.disconnect();
}

function getIsDark() {
  return document.documentElement.getAttribute("data-bs-theme") === "dark";
}

function BarTooltip({
  active,
  payload,
  label,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const value = payload[0]?.value ?? 0;
  return (
    <div className="dash-chart-tooltip" role="status">
      <span className="dash-chart-tooltip__date">{label}</span>
      <strong className="dash-chart-tooltip__value">
        {value} {value === 1 ? "registro" : "registros"}
      </strong>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: TooltipProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  const name = String(item?.name ?? "");
  const value = Number(item?.value ?? 0);
  const pct = Number(item?.payload?.percent ?? 0);
  const pctLabel = Number.isFinite(pct) && pct > 0 ? pct.toFixed(1) : null;
  return (
    <div className="dash-chart-tooltip dash-chart-tooltip--pie" role="status">
      <span
        className="dash-chart-tooltip__dot"
        style={{ background: String(item?.color ?? "#CA8A04") }}
        aria-hidden="true"
      />
      <div>
        <span className="dash-chart-tooltip__date">{name}</span>
        <strong className="dash-chart-tooltip__value">
          {value}
          {pctLabel != null ? ` · ${pctLabel}%` : ""}
        </strong>
      </div>
    </div>
  );
}

export function DashboardCharts({ data }: { data: ChartData }) {
  const isDark = useSyncExternalStore(subscribeTheme, getIsDark, () => false);

  const barData = useMemo(
    () => data.daily.labels.map((label, i) => ({ label, value: data.daily.values[i] ?? 0 })),
    [data.daily],
  );

  const pieData = useMemo(
    () =>
      data.status.labels.map((name, i) => ({
        name,
        value: data.status.values[i] ?? 0,
      })),
    [data.status],
  );

  const barPeak = useMemo(() => Math.max(0, ...barData.map((d) => d.value)), [barData]);
  const barTotal = useMemo(() => barData.reduce((s, d) => s + d.value, 0), [barData]);
  const pieTotal = useMemo(() => pieData.reduce((s, d) => s + d.value, 0), [pieData]);

  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)";
  const barFill = isDark ? "#EAB308" : "#CA8A04";
  const barFillDim = isDark ? "rgba(234, 179, 8, 0.35)" : "rgba(202, 138, 4, 0.35)";

  return (
    <section className="analytics-section analytics-section--charts" aria-labelledby="charts-title">
      <div className="analytics-section__head analytics-section__head--charts">
        <div className="analytics-section__intro">
          <span className="analytics-section__eyebrow">
            <i className="bi bi-graph-up-arrow" aria-hidden="true" />
            Analytics
          </span>
          <h2 id="charts-title" className="analytics-section__title">
            Visão geral do funil
          </h2>
          <p className="analytics-section__meta analytics-section__meta--charts">
            Volume diário e distribuição por etapa nos últimos 30 dias
          </p>
        </div>
        <span className="analytics-period-badge">
          <i className="bi bi-calendar3" aria-hidden="true" />
          Últimos 30 dias
        </span>
      </div>

      <div className="analytics-charts">
        <article className="chart-card chart-card--wide">
          <header className="chart-card__header">
            <div className="chart-card__heading">
              <span className="chart-card__icon chart-card__icon--bar" aria-hidden="true">
                <i className="bi bi-bar-chart-line" />
              </span>
              <div>
                <h3 className="chart-card__title">Evolução diária</h3>
                <p className="chart-card__subtitle">Registros por data de visita</p>
              </div>
            </div>
            <div className="chart-card__kpis" aria-label="Resumo do período">
              <div className="chart-card__kpi">
                <span className="chart-card__kpi-label">Total</span>
                <strong className="chart-card__kpi-value">{barTotal}</strong>
              </div>
              <div className="chart-card__kpi">
                <span className="chart-card__kpi-label">Pico</span>
                <strong className="chart-card__kpi-value">{barPeak}</strong>
              </div>
            </div>
          </header>
          <div className="chart-card__canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 12, right: 12, left: -4, bottom: 4 }}>
                <defs>
                  <linearGradient id="dashBarGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor={barFill} stopOpacity={0.95} />
                    <stop offset="100%" stopColor={barFill} stopOpacity={0.45} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke={gridColor} strokeDasharray="4 4" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                  dy={6}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 10, fontWeight: 500 }}
                  axisLine={false}
                  tickLine={false}
                  width={32}
                />
                <Tooltip content={<BarTooltip />} cursor={{ fill: barFillDim, radius: 6 }} />
                <Bar
                  dataKey="value"
                  fill="url(#dashBarGrad)"
                  radius={[8, 8, 4, 4]}
                  maxBarSize={40}
                  name="Registros"
                  activeBar={{ fill: barFill, opacity: 1 }}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card chart-card--donut">
          <header className="chart-card__header">
            <div className="chart-card__heading">
              <span className="chart-card__icon chart-card__icon--pie" aria-hidden="true">
                <i className="bi bi-pie-chart" />
              </span>
              <div>
                <h3 className="chart-card__title">Distribuição de status</h3>
                <p className="chart-card__subtitle">Proporção por etapa do funil</p>
              </div>
            </div>
          </header>
          <div className="chart-card__canvas chart-card__canvas--donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  innerRadius="62%"
                  outerRadius="82%"
                  paddingAngle={pieData.length > 1 ? 3 : 0}
                  stroke={isDark ? "#1b222e" : "#ffffff"}
                  strokeWidth={2}
                >
                  {pieData.map((entry, i) => (
                    <Cell key={entry.name} fill={statusStyle(entry.name, i).color} />
                  ))}
                </Pie>
                <Tooltip content={<PieTooltip />} />
              </PieChart>
            </ResponsiveContainer>
            <div className="chart-card__donut-center" aria-hidden="true">
              <strong className="chart-card__donut-total">{pieTotal}</strong>
              <span className="chart-card__donut-label">registros</span>
            </div>
          </div>
          <ul className="chart-card__legend">
            {pieData.map((entry, i) => {
              const style = statusStyle(entry.name, i);
              const pct = pieTotal > 0 ? Math.round((entry.value / pieTotal) * 100) : 0;
              return (
                <li key={entry.name} className="chart-card__legend-item">
                  <span
                    className="chart-card__legend-swatch"
                    style={{ background: style.color, boxShadow: `0 0 0 3px ${style.soft}` }}
                    aria-hidden="true"
                  />
                  <span className="chart-card__legend-name">{entry.name}</span>
                  <span className="chart-card__legend-meta">
                    <strong>{entry.value}</strong>
                    <span className="chart-card__legend-pct">{pct}%</span>
                  </span>
                </li>
              );
            })}
          </ul>
        </article>
      </div>
    </section>
  );
}
