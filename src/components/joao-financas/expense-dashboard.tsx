import { formatBRL, formatDateBR, num } from "@/lib/joao-financas/format";
import { monthLabel, shiftMonth } from "@/lib/joao-financas/labels";
import type { Expense } from "@/lib/joao-financas/finance.types";
import { cn } from "@/lib/utils";
import {
  ChevronLeft,
  ChevronRight,
  Dog,
  Droplets,
  Fuel,
  Package,
  Plus,
  ShowerHead,
  Sparkles,
  UtensilsCrossed,
  Wifi,
  Zap,
} from "lucide-react";

export const trackedExpenseCategories = [
  { key: "Alimentação", label: "Alimentação", hint: "Gastos do dia", icon: UtensilsCrossed, tone: "rose" },
  { key: "Combustível", label: "Combustível", hint: "Abastecimentos", icon: Fuel, tone: "amber" },
  { key: "Água", label: "Água", hint: "Pagamento mensal", icon: Droplets, tone: "sky" },
  { key: "Internet", label: "Internet", hint: "Pagamento mensal", icon: Wifi, tone: "violet" },
  { key: "Energia", label: "Luz", hint: "Pagamento mensal", icon: Zap, tone: "yellow" },
] as const;

export const chanelExpenseCategories = [
  { key: "Chanel · Ração", label: "Ração", hint: "Alimentação", icon: Package, tone: "pink" },
  { key: "Chanel · Tapete", label: "Tapete", hint: "Higiene", icon: Sparkles, tone: "teal" },
  { key: "Chanel · Banho", label: "Banho", hint: "Pet shop", icon: ShowerHead, tone: "cyan" },
  { key: "Chanel · Outros", label: "Outros", hint: "Vet, remédios…", icon: Dog, tone: "fuchsia" },
] as const;

export const allTrackedExpenseCategories = [...trackedExpenseCategories, ...chanelExpenseCategories];

export type TrackedCategory =
  | (typeof trackedExpenseCategories)[number]["key"]
  | (typeof chanelExpenseCategories)[number]["key"];

const toneStyles: Record<string, string> = {
  rose: "from-rose-500/20 to-rose-500/5 border-rose-500/25 text-rose-300",
  amber: "from-amber-500/20 to-amber-500/5 border-amber-500/25 text-amber-300",
  sky: "from-sky-500/20 to-sky-500/5 border-sky-500/25 text-sky-300",
  violet: "from-violet-500/20 to-violet-500/5 border-violet-500/25 text-violet-300",
  yellow: "from-yellow-500/20 to-yellow-500/5 border-yellow-500/25 text-yellow-300",
  pink: "from-pink-500/20 to-pink-500/5 border-pink-500/25 text-pink-300",
  teal: "from-teal-500/20 to-teal-500/5 border-teal-500/25 text-teal-300",
  cyan: "from-cyan-500/20 to-cyan-500/5 border-cyan-500/25 text-cyan-300",
  fuchsia: "from-fuchsia-500/20 to-fuchsia-500/5 border-fuchsia-500/25 text-fuchsia-300",
};

function monthBounds(monthKey: string) {
  const [y, m] = monthKey.split("-").map(Number);
  const start = `${monthKey}-01`;
  const next = m === 12 ? `${y + 1}-01-01` : `${y}-${String(m + 1).padStart(2, "0")}-01`;
  return { start, end: next };
}

