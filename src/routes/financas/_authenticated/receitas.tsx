import { createFileRoute } from "@tanstack/react-router";
import { TransactionsPage, incomeCategories } from "@/components/joao-financas/transactions-page";

export const Route = createFileRoute("/financas/_authenticated/receitas")({
  head: () => ({
    meta: [
      { title: "Receitas - João Finanças" },
      { name: "description", content: "Cadastre e acompanhe todas as suas receitas." },
      { property: "og:title", content: "Receitas - João Finanças" },
      { property: "og:description", content: "Cadastre e acompanhe todas as suas receitas." },
    ],
  }),
  component: () => (
    <TransactionsPage
      kind="incomes"
      title="Receitas"
      subtitle="Tudo o que entra na sua conta."
      categories={incomeCategories}
    />
  ),
});
