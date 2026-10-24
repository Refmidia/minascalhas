import { createFileRoute, Link, Outlet, useMatch, useNavigate } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  archiveDebtFn,
  createDebt,
  deleteDebt,
  listDebts,
  payoffDebtFn,
  rebuildInstallmentsFn,
  type Debt,
} from "@/lib/joao-financas/finance.functions";
import { getDebtDetailFn } from "@/lib/joao-financas/bills.functions";
import type { MonthlyBill } from "@/lib/joao-financas/bills.server";
import { toast } from "sonner";
import { Plus, Loader2, Trash2, CheckCircle2, Archive, ChevronRight, Pencil } from "lucide-react";
import { formatMoney, formatDateBR, debtBalance, num } from "@/lib/joao-financas/format";
import { labelCurrency, labelPriority, labelStatus } from "@/lib/joao-financas/labels";
import { PaymentModal, QuickPayModal, type QuickPayTarget } from "@/components/joao-financas/payment-modal";
import { MoneyDisplay } from "@/components/joao-financas/money-display";
import { DarkSelect, FieldInput, FieldLabel, FormModal } from "@/components/joao-financas/form-modal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financas/_authenticated/dividas")({
  head: () => ({
    meta: [{ title: "Dívidas - João Finanças" }],
  }),
  component: DividasLayout,
});

function DividasLayout() {
  const detail = useMatch({
    from: "/_authenticated/dividas/$debtId",
    shouldThrow: false,
  });
  if (detail) return <Outlet />;
  return <DebtsPage />;
}

function DebtsPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { data, isLoading } = useQuery({
    queryKey: ["debts"],
    queryFn: () => listDebts(),
  });

  const [open, setOpen] = useState(false);
  const [editDebt, setEditDebt] = useState<Debt | null>(null);
  const [payDebt, setPayDebt] = useState<Debt | null>(null);
  const [quickPay, setQuickPay] = useState<QuickPayTarget | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["debts"] });
    qc.invalidateQueries({ queryKey: ["debt-next"] });
    qc.invalidateQueries({ queryKey: ["debt-detail"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
    qc.invalidateQueries({ queryKey: ["dashboard-month"] });
    qc.invalidateQueries({ queryKey: ["month-bills"] });
    qc.invalidateQueries({ queryKey: ["calendar"] });
    qc.invalidateQueries({ queryKey: ["payoff"] });
  };

  const payoff = useMutation({
    mutationFn: (id: string) => payoffDebtFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Dívida quitada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteDebt({ data: { id } }),
    onSuccess: () => {
      toast.success("Removida");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const archive = useMutation({
    mutationFn: (id: string) => archiveDebtFn({ data: { id } }),
    onSuccess: () => {
      toast.success("Arquivada");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const active = (data || []).filter((d) => d.status !== "pago" && !d.archived_at);
  const paid = (data || []).filter((d) => d.status === "pago");
  const brl = active.filter((d) => (d.currency || "BRL") === "BRL");
  const usd = active.filter((d) => (d.currency || "BRL") === "USD");
  const totalBrl = brl.reduce((a, d) => a + debtBalance(d), 0);
  const totalUsd = usd.reduce((a, d) => a + debtBalance(d), 0);

  return (
    <div className="space-y-5 max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Dívidas</h1>
          <p className="text-sm text-muted-foreground">
            Saldos, parcelas e pagamentos — sem misturar contas do dia a dia.
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="size-4" /> Nova dívida
        </button>
      </header>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Summary label="Saldo em Real" value={formatMoney(totalBrl, "BRL")} tone="danger" />
        <Summary label="Saldo em Dólar" value={formatMoney(totalUsd, "USD")} tone="danger" />
        <Summary label="Ativas" value={String(active.length)} />
        <Summary label="Quitadas" value={String(paid.length)} tone="success" />
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground whitespace-nowrap">
          Data do pagamento
        </label>
        <input
          type="date"
          value={payDate}
          onChange={(e) => setPayDate(e.target.value)}
          className="bg-white/[0.03] border border-border rounded-lg px-2 py-1.5 text-sm"
        />
      </div>

      {isLoading && <div className="text-sm text-muted-foreground">Carregando...</div>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Em reais</h2>
        {brl.map((d) => (
          <DebtCard
            key={d.id}
            debt={d}
            onPay={() => setPayDebt(d)}
            onQuickPay={(inst) =>
              setQuickPay({
                title: `${d.creditor}${inst.notes ? ` — ${inst.notes}` : ""}`,
                amount: num(inst.amount),
                currency: d.currency || "BRL",
                installmentId: inst.id,
                debtId: d.id,
              })
            }
            onQuickPayBill={(bill, amount) =>
              setQuickPay({
                title: `${d.creditor} — ${bill.reference_month}`,
                amount,
                currency: d.currency || "BRL",
                monthlyBillId: bill.id,
                debtId: d.id,
              })
            }
            onEdit={() => setEditDebt(d)}
            onDetail={() => navigate({ to: "/financas/dividas/$debtId", params: { debtId: d.id } })}
            onPayoff={() => payoff.mutate(d.id)}
            onArchive={() => archive.mutate(d.id)}
            onDelete={() => {
              if (confirm(`Excluir ${d.creditor}?`)) remove.mutate(d.id);
            }}
          />
        ))}
        {brl.length === 0 && !isLoading && (
          <p className="text-sm text-muted-foreground">Nenhuma dívida ativa em Real.</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Em dólar</h2>
        {usd.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma dívida em Dólar.</p>
        ) : (
          usd.map((d) => (
            <DebtCard
              key={d.id}
              debt={d}
              onPay={() => setPayDebt(d)}
              onQuickPay={(inst) =>
                setQuickPay({
                  title: `${d.creditor}${inst.notes ? ` — ${inst.notes}` : ""}`,
                  amount: num(inst.amount),
                  currency: d.currency || "BRL",
                  installmentId: inst.id,
                  debtId: d.id,
                })
              }
              onQuickPayBill={(bill, amount) =>
                setQuickPay({
                  title: `${d.creditor} — ${bill.reference_month}`,
                  amount,
                  currency: d.currency || "BRL",
                  monthlyBillId: bill.id,
                  debtId: d.id,
                })
              }
              onEdit={() => setEditDebt(d)}
              onDetail={() => navigate({ to: "/financas/dividas/$debtId", params: { debtId: d.id } })}
              onPayoff={() => payoff.mutate(d.id)}
              onArchive={() => archive.mutate(d.id)}
              onDelete={() => {
                if (confirm(`Excluir ${d.creditor}?`)) remove.mutate(d.id);
              }}
            />
          ))
        )}
      </section>

      {paid.length > 0 && (
        <section className="space-y-2">
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Histórico de dívidas quitadas
          </h2>
          {paid.map((d) => (
            <Link
              key={d.id}
              to="/financas/dividas/$debtId"
              params={{ debtId: d.id }}
              className="glass-card rounded-xl p-3 flex justify-between items-center text-sm hover:bg-white/[0.03]"
            >
              <span className="flex items-center gap-2">
                <CheckCircle2 className="size-4 text-success" />
                {d.creditor}
              </span>
              <span className="text-muted-foreground">Quitada</span>
            </Link>
          ))}
        </section>
      )}

      {quickPay && (
        <QuickPayModal
          target={quickPay}
          defaultDate={payDate}
          onClose={() => setQuickPay(null)}
          onSuccess={invalidate}
        />
      )}

      {payDebt && (
        <PaymentModal
          title={payDebt.creditor}
          expectedAmount={
            num(payDebt.installment_amount) > 0
              ? num(payDebt.installment_amount)
              : debtBalance(payDebt)
          }
          currency={payDebt.currency || "BRL"}
          debtId={payDebt.id}
          defaultDate={payDate}
          onClose={() => setPayDebt(null)}
          onSuccess={invalidate}
        />
      )}

      {open && <CreateDebtModal onClose={() => setOpen(false)} onCreated={invalidate} />}
      {editDebt && (
        <EditDebtModal debt={editDebt} onClose={() => setEditDebt(null)} onSaved={invalidate} />
      )}
    </div>
  );
}

function DebtCard({
  debt,
  onPay,
  onQuickPay,
  onQuickPayBill,
  onEdit,
  onDetail,
  onPayoff,
  onArchive,
  onDelete,
}: {
  debt: Debt;
  onPay: () => void;
  onQuickPay: (inst: { id: string; amount: number | string; notes?: string | null }) => void;
  onQuickPayBill?: (bill: MonthlyBill, amount: number) => void;
  onEdit: () => void;
  onDetail: () => void;
  onPayoff: () => void;
  onArchive: () => void;
  onDelete: () => void;
}) {
  const balance = debtBalance(debt);
  const total = num(debt.total_amount);
  const paid = num(debt.paid_amount);
  const pct = total > 0 ? Math.min(100, Math.round((paid / total) * 100)) : 0;

  const { data: detail } = useQuery({
    queryKey: ["debt-next", debt.id],
    queryFn: () => getDebtDetailFn({ data: { debtId: debt.id } }),
    staleTime: 30_000,
  });

  const pending = (detail?.installments || []).filter((i) => i.status !== "pago");
  const pendingBills = (detail?.monthlyBills || []).filter(
    (b) => (b.display_status || b.status) !== "pago",
  );
  const isCard = debt.payment_type === "cartao_credito";
  const thisMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const thisMonthInst =
    pending.find((i) => i.due_date && String(i.due_date).startsWith(thisMonthKey)) || pending[0];
  const thisBill = pendingBills[0];
  const nextMonthInst =
    pending.find((i) => i.id !== thisMonthInst?.id) || (pending.length > 1 ? pending[1] : null);
  const nextBill = pendingBills[1];
  const remainingInstallments = isCard ? pendingBills.length : pending.length;
  const displayInst = isCard ? thisBill : thisMonthInst;
  const displayNext = isCard ? nextBill : nextMonthInst;

  return (
    <div className="glass-card rounded-2xl p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <button onClick={onDetail} className="text-left group">
            <h3 className="font-semibold text-lg group-hover:text-primary transition-colors flex items-center gap-1">
              {debt.creditor}
              <ChevronRight className="size-4 opacity-40 group-hover:opacity-100" />
            </h3>
          </button>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <span>Categoria: <span className="text-foreground">{debt.category || "—"}</span></span>
            <span>Moeda: <span className="text-foreground">{labelCurrency(debt.currency)}</span></span>
            <span>Prioridade: <span className="text-foreground">{labelPriority(debt.priority)}</span></span>
            <span>Status: <span className="text-foreground">{labelStatus(debt.status)}</span></span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo restante</div>
          <MoneyDisplay
            value={balance}
            currency={debt.currency || "BRL"}
            className="text-xl font-bold"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
        <Meta
          label={isCard ? "Fatura" : "Parcela"}
          value={
            isCard && thisBill ? (
              <MoneyDisplay value={thisBill.expected_amount} currency={debt.currency || "BRL"} inline />
            ) : displayInst && "amount" in displayInst ? (
              formatMoney(displayInst.amount, debt.currency || "BRL")
            ) : debt.installment_amount ? (
              formatMoney(debt.installment_amount, debt.currency || "BRL")
            ) : (
              "—"
            )
          }
        />
        <Meta
          label="Vencimento"
          value={
            isCard && thisBill?.due_date
              ? formatDateBR(thisBill.due_date)
              : displayInst && "due_date" in displayInst && displayInst.due_date
                ? formatDateBR(displayInst.due_date)
                : debt.due_date
                  ? formatDateBR(debt.due_date)
                  : "—"
          }
        />
        <Meta label={isCard ? "Faturas restantes" : "Parcelas restantes"} value={String(remainingInstallments)} />
        <Meta label="Progresso" value={`${pct}%`} />
      </div>

      <div className="mt-3 h-1.5 rounded-full bg-white/5 overflow-hidden">
        <div className="h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
      </div>

      {debt.status !== "pago" && (
        <div className="mt-4 space-y-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
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
                className="px-3 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                Pagar fatura ·{" "}
                <MoneyDisplay
                  value={thisBill.expected_amount}
                  currency={debt.currency || "BRL"}
                  inline
                  showConversion={(debt.currency || "BRL") === "USD"}
                />
              </button>
            ) : (
              displayInst &&
              "amount" in displayInst && (
                <button
                  type="button"
                  onClick={() => onQuickPay(displayInst)}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold text-primary-foreground"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {`Pagar este mês · ${formatMoney(displayInst.amount, debt.currency || "BRL")}`}
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
                className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-primary/40 text-foreground hover:bg-primary/10"
              >
                Adiantar próxima · {nextBill.reference_month}
              </button>
            ) : (
              displayNext &&
              "amount" in displayNext && (
                <button
                  type="button"
                  onClick={() => onQuickPay(displayNext)}
                  className="px-3 py-2.5 rounded-xl text-xs font-semibold border border-primary/40 text-foreground hover:bg-primary/10"
                >
                  Adiantar próxima ·{" "}
                  {displayNext.notes ||
                    (displayNext.due_date ? formatDateBR(displayNext.due_date) : "—")}
                </button>
              )
            )}
          </div>
          <div className="flex flex-wrap gap-2">
            <Action onClick={onDetail}>Ver parcelas</Action>
            <Action onClick={onEdit} icon={<Pencil className="size-3.5" />}>
              Editar parcelas
            </Action>
            <Action onClick={onPay}>Pagamento parcial</Action>
            {debt.payment_type !== "cartao_credito" && (
              <Action onClick={onPayoff}>Quitar</Action>
            )}
            <Action onClick={onArchive} icon={<Archive className="size-3.5" />}>
              Arquivar
            </Action>
            <Action onClick={onDelete} danger icon={<Trash2 className="size-3.5" />}>
              Excluir
            </Action>
          </div>
        </div>
      )}
    </div>
  );
}

function CreateDebtModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [form, setForm] = useState({
    creditor: "",
    category: "Parcelado",
    total_amount: "",
    installments: "1",
    installment_amount: "",
    currency: "BRL",
    due_day: "10",
    priority: "media",
    notes: "",
  });

  const total = parseFloat(form.total_amount.replace(",", ".")) || 0;
  const count = Math.max(1, parseInt(form.installments, 10) || 1);
  const autoInstallment = count > 0 && total > 0 ? Math.round((total / count) * 100) / 100 : 0;
  const installmentValue =
    form.installment_amount.trim() !== ""
      ? parseFloat(form.installment_amount.replace(",", ".")) || 0
      : autoInstallment;

  const create = useMutation({
    mutationFn: async () => {
      if (!form.creditor.trim() || total <= 0) throw new Error("Preencha credor e valor total");
      if (count < 1) throw new Error("Informe a quantidade de parcelas");
      const due_day = form.due_day ? parseInt(form.due_day, 10) : 10;
      await createDebt({
        data: {
          creditor: form.creditor.trim(),
          category: form.category,
          total_amount: total,
          currency: form.currency,
          installments_total: count,
          installment_amount: installmentValue > 0 ? installmentValue : autoInstallment,
          due_day,
          priority: form.priority,
          payment_type: count > 1 ? "parcelado" : "pagamento_unico",
          notes: form.notes || null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Dívida e parcelas criadas");
      onCreated();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <FormModal title="Nova dívida" onClose={onClose}>
      <div>
        <FieldLabel>Credor</FieldLabel>
        <FieldInput
          placeholder="Ex: Havan, Imposto de Renda..."
          value={form.creditor}
          onChange={(e) => setForm({ ...form, creditor: e.target.value })}
          autoFocus
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Valor total</FieldLabel>
          <FieldInput
            inputMode="decimal"
            placeholder="0,00"
            value={form.total_amount}
            onChange={(e) => setForm({ ...form, total_amount: e.target.value })}
          />
        </div>
        <div>
          <FieldLabel>Qtd. de parcelas</FieldLabel>
          <FieldInput
            inputMode="numeric"
            placeholder="Ex: 5"
            value={form.installments}
            onChange={(e) => setForm({ ...form, installments: e.target.value })}
          />
        </div>
      </div>
      <div>
        <FieldLabel>Valor de cada parcela</FieldLabel>
        <FieldInput
          inputMode="decimal"
          placeholder={autoInstallment ? String(autoInstallment).replace(".", ",") : "0,00"}
          value={form.installment_amount}
          onChange={(e) => setForm({ ...form, installment_amount: e.target.value })}
        />
        {autoInstallment > 0 && !form.installment_amount && (
          <p className="text-[11px] text-muted-foreground mt-1">
            Calculado: {formatMoney(autoInstallment)} × {count}
          </p>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <FieldLabel>Dia do vencimento</FieldLabel>
          <FieldInput
            inputMode="numeric"
            placeholder="Ex: 10"
            value={form.due_day}
            onChange={(e) => setForm({ ...form, due_day: e.target.value })}
          />
        </div>
        <DarkSelect
          label="Prioridade"
          value={form.priority}
          onChange={(priority) => setForm({ ...form, priority })}
          options={[
            { value: "essencial", label: "Essencial" },
            { value: "alta", label: "Alta" },
            { value: "media", label: "Média" },
            { value: "baixa", label: "Baixa" },
          ]}
        />
      </div>
      <div className="grid grid-cols-2 gap-2">
        <DarkSelect
          label="Moeda"
          value={form.currency}
          onChange={(currency) => setForm({ ...form, currency })}
          options={[
            { value: "BRL", label: "Real" },
            { value: "USD", label: "Dólar" },
          ]}
        />
        <div>
          <FieldLabel>Categoria</FieldLabel>
          <FieldInput
            value={form.category}
            onChange={(e) => setForm({ ...form, category: e.target.value })}
          />
        </div>
      </div>
      <button
        type="button"
        disabled={create.isPending}
        onClick={() => create.mutate()}
        className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {create.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Salvar e gerar parcelas"}
      </button>
    </FormModal>
  );
}

function EditDebtModal({
  debt,
  onClose,
  onSaved,
}: {
  debt: Debt;
  onClose: () => void;
  onSaved: () => void;
}) {
  const remainingDefault = Math.max(
    0,
    Number(debt.installments_total || 0) - Number(debt.installments_paid || 0),
  );
  const [remaining, setRemaining] = useState(String(remainingDefault || 1));
  const [installment, setInstallment] = useState(
    debt.installment_amount ? String(debt.installment_amount) : "",
  );
  const [dueDay, setDueDay] = useState(debt.due_day ? String(debt.due_day) : "10");

  const save = useMutation({
    mutationFn: async () => {
      const rem = parseInt(remaining, 10);
      if (!Number.isFinite(rem) || rem < 0) throw new Error("Informe quantas parcelas ainda faltam");
      const amount = installment.trim()
        ? parseFloat(installment.replace(",", "."))
        : num(debt.installment_amount) || undefined;
      await rebuildInstallmentsFn({
        data: {
          debtId: debt.id,
          remainingInstallments: rem,
          installmentAmount: amount && amount > 0 ? amount : null,
          dueDay: dueDay ? parseInt(dueDay, 10) : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Parcelas atualizadas");
      onSaved();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <FormModal title={`Editar — ${debt.creditor}`} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Informe quantas parcelas ainda faltam pagar. As já pagas são mantidas.
      </p>
      <div>
        <FieldLabel>Parcelas restantes</FieldLabel>
        <FieldInput
          inputMode="numeric"
          value={remaining}
          onChange={(e) => setRemaining(e.target.value)}
          autoFocus
        />
      </div>
      <div>
        <FieldLabel>Valor de cada parcela</FieldLabel>
        <FieldInput
          inputMode="decimal"
          placeholder="Opcional"
          value={installment}
          onChange={(e) => setInstallment(e.target.value)}
        />
      </div>
      <div>
        <FieldLabel>Dia do vencimento</FieldLabel>
        <FieldInput
          inputMode="numeric"
          value={dueDay}
          onChange={(e) => setDueDay(e.target.value)}
        />
      </div>
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Salvar parcelas"}
      </button>
    </FormModal>
  );
}

function Summary({ label, value, tone }: { label: string; value: string; tone?: "danger" | "success" }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className={cn("text-lg font-bold mt-1", tone === "danger" && "text-danger", tone === "success" && "text-success")}>
        {value}
      </div>
    </div>
  );
}

function Meta({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}

function Action({
  children,
  onClick,
  danger,
  primary,
  icon,
}: {
  children: React.ReactNode;
  onClick: () => void;
  danger?: boolean;
  primary?: boolean;
  icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border border-border hover:bg-white/[0.05]",
        danger && "text-danger hover:bg-danger/10",
        primary && "border-transparent text-primary-foreground",
      )}
      style={primary ? { background: "var(--gradient-primary)" } : undefined}
    >
      {icon}
      {children}
    </button>
  );
}