export function ExpenseDashboard({
  rows,
  month,
  onMonthChange,
  activeCategory,
  onCategoryFilter,
  onAddCategory,
}: {
  rows: Expense[];
  month: string;
  onMonthChange: (m: string) => void;
  activeCategory: TrackedCategory | null;
  onCategoryFilter: (key: TrackedCategory | null) => void;
  onAddCategory: (key: TrackedCategory) => void;
}) {
  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const { start, end } = monthBounds(month);
  const prevKey = shiftMonth(month, -1);
  const { start: prevStart, end: prevEnd } = monthBounds(prevKey);

  const monthRows = rows.filter((r) => r.spent_at >= start && r.spent_at < end);
  const prevRows = rows.filter((r) => r.spent_at >= prevStart && r.spent_at < prevEnd);

  const totalMonth = monthRows.reduce((a, r) => a + num(r.amount), 0);
  const trackedTotal = monthRows
    .filter((r) => allTrackedExpenseCategories.some((c) => c.key === r.category))
    .reduce((a, r) => a + num(r.amount), 0);

  const chanelTotal = monthRows
    .filter((r) => chanelExpenseCategories.some((c) => c.key === r.category))
    .reduce((a, r) => a + num(r.amount), 0);

  const renderCategoryGrid = (
    categories: typeof trackedExpenseCategories | typeof chanelExpenseCategories,
    gridClass: string,
  ) => (
    <div className={cn("grid grid-cols-1 sm:grid-cols-2 gap-3", gridClass)}>
      {categories.map((cat) => {
        const Icon = cat.icon;
        const items = monthRows.filter((r) => r.category === cat.key);
        const total = items.reduce((a, r) => a + num(r.amount), 0);
        const prevTotal = prevRows.filter((r) => r.category === cat.key).reduce((a, r) => a + num(r.amount), 0);
        const last = items.sort((a, b) => b.spent_at.localeCompare(a.spent_at))[0];
        const active = activeCategory === cat.key;

        return (
          <button
            key={cat.key}
            type="button"
            onClick={() => onCategoryFilter(active ? null : cat.key)}
            className={cn(
              "rounded-2xl border p-4 text-left transition-all bg-gradient-to-br",
              toneStyles[cat.tone],
              active && "ring-2 ring-primary ring-offset-2 ring-offset-background scale-[1.02]",
              !active && "hover:scale-[1.01]",
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="size-9 rounded-xl bg-black/20 flex items-center justify-center shrink-0">
                <Icon className="size-4" />
              </div>
              <span className="text-[10px] uppercase tracking-wider opacity-70">{cat.hint}</span>
            </div>
            <div className="mt-3 font-semibold">{cat.label}</div>
            <div className="text-xl font-bold tabular-nums mt-1">{formatBRL(total)}</div>
            <div className="text-[11px] opacity-80 mt-2 space-y-0.5">
              <div>{items.length} lançamento{items.length !== 1 ? "s" : ""} no mês</div>
              <div>{last ? `Último: ${formatDateBR(last.spent_at)}` : "Nenhum lançamento ainda"}</div>
              {prevTotal > 0 && <div className="opacity-70">Mês ant.: {formatBRL(prevTotal)}</div>}
            </div>
            <span
              role="button"
              tabIndex={0}
              onClick={(e) => {
                e.stopPropagation();
                onAddCategory(cat.key);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  e.stopPropagation();
                  onAddCategory(cat.key);
                }
              }}
              className="mt-3 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 rounded-lg bg-black/25 hover:bg-black/40"
            >
              <Plus className="size-3.5" /> Lançar
            </span>
          </button>
        );
      })}
    </div>
  );

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Dashboard de gastos
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5 capitalize">
            {monthLabel(month)} · {formatBRL(trackedTotal)} nas categorias abaixo
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="p-2 rounded-lg border border-border hover:bg-white/[0.04]"
            onClick={() => onMonthChange(shiftMonth(month, -1))}
            aria-label="Mês anterior"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            type="button"
            className="px-3 py-1.5 text-xs rounded-lg border border-border hover:bg-white/[0.04]"
            onClick={() => onMonthChange(nowKey)}
          >
            Mês atual
          </button>
          <button
            type="button"
            className="p-2 rounded-lg border border-border hover:bg-white/[0.04]"
            onClick={() => onMonthChange(shiftMonth(month, 1))}
            aria-label="Próximo mês"
          >
            <ChevronRight className="size-4" />
          </button>
          <input
            type="month"
            value={month}
            onChange={(e) => onMonthChange(e.target.value)}
            className="bg-white/[0.03] border border-border rounded-lg px-2 py-1.5 text-sm"
          />
        </div>
      </div>

      {renderCategoryGrid(trackedExpenseCategories, "xl:grid-cols-5")}

      <div className="space-y-3 pt-2">
        <div className="flex flex-wrap items-end justify-between gap-2 px-1">
          <div>
            <h3 className="text-sm font-semibold tracking-tight inline-flex items-center gap-2">
              <Dog className="size-4 text-pink-400" /> Chanel
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Ração, tapete, banho e outros custos · {formatBRL(chanelTotal)} no mês
            </p>
          </div>
        </div>
        {renderCategoryGrid(chanelExpenseCategories, "xl:grid-cols-4")}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground px-1">
        <span>
          Total geral do mês: <strong className="text-foreground">{formatBRL(totalMonth)}</strong>
        </span>
        {activeCategory && (
          <button
            type="button"
            onClick={() => onCategoryFilter(null)}
            className="text-primary hover:underline"
          >
            Limpar filtro · ver todos os lançamentos
          </button>
        )}
      </div>
    </section>
  );
}
