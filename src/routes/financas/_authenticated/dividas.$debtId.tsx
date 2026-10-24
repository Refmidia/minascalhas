import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getDebtDetailFn } from "@/lib/joao-financas/bills.functions";
import { rebuildInstallmentsFn } from "@/lib/joao-financas/finance.functions";
import { debtBalance, num } from "@/lib/joao-financas/format";
import { PaymentModal, QuickPayModal, type QuickPayTarget } from "@/components/joao-financas/payment-modal";
import { DebtDashboardView } from "@/components/joao-financas/debt-dashboard";
import { FieldInput, FieldLabel, FormModal } from "@/components/joao-financas/form-modal";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/financas/_authenticated/dividas/$debtId")({
  head: () => ({
    meta: [{ title: "Detalhe da dívida - João Finanças" }],
  }),
  component: DebtDetailPage,
});

function DebtDetailPage() {
  const { debtId } = Route.useParams();
  const qc = useQueryClient();
  const [editOpen, setEditOpen] = useState(false);
  const [pay, setPay] = useState<{
    title: string;
    expectedAmount: number;
    installmentId?: string;
    debtId?: string;
  } | null>(null);
  const [quickPay, setQuickPay] = useState<QuickPayTarget | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, error } = useQuery({
    queryKey: ["debt-detail", debtId],
    queryFn: () => getDebtDetailFn({ data: { debtId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["debt-detail", debtId] });
    qc.invalidateQueries({ queryKey: ["debts"] });
    qc.invalidateQueries({ queryKey: ["debt-next"] });
    qc.invalidateQueries({ queryKey: ["dashboard-month"] });
    qc.invalidateQueries({ queryKey: ["month-bills"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-6xl animate-pulse">
        <div className="h-4 w-24 bg-white/5 rounded" />
        <div className="h-40 bg-white/5 rounded-3xl" />
        <div className="grid grid-cols-3 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-white/5 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link to="/financas/dividas" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Voltar
        </Link>
        <p className="text-sm text-danger">{(error as Error)?.message || "Dívida não encontrada"}</p>
      </div>
    );
  }

  const { debt, installments, payments, monthlyBills = [] } = data;
  const balance = debtBalance(debt);
  const remainingInst = installments.filter((i) => i.status !== "pago");
  const pendingBills = monthlyBills.filter((b) => (b.display_status || b.status) !== "pago");
  const thisMonthKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const thisMonth =
    remainingInst.find((i) => i.due_date && String(i.due_date).startsWith(thisMonthKey)) ||
    remainingInst[0];
  const nextAhead = remainingInst.find((i) => i.id !== thisMonth?.id);

  const openQuickPay = (inst: { id: string; amount: number | string; notes?: string | null }) => {
    setQuickPay({
      title: `${debt.creditor}${inst.notes ? ` — ${inst.notes}` : ""}`,
      amount: num(inst.amount),
      currency: debt.currency || "BRL",
      installmentId: inst.id,
      debtId,
    });
  };

  const openQuickPayBill = (bill: { id: string; reference_month: string; expected_amount: number | string; paid_amount?: number | string }, amount: number) => {
    setQuickPay({
      title: `${debt.creditor} — ${bill.reference_month}`,
      amount,
      currency: debt.currency || "BRL",
      monthlyBillId: bill.id,
      debtId,
    });
  };

  const openPartialPay = (inst: { id: string; amount: number | string; notes?: string | null; installment_number: number }) => {
    setPay({
      title: `${debt.creditor} — ${inst.notes || `Parcela ${inst.installment_number}`}`,
      expectedAmount: num(inst.amount),
      installmentId: inst.id,
      debtId: debt.id,
    });
  };

  return (
    <>
      <DebtDashboardView
        debt={debt}
        installments={installments}
        payments={payments}
        balance={balance}
        payDate={payDate}
        onPayDateChange={setPayDate}
        onQuickPayInstallment={openQuickPay}
        onPartialPayInstallment={openPartialPay}
        onEditInstallments={() => setEditOpen(true)}
        thisMonth={thisMonth}
        nextAhead={nextAhead}
        monthlyBills={monthlyBills}
        onQuickPayBill={openQuickPayBill}
        backTo={{ to: "/financas/dividas", label: "Dívidas" }}
      />

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
          currency={debt.currency || "BRL"}
          debtId={pay.debtId}
          installmentId={pay.installmentId}
          defaultDate={payDate}
          onClose={() => setPay(null)}
          onSuccess={invalidate}
        />
      )}

      {editOpen && (
        <FormModal title={`Editar parcelas — ${debt.creditor}`} onClose={() => setEditOpen(false)}>
          <EditInstallmentsForm
            debtId={debt.id}
            defaultRemaining={remainingInst.length}
            defaultAmount={num(debt.installment_amount) || (thisMonth ? num(thisMonth.amount) : 0)}
            defaultDueDay={debt.due_day || 10}
            onDone={() => {
              setEditOpen(false);
              invalidate();
            }}
          />
        </FormModal>
      )}
    </>
  );
}

function EditInstallmentsForm({
  debtId,
  defaultRemaining,
  defaultAmount,
  defaultDueDay,
  onDone,
}: {
  debtId: string;
  defaultRemaining: number;
  defaultAmount: number;
  defaultDueDay: number;
  onDone: () => void;
}) {
  const [remaining, setRemaining] = useState(String(defaultRemaining));
  const [amount, setAmount] = useState(defaultAmount ? String(defaultAmount) : "");
  const [dueDay, setDueDay] = useState(String(defaultDueDay));

  const save = useMutation({
    mutationFn: async () => {
      const rem = parseInt(remaining, 10);
      if (!Number.isFinite(rem) || rem < 0) throw new Error("Informe as parcelas restantes");
      const val = amount.trim() ? parseFloat(amount.replace(",", ".")) : null;
      await rebuildInstallmentsFn({
        data: {
          debtId,
          remainingInstallments: rem,
          installmentAmount: val && val > 0 ? val : null,
          dueDay: dueDay ? parseInt(dueDay, 10) : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Parcelas atualizadas");
      onDone();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        Quantas parcelas ainda faltam? As já pagas permanecem.
      </p>
      <div>
        <FieldLabel>Parcelas restantes</FieldLabel>
        <FieldInput value={remaining} onChange={(e) => setRemaining(e.target.value)} inputMode="numeric" />
      </div>
      <div>
        <FieldLabel>Valor de cada parcela</FieldLabel>
        <FieldInput value={amount} onChange={(e) => setAmount(e.target.value)} inputMode="decimal" />
      </div>
      <div>
        <FieldLabel>Dia do vencimento</FieldLabel>
        <FieldInput value={dueDay} onChange={(e) => setDueDay(e.target.value)} inputMode="numeric" />
      </div>
      <button
        type="button"
        disabled={save.isPending}
        onClick={() => save.mutate()}
        className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        {save.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Salvar"}
      </button>
    </div>
  );
}
