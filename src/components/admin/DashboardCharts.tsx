import { useMemo } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ChartData = {
  daily: { labels: string[]; values: number[] };
  status: { labels: string[]; values: number[] };
};

const STATUS_COLORS = ["#3b82f6", "#f59e0b", "#16ca85", "#8b5cf6"];

function chartTooltipStyle(isDark: boolean) {
  return {
    backgroundColor: isDark ? "#1e293b" : "#fff",
    border: `1px solid ${isDark ? "rgba(148,163,184,0.2)" : "rgba(15,23,42,0.08)"}`,
    borderRadius: 8,
    fontSize: 12,
  };
}

export function DashboardCharts({ data }: { data: ChartData }) {
  const isDark =
    typeof document !== "undefined" &&
    document.documentElement.getAttribute("data-bs-theme") === "dark";

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

  const tickColor = isDark ? "#94a3b8" : "#64748b";
  const gridColor = isDark ? "rgba(148,163,184,0.15)" : "rgba(15,23,42,0.08)";

  return (
    <section className="analytics-section" aria-labelledby="charts-title">
      <div className="analytics-section__head">
        <h2 id="charts-title" className="analytics-section__title">
          Visão geral de analytics
        </h2>
        <span className="analytics-period-badge">Últimos 30 dias</span>
      </div>

      <div className="analytics-charts">
        <article className="chart-card chart-card--wide">
          <h3 className="chart-card__title">Evolução diária</h3>
          <p className="chart-card__subtitle">Registros por data de visita</p>
          <div className="chart-card__canvas">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <XAxis
                  dataKey="label"
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  interval="preserveStartEnd"
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: tickColor, fontSize: 11 }}
                  axisLine={false}
                  tickLine={false}
                  width={28}
                />
                <Tooltip
                  cursor={{ fill: isDark ? "rgba(148,163,184,0.08)" : "rgba(15,23,42,0.04)" }}
                  contentStyle={chartTooltipStyle(isDark)}
                  formatter={(value: number) => [value, "Registros"]}
                />
                <Bar
                  dataKey="value"
                  fill="#16ca85"
                  radius={[6, 6, 0, 0]}
                  maxBarSize={36}
                  name="Registros"
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </article>

        <article className="chart-card">
          <h3 className="chart-card__title">Distribuição de status</h3>
          <p className="chart-card__subtitle">Proporção por etapa</p>
          <div className="chart-card__canvas chart-card__canvas--donut">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius="68%"
                  outerRadius="88%"
                  paddingAngle={1}
                >
                  {pieData.map((_, i) => (
                    <Cell key={pieData[i].name} fill={STATUS_COLORS[i % STATUS_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={chartTooltipStyle(isDark)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <ul className="chart-card__legend list-unstyled d-flex flex-wrap justify-content-center gap-3 mb-0 mt-2 small">
            {pieData.map((entry, i) => (
              <li key={entry.name} className="d-flex align-items-center gap-1">
                <span
                  className="rounded-circle d-inline-block"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: STATUS_COLORS[i % STATUS_COLORS.length],
                  }}
                  aria-hidden="true"
                />
                {entry.name}
              </li>
            ))}
          </ul>
        </article>
      </div>
    </section>
  );
}
