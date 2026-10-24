import { createFileRoute, Outlet, useMatch } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getMonthBills } from "@/lib/joao-financas/bills.functions";
import { formatMoney, num } from "@/lib/joao-financas/format";
import {
  labelGroup,
  monthLabel,
  shiftMonth,
} from "@/lib/joao-financas/labels";
import { PaymentModal, QuickPayModal, type QuickPayTarget } from "@/components/joao-financas/payment-modal";
import { BillListItem } from "@/components/joao-financas/bill-list-item";
import { cn } from "@/lib/utils";
import { Check, ChevronLeft, ChevronRight } from "lucide-react";
import { billDashboardLink } from "@/lib/joao-financas/bill-links";

export const Route = createFileRoute("/financas/_authenticated/contas-do-mes")({
  head: () => ({
    meta: [{ title: "Contas do mês - João Finanças" }],
  }),
  component: ContasDoMesLayout,
});

function ContasDoMesLayout() {
  const detail = useMatch({
    from: "/_authenticated/contas-do-mes/$billId",
    shouldThrow: false,
  });
  if (detail) return <Outlet />;
  return <ContasDoMesPage />;
}

const filters = [
  { id: "pendentes", label: "Pendentes" },
  { id: "atrasadas", label: "Atrasadas" },
  { id: "todas", label: "Todas" },
  { id: "pagas", label: "Pagas" },
  { id: "essenciais", label: "Essenciais" },
  { id: "trabalho", label: "Trabalho" },
  { id: "parcelas", label: "Parcelas" },
  { id: "dividas", label: "Dívidas" },
] as const;

const groupOrder = ["essenciais", "trabalho", "dividas", "variaveis", "outros"];

type PayTarget = {
  title: string;
  expectedAmount: number;
  currency?: string;
  monthlyBillId: string;
};

