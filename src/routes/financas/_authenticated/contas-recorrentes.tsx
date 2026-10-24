import { createFileRoute, Link, Outlet, useMatch } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  createRecurring,
  deleteRecurring,
  generateRecurring,
  listRecurring,
} from "@/lib/joao-financas/finance.functions";
import { toast } from "sonner";
import { Plus, Loader2, RefreshCw, Trash2, ChevronRight } from "lucide-react";
import { formatBRL, num } from "@/lib/joao-financas/format";
import { DarkSelect, FieldInput, FieldLabel, FormModal } from "@/components/joao-financas/form-modal";
import { labelPriority, labelStatus } from "@/lib/joao-financas/labels";

export const Route = createFileRoute("/financas/_authenticated/contas-recorrentes")({
  head: () => ({
    meta: [{ title: "Contas recorrentes - João Finanças" }],
  }),
  component: RecurringLayout,
});

function RecurringLayout() {
  const detail = useMatch({
    from: "/_authenticated/contas-recorrentes/$accountId",
    shouldThrow: false,
  });
  if (detail) return <Outlet />;
  return <RecurringPage />;
}

const frequencies = [
  "semanal",
  "quinzenal",
  "mensal",
  "bimestral",
  "trimestral",
  "semestral",
  "anual",
] as const;

function RecurringPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["recurring"],
    queryFn: () => listRecurring(),
  });
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    name: "",
    category: "Moradia",
    amount: "",
    frequency: "mensal",
    due_day: "1",
    priority: "media",
    notes: "",
  });

  const total = (data || []).reduce((a, r) => a + num(r.amount), 0);

  const create = useMutation({
    mutationFn: async () => {
      const amount = parseFloat(form.amount.replace(",", "."));
      if (!form.name.trim() || !Number.isFinite(amount)) throw new Error("Preencha nome e valor");
      await createRecurring({
        data: {
          name: form.name.trim(),
          category: form.category,
          amount,
          frequency: form.frequency,
          due_day: form.due_day ? parseInt(form.due_day, 10) : null,
          priority: form.priority,
          notes: form.notes || null,
          auto_generate: true,
        },
      });
    },
    onSuccess: () => {
      toast.success("Conta recorrente criada");
      qc.invalidateQueries({ queryKey: ["recurring"] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
      qc.invalidateQueries({ queryKey: ["calendar"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteRecurring({ data: { id } }),
    onSuccess: () => {
      toast.success("Arquivada");
      qc.invalidateQueries({ queryKey: ["recurring"] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
    },
  });

  const generate = useMutation({
    mutationFn: () => generateRecurring(),
    onSuccess: (res) => {
      toast.success(`Lançamentos do mês: ${res.created} novo(s)`);
      qc.invalidateQueries({ queryKey: ["calendar"] });
    },
  });

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Contas recorrentes</h1>
          <p className="text-sm text-muted-foreground">
            Compromissos mensais — separados das dívidas quitáveis.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => generate.mutate()}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl text-sm border border-border"
          >
            <RefreshCw className={generate.isPending ? "size-4 animate-spin" : "size-4"} />
            Gerar mês
          </button>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            <Plus className="size-4" /> Nova conta
          </button>
        </div>
      </header>

      <div className="glass-card rounded-2xl p-5">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Total mensal</div>
        <div className="text-2xl font-bold">{formatBRL(total)}</div>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      <div className="space-y-3">
        {(data || []).map((r) => (
          <div key={r.id} className="glass-card rounded-2xl p-5 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/financas/contas-recorrentes/$accountId"
              params={{ accountId: r.id }}
              className="flex-1 min-w-0 group"
            >
              <div className="font-semibold group-hover:text-primary transition-colors inline-flex items-center gap-1">
                {r.name}
                <ChevronRight className="size-4 opacity-40 group-hover:opacity-100" />
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                {r.category} · {r.frequency} · dia {r.due_day ?? "—"} · {labelPriority(r.priority)} ·{" "}
                {labelStatus(r.status)}
              </div>
              {r.notes && <p className="text-xs text-muted-foreground mt-2">{r.notes}</p>}
            </Link>
            <div className="flex items-center gap-3">
              <div className="text-lg font-bold tabular-nums">{formatBRL(r.amount)}</div>
              <button
                onClick={(e) => {
                  e.preventDefault();
                  remove.mutate(r.id);
                }}
                className="p-2 text-muted-foreground hover:text-danger"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {open && (
        <FormModal title="Nova conta mensal" onClose={() => setOpen(false)}>
          <div>
            <FieldLabel>Nome</FieldLabel>
            <FieldInput
              placeholder="Nome"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              autoFocus
            />
          </div>
          <div>
            <FieldLabel>Valor</FieldLabel>
            <FieldInput
              placeholder="0,00"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <DarkSelect
              label="Frequência"
              value={form.frequency}
              onChange={(frequency) => setForm({ ...form, frequency })}
              options={frequencies.map((f) => ({ value: f, label: f }))}
            />
            <div>
              <FieldLabel>Dia</FieldLabel>
              <FieldInput
                placeholder="Dia"
                value={form.due_day}
                onChange={(e) => setForm({ ...form, due_day: e.target.value })}
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
            {create.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Salvar"}
          </button>
        </FormModal>
      )}
    </div>
  );
}
