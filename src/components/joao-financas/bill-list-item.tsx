import { Link, type LinkProps } from "@tanstack/react-router";
import { Check, ChevronRight, Eye, MoreHorizontal } from "lucide-react";
import { formatMoney } from "@/lib/joao-financas/format";
import { labelStatus, statusTone } from "@/lib/joao-financas/labels";
import { cn } from "@/lib/utils";

export type BillListItemData = {
  id: string;
  name: string;
  category: string;
  due_date: string;
  expected_amount: number | string;
  paid_amount?: number | string;
  currency?: string;
  display_status?: string;
  status: string;
};

type BillListItemProps = {
  bill: BillListItemData;
  remaining: number;
  paid: boolean;
  partial: boolean;
  variableAmount: boolean;
  dashboardLink: LinkProps;
  detailLink: LinkProps;
  onQuickPay: () => void;
  onAdjustPay: () => void;
  className?: string;
};

function formatDueDate(dueDate: string) {
  return dueDate.split("-").reverse().join("/");
}

function StatusLabel({
  status,
  tone,
  className,
}: {
  status: string;
  tone: ReturnType<typeof statusTone>;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        tone === "success" && "bg-success/15 text-success",
        tone === "danger" && "bg-danger/15 text-danger",
        tone === "warning" && "bg-warning/15 text-warning",
        tone === "primary" && "bg-primary/15 text-primary",
        tone === "muted" && "bg-white/5 text-muted-foreground",
        className,
      )}
    >
      {labelStatus(status)}
    </span>
  );
}

export function BillListItem({
  bill,
  remaining,
  paid,
  partial,
  variableAmount,
  dashboardLink,
  detailLink,
  onQuickPay,
  onAdjustPay,
  className,
}: BillListItemProps) {
  const ds = bill.display_status || bill.status;
  const tone = statusTone(ds);
  const amountLabel =
    variableAmount && !paid
      ? "A combinar"
      : formatMoney(paid ? bill.expected_amount : remaining || bill.expected_amount, bill.currency);

  return (
    <li
      className={cn(
        "transition-colors",
        paid ? "opacity-70" : "hover:bg-white/[0.02]",
        className,
      )}
    >
      {/* Mobile — card empilhado */}
      <div className="md:hidden p-3.5 space-y-3">
        <div className="flex items-start gap-3">
          <Link
            {...dashboardLink}
            className="min-w-0 flex-1 group"
          >
            <p className="font-medium text-sm leading-snug text-foreground group-hover:text-primary transition-colors">
              {bill.name}
            </p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              {bill.category} · Vence {formatDueDate(bill.due_date)}
            </p>
          </Link>
          <div className="shrink-0 text-right">
            <p className="text-base font-bold tabular-nums leading-none">{amountLabel}</p>
            {partial && !paid && (
              <p className="mt-1 text-[10px] text-warning font-medium">
                Falta {formatMoney(remaining, bill.currency)}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          {paid ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <Check className="size-3.5" />
              Pago
            </span>
          ) : (
            <StatusLabel status={ds} tone={tone} />
          )}

          <div className="flex items-center gap-1.5">
            {!paid && (
              <button
                type="button"
                onClick={onQuickPay}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Check className="size-3.5" />
                Paguei
              </button>
            )}
            <Link
              {...detailLink}
              className="inline-flex p-2 rounded-xl border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 transition-colors"
              title="Ver painel e histórico"
            >
              <Eye className="size-4 pointer-events-none" />
            </Link>
            <button
              type="button"
              onClick={onAdjustPay}
              className="p-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] transition-colors"
              title={paid ? "Ver pagamento" : "Pagamento parcial ou ajuste"}
            >
              <MoreHorizontal className="size-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Desktop — linha compacta */}
      <div className="hidden md:flex items-center gap-3 p-4 min-w-0">
        <div className="min-w-0 flex-1 overflow-hidden">
          <div className="flex items-center gap-2 min-w-0">
            <Link
              {...dashboardLink}
              className="font-medium text-sm hover:text-primary transition-colors inline-flex items-center gap-0.5 min-w-0 max-w-full"
            >
              <span className="truncate">{bill.name}</span>
              <ChevronRight className="size-3.5 opacity-40 shrink-0" />
            </Link>
            {paid && (
              <span className="inline-flex items-center gap-0.5 text-[10px] text-success font-medium shrink-0">
                <Check className="size-3" /> Pago
              </span>
            )}
          </div>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {bill.category} · Vence {formatDueDate(bill.due_date)}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <p className="font-semibold tabular-nums text-sm whitespace-nowrap">{amountLabel}</p>
            {!paid && (
              <p
                className={cn(
                  "text-[10px] font-medium whitespace-nowrap",
                  tone === "success" && "text-success",
                  tone === "danger" && "text-danger",
                  tone === "warning" && "text-warning",
                  tone === "primary" && "text-primary",
                )}
              >
                {partial ? `Falta ${formatMoney(remaining, bill.currency)}` : labelStatus(ds)}
              </p>
            )}
          </div>

          {!paid && (
            <button
              type="button"
              onClick={onQuickPay}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground shrink-0"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Check className="size-3.5" />
              Paguei
            </button>
          )}

          <Link
            {...detailLink}
            className="inline-flex p-2 rounded-xl border border-border/60 text-muted-foreground hover:text-primary hover:border-primary/40 shrink-0 transition-colors"
            title="Ver painel e histórico"
          >
            <Eye className="size-4 pointer-events-none" />
          </Link>

          <button
            type="button"
            onClick={onAdjustPay}
            className="p-2 rounded-xl border border-border/60 text-muted-foreground hover:text-foreground hover:bg-white/[0.04] shrink-0"
            title={paid ? "Ver pagamento" : "Pagamento parcial ou ajuste"}
          >
            <MoreHorizontal className="size-4" />
          </button>
        </div>
      </div>
    </li>
  );
}
