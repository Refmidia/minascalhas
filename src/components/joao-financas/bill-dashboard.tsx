import { Link } from "@tanstack/react-router";
import { formatMoney, formatDateBR, num } from "@/lib/joao-financas/format";
import { labelGroup, labelStatus, monthLabel, statusTone } from "@/lib/joao-financas/labels";
import type { PaymentRow } from "@/lib/joao-financas/bills.server";
import {
  ArrowLeft,
  Calendar,
  Check,
  ChevronRight,
  CircleCheck,
  Clock,
  History,
  MoreHorizontal,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Bill = {
  id: string;
  name: string;
  category: string;
  group_key: string;
  reference_month: string;
  due_date: string;
  expected_amount: number | string;
  paid_amount: number | string;
  currency: string;
  status: string;
  display_status?: string;
  notes?: string | null;
};

type Source = {
  kind: string;
  label: string;
  debtId?: string;
  recurringId?: string;
};

type Stats = {
  totalExpected: number;
  totalPaid: number;
  totalRemaining: number;
  monthsTotal: number;
  monthsPaid: number;
  progressPct: number;
};

export function BillDashboardView({
  bill,
  payments,
  relatedBills,
  source,
  stats,
  remaining,
  payDate,
  onPayDateChange,
  onQuickPay,
  onPartialPay,
  onPayMonth,
  backTo,
}: {
  bill: Bill;
  payments: PaymentRow[];
  relatedBills: Bill[];
  source: Source | null;
  stats: Stats;
  remaining: number;
  payDate: string;
  onPayDateChange: (v: string) => void;
  onQuickPay: () => void;
  onPartialPay: () => void;
  onPayMonth?: (monthBill: Bill, amount: number) => void;
  backTo: { to: "/financas/dashboard" | "/contas-do-mes"; label: string };
}) {
  const ds = bill.display_status || bill.status;
  const paid = ds === "pago";
  const tone = statusTone(ds);
  const monthProgress =
    num(bill.expected_amount) > 0
      ? Math.min(100, Math.round((num(bill.paid_amount) / num(bill.expected_amount)) * 100))
      : 0;

  const lastPayment = payments[0];
  const avgPayment =
    payments.length > 0
      ? payments.reduce((a, p) => a + num(p.amount), 0) / payments.length
      : 0;

  const sortedMonths = [...relatedBills].sort((a, b) =>
    a.reference_month.localeCompare(b.reference_month),
  );

  const pendingMonths = sortedMonths.filter((m) => (m.display_status || m.status) !== "pago");
  const isInstallmentPlan =
    source?.kind?.toLowerCase().includes("parcela") || stats.monthsTotal > 12;

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      <Link
        to={backTo.to}
        className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> {backTo.label}
      </Link>

      {/* Hero full width */}
      <section
        className="rounded-3xl border border-border/60 relative overflow-hidden"
        style={{ background: "var(--surface-elevated)" }}
      >
        <div
          className="absolute inset-0 opacity-[0.06] pointer-events-none"
          style={{ background: "var(--gradient-primary)" }}
        />
        <div className="relative p-5 md:p-8">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6 lg:gap-10">
            <div className="flex-1 min-w-0 space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground px-2 py-0.5 rounded-full border border-border/60">
                  Painel da conta
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground capitalize">
                  {monthLabel(bill.reference_month)}
                </span>
                <StatusBadge status={ds} tone={tone} />
              </div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">{bill.name}</h1>
              <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                <span>{labelGroup(bill.group_key)}</span>
                <span>{bill.category}</span>
                <span className="inline-flex items-center gap-1">
                  <Calendar className="size-3.5 opacity-60" />
                  Vence {formatDateBR(bill.due_date)}
                </span>
              </div>

              {/* Barra geral */}
              <div className="pt-2 max-w-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Progresso geral</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(stats.totalPaid, bill.currency)} de{" "}
                    {formatMoney(stats.totalExpected, bill.currency)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
                  <div
                    className="h-full bg-success transition-all duration-700"
                    style={{ width: `${stats.progressPct}%` }}
                  />
                  <div
                    className="h-full bg-warning/30 transition-all duration-700"
                    style={{ width: `${100 - stats.progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <ProgressRing pct={stats.progressPct} size="lg" />
              <div className="hidden sm:grid grid-cols-1 gap-3 text-sm min-w-[140px]">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Falta pagar</div>
                  <div className={cn("text-xl font-bold tabular-nums", stats.totalRemaining > 0 ? "text-warning" : "text-success")}>
                    {formatMoney(stats.totalRemaining, bill.currency)}
                  </div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {isInstallmentPlan ? "Parcelas quitadas" : "Meses quitados"}
                  </div>
                  <div className="text-xl font-bold tabular-nums text-success">
                    {stats.monthsPaid}<span className="text-muted-foreground text-base font-normal">/{stats.monthsTotal}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCard icon={Wallet} label="Total pago" value={formatMoney(stats.totalPaid, bill.currency)} tone="success" />
        <StatCard icon={Clock} label="Ainda falta" value={formatMoney(stats.totalRemaining, bill.currency)} tone={stats.totalRemaining > 0 ? "warning" : "success"} />
        <StatCard label="Previsto total" value={formatMoney(stats.totalExpected, bill.currency)} />
        <StatCard
          icon={CircleCheck}
          label={isInstallmentPlan ? "Parcelas pagas" : "Meses pagos"}
          value={`${stats.monthsPaid} / ${stats.monthsTotal}`}
          tone="success"
        />
        <StatCard
          icon={Receipt}
          label="Lançamentos"
          value={String(payments.length)}
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Coluna principal */}
        <div className="xl:col-span-2 space-y-6">
          {/* Este mês — ação */}
          <section className="glass-card rounded-2xl p-5 md:p-6 space-y-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="font-semibold text-base">Este mês · {monthLabel(bill.reference_month)}</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {paid ? "Conta quitada neste mês" : "Registre o pagamento quando quitar"}
                </p>
              </div>
              <span className={cn(
                "text-sm font-bold tabular-nums px-3 py-1 rounded-full",
                paid ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
              )}>
                {monthProgress}% pago
              </span>
            </div>

            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${monthProgress}%`, background: "var(--gradient-primary)" }}
              />
            </div>

            <div className="grid grid-cols-3 gap-4 p-4 rounded-xl bg-white/[0.02] border border-border/40">
              <MiniStat label="Previsto" value={formatMoney(bill.expected_amount, bill.currency)} large />
              <MiniStat label="Pago" value={formatMoney(bill.paid_amount, bill.currency)} tone="success" large />
              <MiniStat label="Restante" value={formatMoney(remaining, bill.currency)} tone={remaining > 0 ? "warning" : "success"} large />
            </div>

            {!paid && (
              <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 pt-1">
                <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                  <label className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap shrink-0">
                    Data do pagamento
                  </label>
                  <input
                    type="date"
                    value={payDate}
                    onChange={(e) => onPayDateChange(e.target.value)}
                    className="flex-1 bg-white/[0.03] border border-border rounded-xl px-3 py-2.5 text-sm"
                  />
                </div>
                <button
                  type="button"
                  onClick={onQuickPay}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold text-primary-foreground shrink-0"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Check className="size-4" />
                  Paguei · {formatMoney(remaining || bill.expected_amount, bill.currency)}
                </button>
                <button
                  type="button"
                  onClick={onPartialPay}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-border text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
                >
                  <MoreHorizontal className="size-4" />
                  Parcial / ajuste
                </button>
              </div>
            )}

            {paid && (
              <div className="flex items-center gap-2 text-sm text-success px-4 py-3 rounded-xl bg-success/10 border border-success/20">
                <Check className="size-4 shrink-0" />
                Pagamento deste mês concluído
              </div>
            )}
          </section>

          {/* Histórico por mês — sempre visível */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
                <History className="size-4" />
                {isInstallmentPlan ? "Histórico de parcelas" : "Histórico por mês"}
              </h2>
              {pendingMonths.length > 0 && (
                <span className="text-xs text-warning">{pendingMonths.length} pendente(s)</span>
              )}
            </div>
            <ul className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
              {sortedMonths.map((rb) => (
                <MonthRow
                  key={rb.id}
                  rb={rb}
                  isCurrent={rb.id === bill.id}
                  onPayMonth={onPayMonth}
                />
              ))}
            </ul>
          </section>

          {/* Pagamentos */}
          <section className="space-y-3">
            <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
              Pagamentos registrados
            </h2>
            {payments.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <Receipt className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Nenhum pagamento registrado ainda.</p>
                {!paid && (
                  <button
                    type="button"
                    onClick={onQuickPay}
                    className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Check className="size-3.5" /> Registrar primeiro pagamento
                  </button>
                )}
              </div>
            ) : (
              <ul className="space-y-2">
                {payments.map((p, i) => (
                  <li key={p.id} className="glass-card rounded-xl p-4 flex gap-4">
                    <div className="flex flex-col items-center shrink-0">
                      <div className="size-10 rounded-full flex items-center justify-center bg-success/15 text-success">
                        <Check className="size-4" />
                      </div>
                      {i < payments.length - 1 && (
                        <div className="w-px flex-1 min-h-[12px] bg-border/60 mt-1" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-wrap justify-between gap-2">
                      <div>
                        <div className="font-bold tabular-nums text-lg">{formatMoney(p.amount, bill.currency)}</div>
                        <div className="text-sm text-muted-foreground mt-0.5">
                          {formatDateBR(p.payment_date)}
                          {p.payment_method ? ` · ${p.payment_method}` : ""}
                          {p.account_used ? ` · ${p.account_used}` : ""}
                        </div>
                        {p.notes && (
                          <p className="text-xs text-muted-foreground mt-2 px-2 py-1 rounded-lg bg-white/[0.03] inline-block">
                            {p.notes}
                          </p>
                        )}
                      </div>
                      <span className="text-[10px] uppercase tracking-wider font-semibold text-success px-2.5 py-1 rounded-full bg-success/10 h-fit">
                        {p.is_full ? "Total" : "Parcial"}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          {source && (
            <section className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Origem</div>
              {source.debtId ? (
                <Link
                  to="/financas/dividas/$debtId"
                  params={{ debtId: source.debtId }}
                  className="flex items-center justify-between group rounded-xl p-3 -mx-1 hover:bg-white/[0.04] transition-colors"
                >
                  <div>
                    <div className="text-xs text-muted-foreground">{source.kind}</div>
                    <div className="font-semibold group-hover:text-primary transition-colors">{source.label}</div>
                  </div>
                  <ChevronRight className="size-4 opacity-40 group-hover:opacity-100" />
                </Link>
              ) : source.recurringId ? (
                <Link
                  to="/financas/contas-recorrentes/$accountId"
                  params={{ accountId: source.recurringId }}
                  className="flex items-center justify-between group rounded-xl p-3 -mx-1 hover:bg-white/[0.04] transition-colors"
                >
                  <div>
                    <div className="text-xs text-muted-foreground">{source.kind}</div>
                    <div className="font-semibold group-hover:text-primary transition-colors">{source.label}</div>
                  </div>
                  <ChevronRight className="size-4 opacity-40 group-hover:opacity-100" />
                </Link>
              ) : null}
              <p className="text-xs text-muted-foreground leading-relaxed">
                Veja o cadastro completo, parcelas e histórico total nesta origem.
              </p>
            </section>
          )}

          <section className="glass-card rounded-2xl p-5 space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <TrendingUp className="size-3.5" /> Resumo financeiro
            </div>
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Ticket médio" value={payments.length ? formatMoney(avgPayment, bill.currency) : "—"} />
              <SummaryRow
                label="Último pagamento"
                value={lastPayment ? formatDateBR(lastPayment.payment_date) : "—"}
              />
              <SummaryRow label="Total de lançamentos" value={String(payments.length)} />
              <SummaryRow
                label="Média por mês"
                value={
                  stats.monthsTotal > 0
                    ? formatMoney(stats.totalExpected / stats.monthsTotal, bill.currency)
                    : "—"
                }
              />
            </dl>
          </section>

          {pendingMonths.length > 1 && (
            <section className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-warning">
                {isInstallmentPlan ? "Parcelas pendentes" : "Meses pendentes"}
              </div>
              <ul className="space-y-2">
                {pendingMonths.slice(0, 4).map((m) => {
                  const rem = Math.max(0, num(m.expected_amount) - num(m.paid_amount));
                  return (
                    <li key={m.id} className="flex items-center justify-between gap-2 text-sm">
                      <Link
                        to="/financas/contas-do-mes/$billId"
                        params={{ billId: m.id }}
                        className="capitalize hover:text-primary transition-colors truncate"
                      >
                        {billMonthLabel(m)}
                      </Link>
                      <span className="tabular-nums font-medium text-warning shrink-0">
                        {formatMoney(rem, m.currency)}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          {bill.notes && (
            <section className="glass-card rounded-2xl p-5">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2">Observações</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{bill.notes}</p>
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function billMonthLabel(rb: Bill) {
  return rb.notes?.trim() || monthLabel(rb.reference_month);
}

function MonthRow({
  rb,
  isCurrent,
  onPayMonth,
}: {
  rb: Bill;
  isCurrent: boolean;
  onPayMonth?: (monthBill: Bill, amount: number) => void;
}) {
  const rbDs = rb.display_status || rb.status;
  const rbPaid = rbDs === "pago";
  const rbTone = statusTone(rbDs);
  const rbRemaining = Math.max(0, num(rb.expected_amount) - num(rb.paid_amount));
  const rbPct =
    num(rb.expected_amount) > 0
      ? Math.min(100, Math.round((num(rb.paid_amount) / num(rb.expected_amount)) * 100))
      : 0;

  return (
    <li className={cn("p-4 md:p-5 transition-colors", isCurrent && "bg-primary/[0.04]")}>
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <Link
          to="/financas/contas-do-mes/$billId"
          params={{ billId: rb.id }}
          className="flex-1 min-w-[180px] group"
        >
          <div className="flex items-center gap-2">
            <span className="font-semibold capitalize group-hover:text-primary transition-colors">
              {billMonthLabel(rb)}
            </span>
            {isCurrent && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-medium">
                visualizando
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Vence {formatDateBR(rb.due_date)} · {labelStatus(rbDs)}
          </div>
          <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden max-w-xs">
            <div
              className={cn("h-full rounded-full transition-all", rbPaid ? "bg-success" : "bg-primary")}
              style={{ width: `${rbPct}%` }}
            />
          </div>
        </Link>

        <div className="text-right shrink-0 min-w-[100px]">
          <div className="font-bold tabular-nums">{formatMoney(rb.expected_amount, rb.currency)}</div>
          <div className={cn("text-[11px] font-medium mt-0.5", rbTone === "success" ? "text-success" : "text-warning")}>
            {rbPaid ? "Quitado" : `Falta ${formatMoney(rbRemaining, rb.currency)}`}
          </div>
        </div>

        {!rbPaid && onPayMonth && (
          <button
            type="button"
            onClick={() => onPayMonth(rb, rbRemaining || num(rb.expected_amount))}
            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground shrink-0"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Check className="size-3" /> Pagar
          </button>
        )}

        <Link
          to="/financas/contas-do-mes/$billId"
          params={{ billId: rb.id }}
          className="p-2 rounded-lg border border-border/60 text-muted-foreground hover:text-foreground shrink-0"
          title="Abrir mês"
        >
          <ChevronRight className="size-4" />
        </Link>
      </div>
    </li>
  );
}

function ProgressRing({ pct, size = "md" }: { pct: number; size?: "md" | "lg" }) {
  const dim = size === "lg" ? "size-32 md:size-36" : "size-24";
  const textSize = size === "lg" ? "text-3xl" : "text-2xl";
  const uid = `ring-${size}-${pct}`;
  return (
    <div className={cn("relative shrink-0", dim)}>
      <svg className="size-full -rotate-90" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="7" className="text-white/5" />
        <circle
          cx="50"
          cy="50"
          r="42"
          fill="none"
          stroke={`url(#${uid})`}
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${pct * 2.64} 264`}
          className="transition-all duration-700"
        />
        <defs>
          <linearGradient id={uid} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="hsl(var(--primary))" />
            <stop offset="100%" stopColor="hsl(142 76% 45%)" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={cn("font-bold tabular-nums", textSize)}>{pct}%</span>
        <span className="text-[9px] uppercase tracking-widest text-muted-foreground">pago</span>
      </div>
    </div>
  );
}

function StatusBadge({ status, tone }: { status: string; tone: string }) {
  return (
    <span
      className={cn(
        "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full",
        tone === "success" && "bg-success/15 text-success",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "primary" && "bg-primary/15 text-primary",
        !["success", "danger", "warning", "primary"].includes(tone) && "bg-white/10 text-muted-foreground",
      )}
    >
      {labelStatus(status)}
    </span>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone,
  className,
}: {
  icon?: typeof Wallet;
  label: string;
  value: string;
  tone?: "success" | "warning";
  className?: string;
}) {
  return (
    <div className={cn("glass-card rounded-2xl p-4 md:p-5", className)}>
      {Icon && <Icon className="size-4 text-muted-foreground mb-2 opacity-50" />}
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-lg md:text-xl font-bold tabular-nums mt-1",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  tone,
  large,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
  large?: boolean;
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-bold tabular-nums mt-1",
          large ? "text-lg md:text-xl" : "text-sm",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </div>
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/30 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-right">{value}</dd>
    </div>
  );
}
