import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getDashboardMonth } from "@/lib/joao-financas/bills.functions";
import { getFinanceOverview } from "@/lib/joao-financas/finance.functions";
import { formatBRL } from "@/lib/joao-financas/format";
import { monthLabel } from "@/lib/joao-financas/labels";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/financas/_authenticated/relatorios")({
  head: () => ({
    meta: [{ title: "Relatórios - João Finanças" }],
  }),
  component: RelatoriosPage,
});

function RelatoriosPage() {
  const { data: month } = useQuery({
    queryKey: ["dashboard-month"],
    queryFn: () => getDashboardMonth(),
  });
  const { data: overview } = useQuery({
    queryKey: ["finance-overview"],
    queryFn: () => getFinanceOverview(),
  });

  const hasSeries = overview?.series?.some((s) => s.receitas > 0 || s.gastos > 0);
  const hasCats = (overview?.categories?.length || 0) > 0;

  return (
    <div className="space-y-5 w-full">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Relatórios</h1>
        <p className="text-sm text-muted-foreground">
          Visão consolidada com base nos lançamentos reais.
        </p>
      </header>

      {month && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card label={`Receita · ${monthLabel(month.referenceMonth)}`} value={formatBRL(month.receitaMes)} />
          <Card label="Total a pagar" value={formatBRL(month.totalAPagar)} />
          <Card label="Já pago" value={formatBRL(month.totalPago)} />
          <Card label="Saldo projetado" value={formatBRL(month.saldoProjetado)} />
        </section>
      )}

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <h2 className="font-semibold mb-1">Entradas e saídas</h2>
          {!hasSeries ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Ainda não há movimentações suficientes para gerar este gráfico.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview!.series}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="receitas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h2 className="font-semibold mb-1">Gastos por categoria</h2>
          {!hasCats ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Ainda não há movimentações suficientes para gerar este gráfico.
            </p>
          ) : (
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={overview!.categories}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} />
                  <Tooltip formatter={(v: number) => formatBRL(v)} contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12 }} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4">
        <h2 className="font-semibold mb-2">Evolução das dívidas</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Total BRL ativo: {formatBRL(overview?.totalDebtsBrl || 0)} · USD:{" "}
          {overview ? overview.totalDebtsUsd.toLocaleString("en-US", { style: "currency", currency: "USD" }) : "—"}
        </p>
        <Link to="/financas/dividas" className="text-sm text-primary">
          Abrir dívidas →
        </Link>
      </section>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1 tabular-nums">{value}</div>
    </div>
  );
}
