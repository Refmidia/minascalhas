import type { CalendarEvent } from "@/lib/joao-financas/finance.types";

export type CalendarEventLink =
  | { to: "/financas/dividas/$debtId"; params: { debtId: string } }
  | { to: "/financas/contas-recorrentes/$accountId"; params: { accountId: string } }
  | { to: "/financas/contas-do-mes/$billId"; params: { billId: string } }
  | { to: "/financas/receitas" };

/** Destino ao clicar em um evento do calendário. */
export function calendarEventLink(event: CalendarEvent): CalendarEventLink | null {
  if (event.billId) {
    return { to: "/financas/contas-do-mes/$billId", params: { billId: event.billId } };
  }
  if (event.debtId) {
    return { to: "/financas/dividas/$debtId", params: { debtId: event.debtId } };
  }
  if (event.accountId) {
    return { to: "/financas/contas-recorrentes/$accountId", params: { accountId: event.accountId } };
  }
  if (event.kind === "income") {
    return { to: "/financas/receitas" };
  }
  return null;
}
