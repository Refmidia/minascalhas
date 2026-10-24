import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getBillDetailFn } from "@/lib/joao-financas/bills.functions";
import { num } from "@/lib/joao-financas/format";
import { PaymentModal, QuickPayModal, type QuickPayTarget } from "@/components/joao-financas/payment-modal";
import { BillDashboardView } from "@/components/joao-financas/bill-dashboard";
import { ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/financas/_authenticated/contas-do-mes/$billId")({
  validateSearch: (s: Record<string, unknown>) => ({
    from: s.from === "dashboard" ? ("dashboard" as const) : undefined,
  }),
  head: () => ({
    meta: [{ title: "Painel da conta - João Finanças" }],
  }),
  component: BillDetailPage,
});

function BillDetailPage() {
  const { billId } = Route.useParams();
  const { from } = Route.useSearch();
  const qc = useQueryClient();
  const [pay, setPay] = useState<{ title: string; expectedAmount: number; currency?: string } | null>(
    null,
  );
  const [quickPay, setQuickPay] = useState<QuickPayTarget | null>(null);
  const [payDate, setPayDate] = useState(() => new Date().toISOString().slice(0, 10));

  const { data, isLoading, error } = useQuery({
    queryKey: ["bill-detail", billId],
    queryFn: () => getBillDetailFn({ data: { billId } }),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bill-detail", billId] });
    qc.invalidateQueries({ queryKey: ["month-bills"] });
    qc.invalidateQueries({ queryKey: ["dashboard-month"] });
    qc.invalidateQueries({ queryKey: ["finance-overview"] });
    qc.invalidateQueries({ queryKey: ["debts"] });
    qc.invalidateQueries({ queryKey: ["recurring-detail"] });
  };

  if (isLoading) {
    return (
      <div className="space-y-3 max-w-6xl animate-pulse">
        <div className="h-4 w-32 rounded bg-white/5" />
        <div className="h-40 rounded-3xl bg-white/5" />
        <div className="grid grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl bg-white/5" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-3">
        <Link to="/financas/contas-do-mes" className="text-sm text-primary inline-flex items-center gap-1">
          <ArrowLeft className="size-4" /> Contas do mês
        </Link>
        <p className="text-sm text-danger">{(error as Error)?.message || "Conta não encontrada"}</p>
      </div>
    );
  }

  const { bill, payments, source, remaining, relatedBills, stats } = data;

  const openPay = (targetBill: typeof bill, amount: number) => {
    setQuickPay({
      title: targetBill.name,
      amount,
      currency: targetBill.currency,
      monthlyBillId: targetBill.id,
    });
  };

  return (
    <>
      <BillDashboardView
        bill={bill}
        payments={payments}
        relatedBills={relatedBills}
        source={source}
        stats={stats}
        remaining={remaining}
        payDate={payDate}
        onPayDateChange={setPayDate}
        onQuickPay={() => openPay(bill, remaining || num(bill.expected_amount))}
        onPartialPay={() =>
          setPay({
            title: bill.name,
            expectedAmount: remaining || num(bill.expected_amount),
            currency: bill.currency,
          })
        }
        onPayMonth={(monthBill, amount) => openPay(monthBill, amount)}
        backTo={
          from === "dashboard"
            ? { to: "/financas/dashboard", label: "Visão geral" }
            : { to: "/financas/contas-do-mes", label: "Contas do mês" }
        }
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
          currency={pay.currency}
          monthlyBillId={bill.id}
          defaultDate={payDate}
          onClose={() => setPay(null)}
          onSuccess={invalidate}
        />
      )}
    </>
  );
}