function ContasDoMesPage() {
  const qc = useQueryClient();
  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [month, setMonth] = useState(nowKey);
  const [filter, setFilter] = useState<string>("pendentes");
  const [pay, setPay] = useState<PayTarget | null>(null);
  const [quickPay, setQuickPay] = useState<QuickPayTarget | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading } = useQuery({
    queryKey: ["month-bills", month, filter],
    queryFn: () => getMonthBills({ data: { referenceMonth: month, filter } }),
  });

  const grouped = useMemo(() => {
    const map = new Map<string, NonNullable<typeof data>["bills"]>();
    for (const b of data?.bills || []) {
      const key = b.group_key || "outros";
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(b);
    }
    return groupOrder
      .filter((g) => map.has(g))
      .map((g) => ({ key: g, bills: map.get(g)! }));
  }, [data]);

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["month-bills"] });
    qc.invalidateQueries({ queryKey: ["dashboard-month"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
    qc.invalidateQueries({ queryKey: ["debts"] });
  };

  const summary = data?.summary;
  const progressPct = summary
    ? summary.count > 0
      ? Math.round((summary.paidCount / summary.count) * 100)
      : 0
    : 0;

  return (
    <div className="space-y-4 max-w-5xl pb-8">
      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl font-bold tracking-tight">Contas do mês</h1>
            <p className="text-sm text-muted-foreground capitalize">{monthLabel(month)}</p>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            <button
              className="p-2 rounded-lg border border-border hover:bg-white/[0.04]"
              onClick={() => setMonth(shiftMonth(month, -1))}
              aria-label="Mês anterior"
            >
              <ChevronLeft className="size-4" />
            </button>
            <button
              className="px-2.5 py-1.5 text-xs rounded-lg border border-border hover:bg-white/[0.04] whitespace-nowrap"
              onClick={() => setMonth(nowKey)}
            >
              Hoje
            </button>
            <button
              className="p-2 rounded-lg border border-border hover:bg-white/[0.04]"
              onClick={() => setMonth(shiftMonth(month, 1))}
              aria-label="Próximo mês"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>
        </div>
        <input
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
          className="w-full md:w-auto bg-white/[0.03] border border-border rounded-xl px-3 py-2 text-sm"
        />
      </header>

      {/* Barra de progresso — foco em eliminar contas */}
      {summary && summary.count > 0 && (
        <section
          className="rounded-2xl p-4 border border-border/60"
          style={{ background: "var(--surface-elevated)" }}
        >
          <div className="flex flex-wrap items-end justify-between gap-3 mb-3">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Eliminar contas do mês
              </p>
              <p className="text-lg font-bold mt-0.5">
                Faltam{" "}
                <span className="text-warning">{summary.pendingCount}</span>{" "}
                {summary.pendingCount === 1 ? "conta" : "contas"} ·{" "}
                <span className="tabular-nums">{formatMoney(summary.totalPending)}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold tabular-nums text-success">{progressPct}%</p>
              <p className="text-[10px] text-muted-foreground">
                {summary.paidCount}/{summary.count} pagas
              </p>
            </div>
          </div>
          <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, background: "var(--gradient-primary)" }}
            />
          </div>
        </section>
      )}

      {summary && (
        <section className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Stat label="Total do mês" value={formatMoney(summary.totalExpected)} />
          <Stat label="Total pago" value={formatMoney(summary.totalPaid)} tone="success" />
          <Stat label="Pendente" value={formatMoney(summary.totalPending)} tone="warning" />
          <Stat label="Contas pagas" value={`${summary.paidCount} de ${summary.count}`} tone="success" />
        </section>
      )}

      <div className="space-y-3">
        <div className="-mx-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          <div className="flex w-max gap-1.5 px-1 pb-0.5">
            {filters.map((f) => (
              <button
                key={f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "px-3 py-2 rounded-full text-xs border transition-all whitespace-nowrap shrink-0",
                  filter === f.id
                    ? "border-primary bg-primary/15 text-foreground font-medium shadow-sm"
                    : "border-border text-muted-foreground hover:bg-white/[0.04]",
                )}
              >
                {f.label}
                {f.id === "pendentes" && summary && summary.pendingCount > 0 && (
                  <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-warning/20 text-warning text-[10px]">
                    {summary.pendingCount}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 rounded-xl border border-border/60 bg-white/[0.02] px-3 py-2.5">
          <span className="text-xs text-muted-foreground">Data do pagamento</span>
          <input
            type="date"
            value={payDate}
            onChange={(e) => setPayDate(e.target.value)}
            className="bg-transparent border-0 p-0 text-sm font-medium text-right focus:outline-none focus:ring-0 [color-scheme:dark]"
          />
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && grouped.length === 0 && (
        <div className="text-center py-12 space-y-2">
          <Check className="size-8 mx-auto text-success opacity-80" />
          <p className="text-sm font-medium">
            {filter === "pendentes" || filter === "atrasadas"
              ? "Tudo pago por aqui!"
              : "Nenhuma conta neste filtro."}
          </p>
          <p className="text-xs text-muted-foreground capitalize">{monthLabel(month)}</p>
        </div>
      )}

      {grouped.map((g) => (
        <section key={g.key} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground px-1">
            {labelGroup(g.key)}
          </h2>
          <ul className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
            {g.bills.map((b) => {
              const ds = b.display_status || b.status;
              const remaining = Math.max(0, num(b.expected_amount) - num(b.paid_amount));
              const paid = ds === "pago";
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
                  className={paid ? undefined : "bg-[var(--surface-elevated)]"}
                />
              );
            })}
          </ul>
        </section>
      ))}

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
          title={pay.title}
          expectedAmount={pay.expectedAmount}
          currency={pay.currency}
          monthlyBillId={pay.monthlyBillId}
          defaultDate={payDate}
          onClose={() => setPay(null)}
          onSuccess={invalidate}
        />
      )}

    </div>
  );
}

function Stat({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div className="glass-card rounded-xl p-3">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "text-base font-bold mt-0.5 tabular-nums",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </div>
    </div>
  );
}
