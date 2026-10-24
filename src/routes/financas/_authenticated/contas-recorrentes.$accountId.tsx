import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getRecurringDetailFn } from "@/lib/joao-financas/bills.functions";
import { formatMoney, formatDateBR, num } from "@/lib/joao-financas/format";
import { labelPriority, labelStatus, monthLabel, statusTone } from "@/lib/joao-financas/labels";
import { ArrowLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financas/_authenticated/contas-recorrentes/$accountId")({
  head: () => ({
    meta: [{ title: "Conta recorrente - João Finanças" }],
  }),
  component: RecurringDetailPage,
});

function RecurringDetailPage() {
  const { accountId } = Route.useParams();

  const { data, isLoading, error } = useQuery({
    queryKey: ["recurring-detail", accountId],
    queryFn: () => getRecurringDetailFn({ data: { accountId } }),
  });

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando...</p>;
  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link to="/financas/contas-recorrentes" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Contas recorrentes
        </Link>
        <p className="text-sm text-danger">{(error as Error)?.message || "Conta não encontrada"}</p>
      </div>
    );
  }

  const { account, bills, payments, stats } = data;

  return (
    <div className="space-y-5 max-w-3xl">
      <Link
        to="/financas/contas-recorrentes"
        className="text-sm text-muted-foreground inline-flex items-center gap-1 hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Contas recorrentes
      </Link>

      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Conta recorrente</p>
          <h1 className="text-2xl font-bold tracking-tight mt-1">{account.name}</h1>
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>
              Categoria: <span className="text-foreground">{account.category}</span>
            </span>
            <span>
              Frequência: <span className="text-foreground capitalize">{account.frequency}</span>
            </span>
            <span>
              Vencimento: <span className="text-foreground">dia {account.due_day ?? "—"}</span>
            </span>
            <span>
              Prioridade: <span className="text-foreground">{labelPriority(account.priority)}</span>
            </span>
            <span>
              Status: <span className="text-foreground">{labelStatus(account.status)}</span>
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Valor mensal</div>
          <div className="text-2xl font-bold tabular-nums">{formatMoney(account.amount, account.currency)}</div>
        </div>
      </header>

      {account.notes && (
        <section className="glass-card rounded-xl p-4 text-sm">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">Observações</div>
          <p>{account.notes}</p>
        </section>
      )}

      <section className="glass-card rounded-2xl p-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
        <Meta label="Meses registrados" value={String(stats.billCount)} />
        <Meta label="Meses pagos" value={String(stats.paidCount)} tone="success" />
        <Meta label="Total pago" value={formatMoney(stats.totalPaid, account.currency)} tone="success" />
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Contas por mês
        </h2>
        {bills.length === 0 ? (
          <p className="text-sm text-muted-foreground glass-card rounded-xl p-4">
            Ainda não há lançamentos mensais. Gere as contas do mês em Contas do mês.
          </p>
        ) : (
          <ul className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
            {bills.map((b) => {
              const ds = b.display_status || b.status;
              const tone = statusTone(ds);
              const remaining = Math.max(0, num(b.expected_amount) - num(b.paid_amount));
              return (
                <li key={b.id}>
                  <Link
                    to="/financas/contas-do-mes/$billId"
                    params={{ billId: b.id }}
                    className="p-4 flex flex-wrap items-center gap-3 hover:bg-white/[0.02] block"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium capitalize">{monthLabel(b.reference_month)}</div>
                      <div className="text-xs text-muted-foreground mt-0.5">
                        Vence {formatDateBR(b.due_date)} · {labelStatus(ds)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold tabular-nums text-sm">
                        {formatMoney(remaining || b.expected_amount, b.currency)}
                      </div>
                      <span
                        className={cn(
                          "text-[10px]",
                          tone === "success" && "text-success",
                          tone === "danger" && "text-danger",
                          tone === "warning" && "text-warning",
                        )}
                      >
                        {ds === "pago" ? "Pago" : `Falta ${formatMoney(remaining, b.currency)}`}
                      </span>
                    </div>
                    <ChevronRight className="size-4 text-muted-foreground shrink-0" />
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Histórico de pagamentos
        </h2>
        {payments.length === 0 ? (
          <p className="text-sm text-muted-foreground glass-card rounded-xl p-4">Nenhum pagamento ainda.</p>
        ) : (
          <ul className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
            {payments.map((p) => (
              <li key={p.id} className="p-4 text-sm">
                <div className="font-semibold tabular-nums">{formatMoney(p.amount, account.currency)}</div>
                <div className="text-xs text-muted-foreground mt-0.5">
                  {formatDateBR(p.payment_date)}
                  {p.payment_method ? ` · ${p.payment_method}` : ""}
                </div>
                {p.notes && <p className="text-xs text-muted-foreground mt-1">{p.notes}</p>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Meta({
  label,
  value,
  tone,
}: {
  label: string;
  value: string;
  tone?: "success" | "warning";
}) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div
        className={cn(
          "font-semibold tabular-nums mt-0.5",
          tone === "success" && "text-success",
          tone === "warning" && "text-warning",
        )}
      >
        {value}
      </div>
    </div>
  );
}
