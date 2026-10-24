import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage, expenseCategories } from "@/components/joao-financas/transactions-page";

export const Route = createFileRoute("/financas/_authenticated/gastos")({
  head: () => ({
    meta: [
      { title: "Despesas - João Finanças" },
      { name: "description", content: "Registre e categorize suas despesas." },
      { property: "og:title", content: "Despesas - João Finanças" },
      { property: "og:description", content: "Registre e categorize suas despesas." },
    ],
  }),
  component: () => (
    <TransactionsPage
      kind="expenses"
      title="Despesas"
      subtitle="Combustível, alimentação, contas da casa e custos da Chanel (ração, tapete, banho…)."
      categories={expenseCategories}
    />
  ),
});
