import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createExpense,
  createIncome,
  deleteTransaction,
  listExpenses,
  listIncomes,
} from "@/lib/joao-financas/finance.functions";
import { toast } from "sonner";
import { Plus, Trash2, Loader2 } from "lucide-react";
import { formatBRL, formatDateBR, num } from "@/lib/joao-financas/format";
import { DarkSelect, FieldInput, FieldLabel, FieldTextarea, FormModal } from "@/components/joao-financas/form-modal";
import {
  ExpenseDashboard,
  chanelExpenseCategories,
  type TrackedCategory,
} from "@/components/joao-financas/expense-dashboard";
import type { Expense } from "@/lib/joao-financas/finance.types";

export const incomeCategories = [
  "Desenvolvimento de sites",
  "Desenvolvimento de sistemas",
  "Social media",
  "Artes",
  "Painel SMM",
  "Marketing",
  "Empréstimos",
  "Outros",
] as const;

export const expenseCategories = [
  "Alimentação",
  "Combustível",
  "Moradia",
  "Água",
  "Energia",
  "Internet",
  "Veículo",
  "Saúde",
  "Ferramentas",
  "Software",
  "Marketing",
  "Impostos",
  "Lazer",
  "Chanel · Ração",
  "Chanel · Tapete",
  "Chanel · Banho",
  "Chanel · Outros",
  "Outros",
] as const;

export const paymentMethods = ["Pix", "Cartão", "Dinheiro", "Transferência", "Boleto"] as const;

export function useTransactions(table: "incomes" | "expenses") {
  return useQuery({
    queryKey: [table],
    queryFn: async () => (table === "incomes" ? listIncomes() : listExpenses()),
  });
}

