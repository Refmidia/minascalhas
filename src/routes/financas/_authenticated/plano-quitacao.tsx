import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getPayoffPlan, setIncomeScenario, getFinanceOverview } from "@/lib/joao-financas/finance.functions";
import { formatMoney, debtBalance, formatBRL, num } from "@/lib/joao-financas/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/financas/_authenticated/plano-quitacao")({
  head: () => ({
    meta: [{ title: "Plano de quitação - João Finanças" }],
  }),
  component: PayoffPage,
});

function PayoffPage() {
  const [strategy, setStrategy] = useState<"smallest" | "interest" | "impact">("smallest");
  const [extra, setExtra] = useState("0");
  const qc = useQueryClient();

  const { data: overview } = useQuery({
    queryKey: ["finance-overview"],
    queryFn: () => getFinanceOverview(),
  });

  const { data, isLoading } = useQuery({
    queryKey: ["payoff", strategy],
    queryFn: () => getPayoffPlan({ data: { strategy } }),
  });

  const projected = overview?.projectedBalance ?? 0;
  const extraNum = parseFloat(extra.replace(",", ".")) || 0;
  const safeBudget = Math.max(0, projected);
  const suggestedExtra = Math.min(extraNum, safeBudget);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Plano de quitação</h1>
        <p className="text-sm text-muted-foreground">
          Estratégia inicial: menor saldo primeiro. Nunca sugerimos pagamento que deixe o mês negativo.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {(
          [
            ["smallest", "Menor saldo"],
            ["interest", "Maior juros"],
            ["impact", "Maior impacto mensal"],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setStrategy(id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border",
              strategy === id ? "border-primary bg-primary/15" : "border-border text-muted-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="glass-card rounded-2xl p-5 grid md:grid-cols-3 gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Saldo projetado (cenário)</div>
          <div className={cn("text-xl font-bold", projected < 0 ? "text-danger" : "text-success")}>
            {formatBRL(projected)}
          </div>
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Pagamento extra simulado</div>
          <input
            className="mt-1 w-full bg-white/[0.03] border border-border rounded-lg px-3 py-2 text-sm"
            value={extra}
            onChange={(e) => setExtra(e.target.value)}
          />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Extra seguro sugerido</div>
          <div className="text-xl font-bold mt-1">{formatBRL(suggestedExtra)}</div>
          {extraNum > safeBudget && (
            <p className="text-xs text-danger mt-1">Extra limitado para não deixar o mês negativo.</p>
          )}
        </div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">Ordem BRL</h2>
        {(data?.brl || []).map((d, i) => (
          <div key={d.id} className="glass-card rounded-xl p-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-8 rounded-lg grid place-items-center bg-white/5 text-sm font-bold">{i + 1}</div>
              <div className="min-w-0">
                <div className="font-medium truncate">{d.creditor}</div>
                <div className="text-xs text-muted-foreground">
                  {d.priority} · parcela {d.installment_amount ? formatMoney(d.installment_amount, "BRL") : "—"}
                </div>
              </div>
            </div>
            <div className="font-bold tabular-nums">{formatMoney(debtBalance(d), "BRL")}</div>
          </div>
        ))}
        {(data?.brl || []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma dívida BRL ativa (ou Havan ainda em revisão).</p>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">USD (separado)</h2>
        {(data?.usd || []).map((d) => (
          <div key={d.id} className="glass-card rounded-xl p-4 flex justify-between">
            <span className="font-medium">{d.creditor}</span>
            <span className="font-bold">{formatMoney(debtBalance(d), "USD")}</span>
          </div>
        ))}
      </section>

      <div className="glass-card rounded-2xl p-5 text-sm text-muted-foreground space-y-2">
        <p>Simulações:</p>
        <ul className="list-disc list-inside space-y-1">
          <li>Aumento de renda: use o seletor de cenário no dashboard (mín/média/máx).</li>
          <li>Redução de gastos: cada R$ 100 a menos nas variáveis sobe o extra seguro em ~R$ 100.</li>
          <li>
            Com extra de {formatBRL(suggestedExtra)} no primeiro da fila, a previsão melhora sem comprometer o caixa.
          </li>
        </ul>
        <button
          className="mt-2 text-xs px-3 py-1.5 rounded-lg border border-border"
          onClick={() => {
            setIncomeScenario({ data: { scenario: "avg" } }).then(() =>
              qc.invalidateQueries({ queryKey: ["finance-overview"] }),
            );
          }}
        >
          Usar cenário de renda média
        </button>
      </div>
    </div>
  );
}
