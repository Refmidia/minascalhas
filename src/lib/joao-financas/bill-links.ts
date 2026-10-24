import type { MonthlyBill } from "@/lib/joao-financas/bills.server";

type BillLink =
  | { to: "/financas/dividas/$debtId"; params: { debtId: string } }
  | { to: "/financas/contas-recorrentes/$accountId"; params: { accountId: string } }
  | { to: "/financas/contas-do-mes/$billId"; params: { billId: string } };

/** Rota do painel de controle para uma conta do mês. */
export function billDashboardLink(
  bill: Pick<MonthlyBill, "id" | "source_type" | "source_id">,
): BillLink {
  if (bill.source_type === "debt" && bill.source_id) {
    return { to: "/financas/dividas/$debtId", params: { debtId: bill.source_id } };
  }
  if (bill.source_type === "recurring" && bill.source_id) {
    return { to: "/financas/contas-recorrentes/$accountId", params: { accountId: bill.source_id } };
  }
  return { to: "/financas/contas-do-mes/$billId", params: { billId: bill.id } };
}