export function TransactionsPage({
  kind,
  title,
  subtitle,
  categories,
}: {
  kind: "incomes" | "expenses";
  title: string;
  subtitle: string;
  categories: readonly string[];
}) {
  const qc = useQueryClient();
  const { data: rows, isLoading } = useTransactions(kind);
  const [open, setOpen] = useState(false);
  const nowKey = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  const [dashboardMonth, setDashboardMonth] = useState(nowKey);
  const [categoryFilter, setCategoryFilter] = useState<TrackedCategory | null>(null);
  const [form, setForm] = useState({
    description: "",
    amount: "",
    category: categories[0],
    payment_method: paymentMethods[0] as string,
    date: new Date().toISOString().slice(0, 10),
    notes: "",
    source: "",
    client_name: "",
    recurrence: "unique" as string,
    status: kind === "incomes" ? "recebida" : "ativa",
    is_essential: true,
    is_recurring: false,
  });

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const prevMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().slice(0, 10);
  const prevMonthEnd = monthStart;

  const monthRows = (rows || []).filter((r) => {
    const d = kind === "incomes" ? (r as { received_at: string }).received_at : (r as { spent_at: string }).spent_at;
    return d >= monthStart;
  });
  const prevRows = (rows || []).filter((r) => {
    const d = kind === "incomes" ? (r as { received_at: string }).received_at : (r as { spent_at: string }).spent_at;
    return d >= prevMonthStart && d < prevMonthEnd;
  });

  const totalMonth = monthRows.reduce((a, r) => a + num(r.amount), 0);
  const totalPrev = prevRows.reduce((a, r) => a + num(r.amount), 0);
  const total = (rows || []).reduce((a, r) => a + num(r.amount), 0);

  const create = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount.replace(",", "."));
      if (!form.description.trim() || !Number.isFinite(amount) || amount < 0) {
        throw new Error("Preencha descrição e valor válidos");
      }
      if (kind === "incomes") {
        await createIncome({
          data: {
            description: form.description.trim(),
            amount,
            category: form.category,
            payment_method: form.payment_method,
            source: form.source || null,
            client_name: form.client_name || null,
            recurrence: form.recurrence,
            status: form.status,
            received_at: form.date,
            expected_at: form.status === "prevista" ? form.date : null,
            is_recurring: form.is_recurring,
            notes: form.notes || null,
          },
        });
      } else {
        await createExpense({
          data: {
            description: form.description.trim(),
            amount,
            category: form.category,
            payment_method: form.payment_method,
            spent_at: form.date,
            is_essential: form.is_essential,
            is_recurring: form.is_recurring,
            status: form.status,
            notes: form.notes || null,
          },
        });
      }
    },
    onSuccess: () => {
      toast.success(kind === "incomes" ? "Receita cadastrada" : "Gasto cadastrado");
      qc.invalidateQueries({ queryKey: [kind] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
      setOpen(false);
      setForm((f) => ({ ...f, description: "", amount: "", notes: "", source: "", client_name: "" }));
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => deleteTransaction({ data: { table: kind, id } }),
    onSuccess: () => {
      toast.success("Removido");
      qc.invalidateQueries({ queryKey: [kind] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });

  const essential = kind === "expenses"
    ? monthRows.filter((r) => Boolean((r as { is_essential?: boolean | number }).is_essential)).reduce((a, r) => a + num(r.amount), 0)
    : 0;
  const optional = kind === "expenses" ? totalMonth - essential : 0;
  const received = kind === "incomes"
    ? monthRows.filter((r) => (r as { status?: string }).status === "recebida").reduce((a, r) => a + num(r.amount), 0)
    : 0;
  const predicted = kind === "incomes"
    ? monthRows.filter((r) => ["prevista", "parcial", "atrasada"].includes((r as { status?: string }).status || "")).reduce((a, r) => a + num(r.amount), 0)
    : 0;

  const topCategory = (() => {
    const map: Record<string, number> = {};
    monthRows.forEach((r) => {
      const c = (r as { category?: string }).category || "Outros";
      map[c] = (map[c] || 0) + num(r.amount);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  })();

  const expenseRows = (rows || []) as Expense[];
  const visibleRows =
    kind === "expenses" && categoryFilter
      ? expenseRows.filter((r) => r.category === categoryFilter)
      : rows || [];

  const openNewExpense = (category?: TrackedCategory) => {
    if (category) {
      const chanel = chanelExpenseCategories.find((c) => c.key === category);
      setForm((f) => ({
        ...f,
        category,
        description: chanel ? `Chanel — ${chanel.label}` : "",
        amount: "",
        date: new Date().toISOString().slice(0, 10),
      }));
    }
    setOpen(true);
  };

  const categoryFilterLabel =
    categoryFilter === "Energia"
      ? "Luz"
      : categoryFilter?.startsWith("Chanel · ")
        ? categoryFilter.replace("Chanel · ", "") + " (Chanel)"
        : categoryFilter;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <button
          onClick={() => openNewExpense()}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)", boxShadow: "var(--shadow-glow)" }}
        >
          <Plus className="size-4" /> Nova {kind === "incomes" ? "receita" : "despesa"}
        </button>
      </header>

      {kind === "expenses" && (
        <ExpenseDashboard
          rows={expenseRows}
          month={dashboardMonth}
          onMonthChange={setDashboardMonth}
          activeCategory={categoryFilter}
          onCategoryFilter={setCategoryFilter}
          onAddCategory={openNewExpense}
        />
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total registrado" value={formatBRL(total)} />
        <Stat label="Este mês" value={formatBRL(totalMonth)} />
        <Stat label="Mês anterior" value={formatBRL(totalPrev)} />
        {kind === "incomes" ? (
          <>
            <Stat label="Recebida" value={formatBRL(received)} />
            <Stat label="Prevista/pendente" value={formatBRL(predicted)} />
          </>
        ) : (
          <>
            <Stat label="Essenciais" value={formatBRL(essential)} />
            <Stat label="Opcionais" value={formatBRL(optional)} />
            <Stat label="Maior categoria" value={topCategory} />
          </>
        )}
      </div>

      <div className="glass-card rounded-2xl p-5 overflow-x-auto">
        {kind === "expenses" && categoryFilter && (
          <p className="text-xs text-muted-foreground mb-3">
            Filtrando: <span className="text-foreground font-medium">{categoryFilterLabel}</span>
          </p>
        )}
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-muted-foreground text-left">
              <th className="px-2 py-2">Descrição</th>
              <th className="px-2 py-2">Categoria</th>
              <th className="px-2 py-2">Status</th>
              <th className="px-2 py-2">Data</th>
              <th className="px-2 py-2 text-right">Valor</th>
              <th className="px-2 py-2 w-8" />
            </tr>
          </thead>
          <tbody>
            {isLoading && (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">Carregando...</td></tr>
            )}
            {!isLoading && visibleRows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-muted-foreground">
                {categoryFilter ? "Nenhum lançamento nesta categoria." : "Nenhum lançamento ainda."}
              </td></tr>
            )}
            {visibleRows.map((r) => (
              <tr key={r.id} className="border-t border-border hover:bg-white/[0.02]">
                <td className="px-2 py-3 font-medium">
                  {r.description}
                  {kind === "incomes" && (r as { client_name?: string }).client_name && (
                    <div className="text-[11px] text-muted-foreground">{(r as { client_name?: string }).client_name}</div>
                  )}
                </td>
                <td className="px-2 py-3">
                  <span className="text-xs px-2 py-0.5 rounded-full bg-white/[0.05] border border-border">
                    {r.category || "—"}
                  </span>
                </td>
                <td className="px-2 py-3 text-muted-foreground capitalize text-xs">
                  {(r as { status?: string }).status || "—"}
                </td>
                  <td className="px-2 py-3 text-muted-foreground">
                    {formatDateBR(
                      kind === "incomes"
                        ? (r as { received_at: string }).received_at
                        : (r as { spent_at: string }).spent_at,
                    )}
                  </td>
                <td className={"px-2 py-3 text-right tabular-nums font-semibold " + (kind === "incomes" ? "text-success" : "text-danger")}>
                  {kind === "incomes" ? "+" : "-"} {formatBRL(r.amount)}
                </td>
                <td className="px-2 py-3">
                  <button onClick={() => remove.mutate(r.id)} className="text-muted-foreground hover:text-danger p-1">
                    <Trash2 className="size-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {open && (
        <FormModal
          title={`Nova ${kind === "incomes" ? "receita" : "despesa"}`}
          onClose={() => setOpen(false)}
        >
          <div>
            <FieldLabel>Descrição</FieldLabel>
            <FieldInput
              placeholder="Descrição"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              autoFocus
            />
          </div>
          {kind === "incomes" && (
            <div>
              <FieldLabel>Cliente</FieldLabel>
              <FieldInput
                placeholder="Cliente"
                value={form.client_name}
                onChange={(e) => setForm({ ...form, client_name: e.target.value })}
              />
            </div>
          )}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <FieldLabel>Valor</FieldLabel>
              <FieldInput
                placeholder="0,00"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: e.target.value })}
              />
            </div>
            <div>
              <FieldLabel>Data</FieldLabel>
              <FieldInput
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DarkSelect
              label="Categoria"
              value={form.category}
              onChange={(category) => setForm({ ...form, category })}
              options={categories.map((c) => ({ value: c, label: c }))}
            />
            <DarkSelect
              label="Forma de pagamento"
              value={form.payment_method}
              onChange={(payment_method) => setForm({ ...form, payment_method })}
              options={paymentMethods.map((c) => ({ value: c, label: c }))}
            />
          </div>
          {kind === "incomes" ? (
            <DarkSelect
              label="Status"
              value={form.status}
              onChange={(status) => setForm({ ...form, status })}
              options={[
                { value: "prevista", label: "Prevista" },
                { value: "recebida", label: "Recebida" },
                { value: "parcial", label: "Parcial" },
                { value: "atrasada", label: "Atrasada" },
                { value: "cancelada", label: "Cancelada" },
              ]}
            />
          ) : (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.is_essential}
                onChange={(e) => setForm({ ...form, is_essential: e.target.checked })}
              />
              Essencial
            </label>
          )}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.is_recurring}
              onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
            />
            Recorrente
          </label>
          <div>
            <FieldLabel>Observações</FieldLabel>
            <FieldTextarea
              rows={2}
              placeholder="Observações"
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
            />
          </div>
          <button
            type="button"
            disabled={create.isPending}
            onClick={() => create.mutate()}
            className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground flex items-center justify-center gap-2"
            style={{ background: "var(--gradient-primary)" }}
          >
            {create.isPending && <Loader2 className="size-4 animate-spin" />}
            Salvar
          </button>
        </FormModal>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1 truncate">{value}</div>
    </div>
  );
}
