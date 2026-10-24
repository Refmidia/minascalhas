import { Link } from "@tanstack/react-router";
import { formatMoney, formatDateBR, num } from "@/lib/joao-financas/format";
import { labelCurrency, labelPriority, labelStatus, statusTone, monthLabel } from "@/lib/joao-financas/labels";
import type { Debt, DebtInstallment } from "@/lib/joao-financas/finance.types";
import type { PaymentRow, MonthlyBill } from "@/lib/joao-financas/bills.server";
import { MoneyDisplay, ExchangeRateHint } from "@/components/joao-financas/money-display";
import {
  ArrowLeft,
  Calendar,
  Check,
  CircleCheck,
  Clock,
  FileText,
  History,
  MoreHorizontal,
  Pencil,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";

type Installment = Pick<
  DebtInstallment,
  "id" | "installment_number" | "amount" | "due_date" | "paid_at" | "status" | "notes"
>;

export function DebtDashboardView({
  debt,
  installments,
  payments,
  balance,
  payDate,
  onPayDateChange,
  onQuickPayInstallment,
  onPartialPayInstallment,
  onEditInstallments,
  thisMonth,
  nextAhead,
  monthlyBills = [],
  onQuickPayBill,
  backTo,
}: {
  debt: Debt;
  installments: Installment[];
  payments: PaymentRow[];
  balance: number;
  payDate: string;
  onPayDateChange: (v: string) => void;
  onQuickPayInstallment: (inst: Installment) => void;
  onPartialPayInstallment: (inst: Installment) => void;
  onEditInstallments: () => void;
  thisMonth: Installment | undefined;
  nextAhead: Installment | undefined;
  monthlyBills?: MonthlyBill[];
  onQuickPayBill?: (bill: MonthlyBill, amount: number) => void;
  backTo: { to: "/financas/dividas"; label: string };
}) {
  const currency = debt.currency || "BRL";
  const isCard = debt.payment_type === "cartao_credito";
  const pendingBills = monthlyBills.filter((b) => (b.display_status || b.status) !== "pago");
  const thisBill = pendingBills[0];
  const nextBill = pendingBills[1];
  const paidInst = installments.filter((i) => i.status === "pago");
  const remainingInst = installments.filter((i) => i.status !== "pago");
  const paidBills = monthlyBills.filter((b) => (b.display_status || b.status) === "pago");
  const paidCount = isCard ? paidBills.length : paidInst.length;
  const totalCount = isCard ? monthlyBills.length : installments.length;
  const remainingCount = isCard ? pendingBills.length : remainingInst.length;
  const progressPct = totalCount > 0 ? Math.round((paidCount / totalCount) * 100) : 0;
  const totalOriginal = num(debt.original_amount ?? debt.total_amount);
  const totalPaid = num(debt.paid_amount);
  const tone = statusTone(debt.status);
  const attachments = payments.filter((p) => p.attachment_url);
  const lastPayment = payments[0];
  const avgPayment =
    payments.length > 0 ? payments.reduce((a, p) => a + num(p.amount), 0) / payments.length : 0;
  const isFullyPaid = debt.status === "pago" || balance <= 0;

  return (
    <div className="space-y-6 max-w-6xl pb-12">
      <Link
        to={backTo.to}
        className="text-sm text-muted-foreground inline-flex items-center gap-1.5 hover:text-foreground transition-colors"
      >
        <ArrowLeft className="size-4" /> {backTo.label}
      </Link>

      {/* Hero */}
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
                  Painel da dívida
                </span>
                <StatusBadge status={debt.status} tone={tone} />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  Prioridade {labelPriority(debt.priority)}
                </span>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                  {labelCurrency(currency)}
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-bold tracking-tight leading-tight">{debt.creditor}</h1>
              {debt.category && (
                <p className="text-sm text-muted-foreground">{debt.category}</p>
              )}

              <div className="pt-2 max-w-xl">
                <div className="flex justify-between text-xs mb-1.5">
                  <span className="text-muted-foreground">Quitação geral</span>
                  <span className="font-medium tabular-nums">
                    {formatMoney(totalPaid, currency)} de {formatMoney(totalOriginal, currency)}
                  </span>
                </div>
                <div className="h-3 rounded-full bg-white/5 overflow-hidden flex">
                  <div
                    className="h-full bg-success transition-all duration-700"
                    style={{ width: `${progressPct}%` }}
                  />
                  <div
                    className="h-full bg-warning/30 transition-all duration-700"
                    style={{ width: `${100 - progressPct}%` }}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center gap-6 shrink-0">
              <ProgressRing pct={progressPct} />
              <div className="hidden sm:block space-y-3 min-w-[150px]">
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo restante</div>
                  <MoneyDisplay
                    value={balance}
                    currency={currency}
                    className={cn("text-xl font-bold", balance > 0 ? "text-warning" : "text-success")}
                  />
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    {isCard ? "Faturas quitadas" : "Parcelas quitadas"}
                  </div>
                  <div className="text-xl font-bold tabular-nums text-success">
                    {paidCount}
                    <span className="text-muted-foreground text-base font-normal">/{totalCount || "—"}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* KPIs */}
      <section className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <StatCard icon={Wallet} label="Valor original" value={formatMoney(totalOriginal, currency)} />
        <StatCard icon={Check} label="Total pago" value={formatMoney(totalPaid, currency)} tone="success" />
        <StatCard
          icon={Clock}
          label="Saldo restante"
          value={formatMoney(balance, currency)}
          tone={balance > 0 ? "warning" : "success"}
        />
        <StatCard icon={CircleCheck} label={isCard ? "Faturas pagas" : "Parcelas pagas"} value={String(paidCount)} tone="success" />
        <StatCard label={isCard ? "Faturas restantes" : "Parcelas restantes"} value={String(remainingCount)} tone={remainingCount ? "warning" : "success"} />
        <StatCard
          icon={Calendar}
          label="Próximo venc."
          value={
            isCard
              ? thisBill?.due_date
                ? formatDateBR(thisBill.due_date)
                : "—"
              : thisMonth?.due_date
                ? formatDateBR(thisMonth.due_date)
                : "—"
          }
          className="col-span-2 lg:col-span-1"
        />
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          {/* Ações de pagamento */}
          {!isFullyPaid && (isCard ? thisBill && onQuickPayBill : thisMonth) && (
            <section className="glass-card rounded-2xl p-5 md:p-6 space-y-4">
              <div>
                <h2 className="font-semibold text-base">Registrar pagamento</h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {isCard ? "Pague a fatura do mês ou adiante a próxima" : "Pague a parcela do mês ou adiante a próxima"}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <label className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
                  Data do pagamento
                </label>
                <input
                  type="date"
                  value={payDate}
                  onChange={(e) => onPayDateChange(e.target.value)}
                  className="flex-1 min-w-[160px] bg-white/[0.03] border border-border rounded-xl px-3 py-2.5 text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {isCard && thisBill && onQuickPayBill ? (
                  <button
                    type="button"
                    onClick={() =>
                      onQuickPayBill(
                        thisBill,
                        Math.max(0, num(thisBill.expected_amount) - num(thisBill.paid_amount)) ||
                          num(thisBill.expected_amount),
                      )
                    }
                    className="text-left px-4 py-4 rounded-xl text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <Check className="size-4" /> Pagar fatura
                    </span>
                    <span className="block text-xs font-normal opacity-90 mt-1.5">
                      {monthLabel(thisBill.reference_month)} ·{" "}
                      <MoneyDisplay
                        value={
                          Math.max(0, num(thisBill.expected_amount) - num(thisBill.paid_amount)) ||
                          num(thisBill.expected_amount)
                        }
                        currency={currency}
                        inline
                      />
                    </span>
                  </button>
                ) : (
                  thisMonth && (
                    <button
                      type="button"
                      onClick={() => onQuickPayInstallment(thisMonth)}
                      className="text-left px-4 py-4 rounded-xl text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-95"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <Check className="size-4" /> Pagar este mês
                      </span>
                      <span className="block text-xs font-normal opacity-90 mt-1.5">
                        {instLabel(thisMonth)} · {formatMoney(thisMonth.amount, currency)}
                      </span>
                    </button>
                  )
                )}
                {isCard && nextBill && onQuickPayBill ? (
                  <button
                    type="button"
                    onClick={() =>
                      onQuickPayBill(
                        nextBill,
                        Math.max(0, num(nextBill.expected_amount) - num(nextBill.paid_amount)) ||
                          num(nextBill.expected_amount),
                      )
                    }
                    className="text-left px-4 py-4 rounded-xl text-sm font-semibold border border-primary/40 hover:bg-primary/10 transition-colors"
                  >
                    <span className="inline-flex items-center gap-1.5">
                      <TrendingUp className="size-4" /> Adiantar próxima fatura
                    </span>
                    <span className="block text-xs font-normal text-muted-foreground mt-1.5">
                      {monthLabel(nextBill.reference_month)} ·{" "}
                      <MoneyDisplay
                        value={num(nextBill.expected_amount)}
                        currency={currency}
                        inline
                      />
                    </span>
                  </button>
                ) : (
                  nextAhead && (
                    <button
                      type="button"
                      onClick={() => onQuickPayInstallment(nextAhead)}
                      className="text-left px-4 py-4 rounded-xl text-sm font-semibold border border-primary/40 hover:bg-primary/10 transition-colors"
                    >
                      <span className="inline-flex items-center gap-1.5">
                        <TrendingUp className="size-4" /> Adiantar próxima parcela
                      </span>
                      <span className="block text-xs font-normal text-muted-foreground mt-1.5">
                        {instLabel(nextAhead)} · {formatMoney(nextAhead.amount, currency)}
                      </span>
                    </button>
                  )
                )}
              </div>
            </section>
          )}

          {isFullyPaid && (
            <div className="flex items-center gap-2 text-sm text-success px-5 py-4 rounded-2xl bg-success/10 border border-success/20">
              <Check className="size-4 shrink-0" />
              Dívida quitada — nenhuma parcela pendente
            </div>
          )}

          {/* Parcelas */}
          <section className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground inline-flex items-center gap-2">
                <History className="size-4" />
                Parcelas
              </h2>
              <div className="flex items-center gap-2">
                {remainingInst.length > 0 && (
                  <span className="text-xs text-warning">{remainingInst.length} pendente(s)</span>
                )}
                <button
                  type="button"
                  onClick={onEditInstallments}
                  className="inline-flex items-center gap-1 text-xs px-2.5 py-1 rounded-lg border border-border hover:bg-white/[0.04]"
                >
                  <Pencil className="size-3" /> Editar
                </button>
              </div>
            </div>

            {installments.length === 0 && isCard && monthlyBills.length > 0 ? (
              <ul className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                {monthlyBills.map((bill) => {
                  const billDs = bill.display_status || bill.status;
                  const billPaid = billDs === "pago";
                  const billTone = statusTone(billPaid ? "pago" : billDs === "atrasado" ? "atrasado" : "pendente");
                  const billRemaining = Math.max(0, num(bill.expected_amount) - num(bill.paid_amount));
                  return (
                    <li key={bill.id} className={cn("p-4 md:p-5", billDs === "atrasado" && "bg-danger/[0.04]")}>
                      <div className="flex flex-wrap items-center gap-3 md:gap-4">
                        <div className="flex-1 min-w-[180px]">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold capitalize">{monthLabel(bill.reference_month)}</span>
                            <span
                              className={cn(
                                "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full",
                                billTone === "success" && "bg-success/15 text-success",
                                billTone === "danger" && "bg-danger/15 text-danger",
                                billTone === "warning" && "bg-warning/15 text-warning",
                              )}
                            >
                              {labelStatus(billDs)}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground mt-0.5">
                            Vence {formatDateBR(bill.due_date)}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <MoneyDisplay value={bill.expected_amount} currency={currency} className="font-bold" />
                        </div>
                        {!billPaid && onQuickPayBill && (
                          <button
                            type="button"
                            onClick={() => onQuickPayBill(bill, billRemaining || num(bill.expected_amount))}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground shrink-0"
                            style={{ background: "var(--gradient-primary)" }}
                          >
                            <Check className="size-3" /> Pagar
                          </button>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            ) : installments.length === 0 ? (
              <div className="glass-card rounded-2xl p-8 text-center">
                <Receipt className="size-8 mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm text-muted-foreground">Sem parcelas cadastradas.</p>
                <button
                  type="button"
                  onClick={onEditInstallments}
                  className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Pencil className="size-3.5" /> Gerar parcelas
                </button>
              </div>
            ) : (
              <ul className="rounded-2xl border border-border/60 overflow-hidden divide-y divide-border/60">
                {installments.map((inst) => (
                  <InstallmentRow
                    key={inst.id}
                    inst={inst}
                    currency={currency}
                    onQuickPay={() => onQuickPayInstallment(inst)}
                    onPartialPay={() => onPartialPayInstallment(inst)}
                  />
                ))}
              </ul>
            )}
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
              </div>
            ) : (
              <ul className="space-y-2">
                {payments.map((p, i) => {
                  const inst = installments.find((x) => x.id === p.installment_id);
                  return (
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
                          <div className="font-bold tabular-nums text-lg">{formatMoney(p.amount, currency)}</div>
                          <div className="text-sm text-muted-foreground mt-0.5">
                            {formatDateBR(p.payment_date)}
                            {inst ? ` · ${instLabel(inst)}` : ""}
                            {p.payment_method ? ` · ${p.payment_method}` : ""}
                          </div>
                          {p.notes && (
                            <p className="text-xs text-muted-foreground mt-2 px-2 py-1 rounded-lg bg-white/[0.03] inline-block">
                              {p.notes}
                            </p>
                          )}
                          {p.attachment_url && (
                            <a
                              href={p.attachment_url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary underline mt-2 inline-block"
                            >
                              Ver comprovante
                            </a>
                          )}
                        </div>
                        <span className="text-[10px] uppercase tracking-wider font-semibold text-success px-2.5 py-1 rounded-full bg-success/10 h-fit">
                          {p.is_full ? "Total" : "Parcial"}
                        </span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 xl:sticky xl:top-4 xl:self-start">
          <section className="glass-card rounded-2xl p-5 space-y-4">
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
              <TrendingUp className="size-3.5" /> Resumo financeiro
            </div>
            <dl className="space-y-3 text-sm">
              <SummaryRow label="Ticket médio" value={payments.length ? formatMoney(avgPayment, currency) : "—"} />
              <SummaryRow
                label="Último pagamento"
                value={lastPayment ? formatDateBR(lastPayment.payment_date) : "—"}
              />
              <SummaryRow label="Total de lançamentos" value={String(payments.length)} />
              <SummaryRow
                label="Valor por parcela"
                value={
                  debt.installment_amount
                    ? formatMoney(debt.installment_amount, currency)
                    : thisMonth
                      ? formatMoney(thisMonth.amount, currency)
                      : "—"
                }
              />
              {debt.due_day && (
                <SummaryRow label="Dia de vencimento" value={`Dia ${debt.due_day}`} />
              )}
            </dl>
          </section>

          {remainingInst.length > 0 && (
            <section className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-warning">Próximas parcelas</div>
              <ul className="space-y-2">
                {remainingInst.slice(0, 5).map((inst) => (
                  <li key={inst.id} className="flex items-center justify-between gap-2 text-sm">
                    <span className="truncate text-muted-foreground">{instLabel(inst)}</span>
                    <span className="tabular-nums font-medium text-warning shrink-0">
                      {formatMoney(inst.amount, currency)}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {attachments.length > 0 && (
            <section className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground inline-flex items-center gap-1.5">
                <FileText className="size-3.5" /> Comprovantes ({attachments.length})
              </div>
              <ul className="space-y-2">
                {attachments.slice(0, 4).map((p) => (
                  <li key={p.id}>
                    <a
                      href={p.attachment_url!}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-primary hover:underline flex justify-between gap-2"
                    >
                      <span>{formatDateBR(p.payment_date)}</span>
                      <span className="tabular-nums">{formatMoney(p.amount, currency)}</span>
                    </a>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {currency === "USD" && (
            <section className="glass-card rounded-2xl p-5">
              <ExchangeRateHint />
            </section>
          )}

          {(debt.notes || debt.contracted_at) && (
            <section className="glass-card rounded-2xl p-5 space-y-3">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Observações</div>
              {debt.contracted_at && (
                <p className="text-xs text-muted-foreground">
                  Contratada em {formatDateBR(debt.contracted_at)}
                </p>
              )}
              {debt.notes && (
                <p className="text-sm text-muted-foreground leading-relaxed">{debt.notes}</p>
              )}
            </section>
          )}
        </aside>
      </div>
    </div>
  );
}

function instLabel(inst: Installment) {
  return inst.notes || `Parcela ${inst.installment_number}`;
}

function InstallmentRow({
  inst,
  currency,
  onQuickPay,
  onPartialPay,
}: {
  inst: Installment;
  currency: string;
  onQuickPay: () => void;
  onPartialPay: () => void;
}) {
  const paid = inst.status === "pago";
  const tone = statusTone(paid ? "pago" : "pendente");

  return (
    <li className={cn("p-4 md:p-5", paid && "opacity-90")}>
      <div className="flex flex-wrap items-center gap-3 md:gap-4">
        <div className="flex-1 min-w-[180px]">
          <div className="flex items-center gap-2">
            <span className={cn("font-semibold", paid && "text-muted-foreground")}>{instLabel(inst)}</span>
            <span
              className={cn(
                "text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full",
                tone === "success" ? "bg-success/15 text-success" : "bg-warning/15 text-warning",
              )}
            >
              {labelStatus(paid ? "pago" : "pendente")}
            </span>
          </div>
          <div className="text-xs text-muted-foreground mt-0.5">
            Vencimento: {inst.due_date ? formatDateBR(inst.due_date) : "—"}
            {inst.paid_at ? ` · Pago em ${formatDateBR(inst.paid_at)}` : ""}
          </div>
          {!paid && (
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden max-w-xs">
              <div className="h-full rounded-full bg-primary w-0" />
            </div>
          )}
          {paid && (
            <div className="mt-2 h-1.5 rounded-full bg-white/5 overflow-hidden max-w-xs">
              <div className="h-full rounded-full bg-success w-full" />
            </div>
          )}
        </div>

        <div className="text-right shrink-0 min-w-[90px]">
          <div className="font-bold tabular-nums">{formatMoney(inst.amount, currency)}</div>
        </div>

        {!paid && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onQuickPay}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground"
              style={{ background: "var(--gradient-primary)" }}
            >
              <Check className="size-3" /> Pagar
            </button>
            <button
              type="button"
              onClick={onPartialPay}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs border border-border text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
            >
              <MoreHorizontal className="size-3" />
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

function ProgressRing({ pct }: { pct: number }) {
  const uid = `debt-ring-${pct}`;
  return (
    <div className="relative shrink-0 size-32 md:size-36">
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
        <span className="font-bold tabular-nums text-3xl">{pct}%</span>
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

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3 border-b border-border/30 pb-2 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="font-semibold tabular-nums text-right">{value}</dd>
    </div>
  );
}
