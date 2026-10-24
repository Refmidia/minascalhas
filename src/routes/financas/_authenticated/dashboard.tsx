import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDashboardMonth } from "@/lib/joao-financas/bills.functions";
import { getFinanceOverview } from "@/lib/joao-financas/finance.functions";
import { formatBRL, formatMoney, num } from "@/lib/joao-financas/format";
import { monthLabel } from "@/lib/joao-financas/labels";
import { PaymentModal, QuickPayModal, type QuickPayTarget } from "@/components/joao-financas/payment-modal";
import { BillListItem } from "@/components/joao-financas/bill-list-item";
import { FormModal } from "@/components/joao-financas/form-modal";
import { billDashboardLink } from "@/lib/joao-financas/bill-links";
import { cn } from "@/lib/utils";
import {
  ArrowRight,
  Plus,
  Wallet,
  TrendingUp,
  TrendingDown,
  PiggyBank,
  Receipt,
  CalendarDays,
  Check,
} from "lucide-react";
import {
  BarChart,
  Bar,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

export const Route = createFileRoute("/financas/_authenticated/dashboard")({
  head: () => ({
    meta: [
      { title: "Visão geral - João Finanças" },
      { name: "description", content: "Resumo claro do mês e contas a pagar." },
    ],
  }),
  component: Dashboard,
});

type PayTarget = {
  title: string;
  expectedAmount: number;
  currency?: string;
  monthlyBillId?: string;
  debtId?: string;
  installmentId?: string;
};

function Dashboard() {
  const qc = useQueryClient();
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [quickPay, setQuickPay] = useState<QuickPayTarget | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [novoOpen, setNovoOpen] = useState(false);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["dashboard-month"],
    queryFn: () => getDashboardMonth(),
    retry: 1,
  });

  const { data: overview } = useQuery({
    queryKey: ["finance-overview"],
    queryFn: () => getFinanceOverview(),
    retry: 1,
  });

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["dashboard-month"] });
    qc.invalidateQueries({ queryKey: ["month-bills"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
    qc.invalidateQueries({ queryKey: ["debts"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-64 rounded bg-white/5 animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 rounded-2xl bg-white/5 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="glass-card rounded-2xl p-6 max-w-lg space-y-3">
        <h2 className="font-semibold text-lg">Não foi possível carregar o painel</h2>
        <p className="text-sm text-muted-foreground">
          {error instanceof Error ? error.message : "Erro ao buscar dados do mês."}
        </p>
        <button
          type="button"
          onClick={() => refetch()}
          className="inline-flex px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          Tentar novamente
        </button>
      </div>
    );
  }

  const monthName = monthLabel(data.referenceMonth);
  const scoreColor =
    data.health.score >= 85
      ? "var(--success)"
      : data.health.score >= 70
        ? "var(--primary)"
        : data.health.score >= 50
          ? "var(--warning)"
          : "var(--danger)";

  const chartData =
    overview?.series?.some((s) => s.receitas > 0 || s.gastos > 0)
      ? overview.series
      : null;

  const categoryData = overview?.categories || [];

  return (
    <div className="space-y-5 max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            {greeting}.{" "}
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "var(--gradient-primary)" }}
            >
              Visão geral
            </span>
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Quanto entrou, o que pagar, o que já foi pago e o que sobra em {monthName}.
          </p>
        </div>
        <button
          onClick={() => setNovoOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="size-4" /> Novo lançamento
        </button>
      </header>

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <BigKpi label="Receita do mês" value={formatBRL(data.receitaMes)} hint="Prevista / recebida" />
        <BigKpi label="Total a pagar" value={formatBRL(data.totalAPagar)} hint="Contas do mês" />
        <BigKpi label="Já pago" value={formatBRL(data.totalPago)} hint="Registrado" tone="success" />
        <BigKpi
          label="Falta pagar"
          value={formatBRL(data.faltaPagar)}
          hint={`Saldo projetado ${formatBRL(data.saldoProjetado)}`}
          tone={data.faltaPagar > 0 ? "warning" : "success"}
        />
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-semibold capitalize">Resumo de {monthName}</h2>
          <Link to="/financas/contas-do-mes" className="text-xs text-primary inline-flex items-center gap-1">
            Ver todas <ArrowRight className="size-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          <Mini label="Receita prevista" value={formatBRL(data.receitaPrevista)} />
          <Mini label="Receita recebida" value={formatBRL(data.receitaRecebida)} />
          <Mini label="Contas pagas" value={`${data.progress.paidCount}`} />
          <Mini label="Contas pendentes" value={`${data.progress.count - data.progress.paidCount}`} />
          <Mini label="Dívidas pagas (mês)" value={formatBRL(data.totalPago)} />
          <Mini
            label="Saldo disponível"
            value={formatBRL(data.saldoProjetado)}
            tone={data.saldoProjetado >= 0 ? "success" : "danger"}
          />
          <Mini label="Orçamento comprometido" value={`${data.commitmentPct.toFixed(0)}%`} />
          <Mini label="Atrasadas" value={String(data.overdueCount)} tone={data.overdueCount ? "danger" : "success"} />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="text-muted-foreground">Progresso das contas do mês</span>
            <span className="font-medium">
              {data.progress.paidCount} de {data.progress.count} contas · {data.progress.progressPct}%
            </span>
          </div>
          <div className="h-2 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${data.progress.progressPct}%`, background: "var(--gradient-primary)" }}
            />
          </div>
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
          <div className="min-w-0">
            <h2 className="font-semibold">Contas deste mês</h2>
            {data.nextBill && (
              <span className="text-xs text-muted-foreground">
                Próxima: {data.nextBill.name} · dia {data.nextBill.due_date.slice(8)}
              </span>
            )}
          </div>
          <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2.5 sm:shrink-0">
            <span className="text-xs text-muted-foreground">Data do pagamento</span>
            <input
              type="date"
              value={payDate}
              onChange={(e) => setPayDate(e.target.value)}
              className="bg-transparent border-0 p-0 text-sm font-medium text-right focus:outline-none focus:ring-0 [color-scheme:dark]"
            />
          </div>
        </div>
        {data.billsPreview.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            Nenhuma conta gerada para este mês. Distribua Internet/Água/Energia ou adicione contas.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-xl overflow-hidden">
            {data.billsPreview.map((b) => {
              const ds = b.display_status || b.status;
              const paid = ds === "pago";
              const remaining = Math.max(0, num(b.expected_amount) - num(b.paid_amount));
              const partial = !paid && remaining > 0 && remaining < num(b.expected_amount);
              const variableAmount = num(b.expected_amount) <= 0 && !paid;

              return (
                <BillListItem
                  key={b.id}
                  bill={b}
                  remaining={remaining}
                  paid={paid}
                  partial={partial}
                  variableAmount={variableAmount}
                  dashboardLink={billDashboardLink(b)}
                  detailLink={{
                    to: "/financas/contas-do-mes/$billId",
                    params: { billId: b.id },
                    search: { from: "dashboard" },
                  }}
                  onQuickPay={() =>
                    setQuickPay({
                      title: b.name,
                      amount: remaining || num(b.expected_amount),
                      currency: b.currency,
                      monthlyBillId: b.id,
                    })
                  }
                  onAdjustPay={() =>
                    setPay({
                      title: b.name,
                      expectedAmount: remaining || num(b.expected_amount),
                      currency: b.currency,
                      monthlyBillId: b.id,
                    })
                  }
                />
              );
            })}
          </ul>
        )}
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5">
        <h2 className="font-semibold mb-3">Ações rápidas</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          <Quick to="/financas/receitas" icon={TrendingUp} label="Registrar receita" />
          <Quick to="/financas/gastos" icon={TrendingDown} label="Registrar despesa" />
          <Quick to="/financas/contas-do-mes" icon={Receipt} label="Pagar uma conta" />
          <Quick to="/financas/dividas" icon={Wallet} label="Adicionar dívida" />
          <Quick to="/financas/contas-recorrentes" icon={CalendarDays} label="Adicionar conta mensal" />
          <Quick to="/financas/reserva" icon={PiggyBank} label="Depositar na reserva" />
        </div>
      </section>

      <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold mb-1">Entradas e saídas</h3>
          <p className="text-xs text-muted-foreground mb-3">Últimos meses (dados reais)</p>
          {!chartData ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Ainda não há movimentações suficientes para gerar este gráfico.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `R$${v >= 1000 ? Math.round(v / 1000) + "k" : v}`} />
                  <Tooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="receitas" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="glass-card rounded-2xl p-4">
          <h3 className="font-semibold mb-1">Gastos por categoria</h3>
          <p className="text-xs text-muted-foreground mb-3">Este mês</p>
          {categoryData.length === 0 ? (
            <p className="text-sm text-muted-foreground py-10 text-center">
              Ainda não há movimentações suficientes para gerar este gráfico.
            </p>
          ) : (
            <div className="h-56">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={categoryData}>
                  <CartesianGrid stroke="var(--border)" vertical={false} />
                  <XAxis dataKey="name" stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="var(--muted-foreground)" fontSize={11} tickLine={false} axisLine={false} width={40} tickFormatter={(v) => `R$${v >= 1000 ? Math.round(v / 1000) + "k" : v}`} />
                  <Tooltip contentStyle={{ background: "var(--surface-elevated)", border: "1px solid var(--border)", borderRadius: 12, fontSize: 12 }} formatter={(v: number) => formatBRL(v)} />
                  <Bar dataKey="value" fill="var(--primary)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </section>

      <section className="glass-card rounded-2xl p-4 md:p-5">
        <div className="flex flex-wrap items-start gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
              {data.health.provisional ? "Nota provisória" : "Nota financeira"}
            </div>
            <div className="text-3xl font-bold" style={{ color: scoreColor }}>
              {data.health.score}
            </div>
            <div className="text-sm font-medium" style={{ color: scoreColor }}>
              {data.health.label}
            </div>
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">Como foi calculada</div>
            <ul className="text-sm space-y-0.5">
              {data.health.factors.map((f) => (
                <li key={f}>• {f}</li>
              ))}
            </ul>
            {data.health.improve.length > 0 && (
              <>
                <div className="text-xs uppercase tracking-widest text-muted-foreground mt-3 mb-1">Como melhorar</div>
                <ul className="text-sm space-y-0.5">
                  {data.health.improve.map((f) => (
                    <li key={f}>• {f}</li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>
      </section>

      {quickPay && (
        <QuickPayModal
          target={quickPay}
          defaultDate={payDate}
          onClose={() => setQuickPay(null)}
          onSuccess={invalidate}
        />
      )}

      {pay && (
        <PaymentModal
          {...pay}
          defaultDate={payDate}
          onClose={() => setPay(null)}
          onSuccess={invalidate}
        />
      )}

      {novoOpen && (
        <FormModal title="+ Novo lançamento" onClose={() => setNovoOpen(false)}>
          {[
            { to: "/financas/receitas", label: "Receita" },
            { to: "/financas/gastos", label: "Despesa" },
            { to: "/financas/contas-do-mes", label: "Pagamento" },
            { to: "/financas/contas-recorrentes", label: "Conta" },
            { to: "/financas/dividas", label: "Dívida" },
            { to: "/financas/reserva", label: "Depósito na reserva" },
          ].map((item) => (
            <Link
              key={item.to + item.label}
              to={item.to}
              onClick={() => setNovoOpen(false)}
              className="block w-full text-left px-3 py-2.5 rounded-xl border border-border hover:bg-white/[0.05] text-sm"
            >
              {item.label}
            </Link>
          ))}
        </FormModal>
      )}
    </div>
  );
}

function BigKpi({
  label,
  value,
  hint,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "success" | "warning" | "danger";
}) {
  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-xl md:text-2xl font-bold tracking-tight tabular-nums mt-1",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
      {hint && <div className="text-[11px] text-muted-foreground mt-1">{hint}</div>}
    </div>
  );
}

function Mini({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "danger";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-semibold tabular-nums",
          tone === "success" && "text-success",
          tone === "danger" && "text-danger",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function Quick({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Wallet;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center gap-2 px-3 py-2.5 rounded-xl border border-border hover:bg-white/[0.04] text-sm"
    >
      <Icon className="size-4 text-primary shrink-0" />
      {label}
    </Link>
  );
}
