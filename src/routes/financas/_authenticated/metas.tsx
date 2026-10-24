import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { contributeGoal, createGoal, deleteGoal, listGoals } from "@/lib/joao-financas/finance.functions";
import { getHousehold, joinHousehold } from "@/lib/joao-financas/household.functions";
import { toast } from "sonner";
import { Plus, Loader2, Target, Trash2, Wallet, Users, Copy, Check } from "lucide-react";
import { formatBRL, formatDateBR, num } from "@/lib/joao-financas/format";
import { FieldInput, FieldLabel, FormModal } from "@/components/joao-financas/form-modal";

export const Route = createFileRoute("/financas/_authenticated/metas")({
  head: () => ({
    meta: [{ title: "Metas - João Finanças" }],
  }),
  component: GoalsPage,
});

function GoalsPage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["goals"],
    queryFn: () => listGoals(),
  });
  const { data: household, refetch: refetchHousehold } = useQuery({
    queryKey: ["household"],
    queryFn: () => getHousehold(),
  });
  const [inviteInput, setInviteInput] = useState("");
  const [copied, setCopied] = useState(false);
  const [open, setOpen] = useState(false);
  const [contributeTarget, setContributeTarget] = useState<{
    id: string;
    title: string;
    current: number;
    target: number;
  } | null>(null);
  const [contributeAmount, setContributeAmount] = useState("");
  const [contributeNotes, setContributeNotes] = useState("");
  const [form, setForm] = useState({
    title: "",
    target_amount: "",
    current_amount: "0",
    deadline: "",
    monthly_contribution: "",
  });

  const create = useMutation({
    mutationFn: async () => {
      const target = parseFloat(form.target_amount.replace(",", "."));
      const current = parseFloat(form.current_amount.replace(",", ".") || "0");
      if (!form.title.trim() || !Number.isFinite(target) || target <= 0) {
        throw new Error("Preencha título e valor alvo.");
      }
      await createGoal({
        data: {
          title: form.title.trim(),
          target_amount: target,
          current_amount: current,
          deadline: form.deadline || null,
          monthly_contribution: form.monthly_contribution
            ? parseFloat(form.monthly_contribution.replace(",", "."))
            : null,
        },
      });
    },
    onSuccess: () => {
      toast.success("Meta criada");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
      setOpen(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const contribute = useMutation({
    mutationFn: async ({
      id,
      amount,
      notes,
    }: {
      id: string;
      amount: number;
      notes?: string;
    }) => contributeGoal({ data: { id, amount, notes } }),
    onSuccess: () => {
      toast.success("Aporte registrado");
      qc.invalidateQueries({ queryKey: ["goals"] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
      setContributeTarget(null);
      setContributeAmount("");
      setContributeNotes("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => deleteGoal({ data: { id } }),
    onSuccess: () => {
      toast.success("Meta removida");
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
  });

  const joinFamily = useMutation({
    mutationFn: () => joinHousehold({ data: { inviteCode: inviteInput.trim() } }),
    onSuccess: () => {
      toast.success("Vocês agora compartilham as mesmas finanças!");
      setInviteInput("");
      refetchHousehold();
      qc.invalidateQueries();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const copyInvite = async () => {
    if (!household?.inviteCode) return;
    await navigator.clipboard.writeText(household.inviteCode);
    setCopied(true);
    toast.success("Código copiado");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <section className="glass-card rounded-2xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <Users className="size-5 text-primary" />
          <div>
            <h2 className="font-semibold">Finanças da família</h2>
            <p className="text-xs text-muted-foreground">
              Você e seu cônjuge veem e lançam no mesmo painel.
            </p>
          </div>
        </div>

        {household && (
          <>
            <div className="rounded-xl border border-border/60 bg-white/[0.02] p-3 space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                Código para convidar
              </div>
              <div className="flex items-center gap-2">
                <code className="text-lg font-bold tracking-[0.2em] text-primary flex-1">
                  {household.inviteCode}
                </code>
                <button
                  type="button"
                  onClick={copyInvite}
                  className="inline-flex items-center gap-1 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-white/[0.04]"
                >
                  {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
                  Copiar
                </button>
              </div>
              <p className="text-[11px] text-muted-foreground">
                Passe este código para {household.members.length > 1 ? "outros membros" : "sua esposa(o)"} usar no cadastro ou abaixo.
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Membros</div>
              <ul className="space-y-1">
                {household.members.map((m) => (
                  <li key={m.id} className="flex items-center justify-between text-sm py-1.5">
                    <span>
                      {m.name}
                      {m.isYou && <span className="text-muted-foreground"> (você)</span>}
                    </span>
                    <span className="text-[10px] text-muted-foreground uppercase">{m.role}</span>
                  </li>
                ))}
              </ul>
            </div>

            {household.members.length < 2 && (
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  value={inviteInput}
                  onChange={(e) => setInviteInput(e.target.value.toUpperCase())}
                  placeholder="Código do cônjuge"
                  className="flex-1 bg-white/[0.03] border border-border rounded-xl px-3 py-2 text-sm uppercase tracking-widest"
                />
                <button
                  type="button"
                  onClick={() => joinFamily.mutate()}
                  disabled={!inviteInput.trim() || joinFamily.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground disabled:opacity-50"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  {joinFamily.isPending ? "Entrando..." : "Entrar na família"}
                </button>
              </div>
            )}
          </>
        )}
      </section>

      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Metas financeiras</h1>
          <p className="text-sm text-muted-foreground">Reserva mínima, reserva principal e quitação.</p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          <Plus className="size-4" /> Nova meta
        </button>
      </header>

      {isLoading && <div className="text-muted-foreground text-sm">Carregando...</div>}

      <div className="grid md:grid-cols-2 gap-4">
        {(data || []).map((g) => {
          const current = num(g.current_amount);
          const target = num(g.target_amount);
          const remaining = Math.max(0, target - current);
          const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
          const monthly = num(g.monthly_contribution);
          const monthsLeft = monthly > 0 ? Math.ceil(remaining / monthly) : null;
          return (
            <div key={g.id} className="glass-card rounded-2xl p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <Target className="size-4 text-primary" />
                    <h3 className="font-semibold">{g.title}</h3>
                  </div>
                  <div className="text-[11px] text-muted-foreground mt-1 capitalize">{g.kind}</div>
                </div>
                <button onClick={() => remove.mutate(g.id)} className="text-muted-foreground hover:text-danger">
                  <Trash2 className="size-4" />
                </button>
              </div>
              <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Atual</div>
                  <div className="font-semibold">{formatBRL(current)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Alvo</div>
                  <div className="font-semibold">{formatBRL(target)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Restante</div>
                  <div className="font-semibold">{formatBRL(remaining)}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase text-muted-foreground">Prazo</div>
                  <div className="font-semibold">{formatDateBR(g.deadline)}</div>
                </div>
              </div>
              <div className="mt-3">
                <div className="flex justify-between text-xs mb-1">
                  <span>{pct}%</span>
                  {monthsLeft != null && <span className="text-muted-foreground">~{monthsLeft} meses</span>}
                </div>
                <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
                </div>
              </div>
              <button
                type="button"
                className="mt-4 inline-flex items-center gap-1.5 text-xs px-3 py-2 rounded-lg border border-primary/30 text-foreground hover:bg-primary/10 transition-colors"
                onClick={() => {
                  setContributeTarget({
                    id: g.id,
                    title: g.title,
                    current,
                    target,
                  });
                  setContributeAmount("");
                  setContributeNotes("");
                }}
              >
                <Wallet className="size-3.5" />
                Registrar aporte
              </button>
            </div>
          );
        })}
      </div>

      {contributeTarget && (
        <FormModal
          title="Registrar aporte"
          onClose={() => {
            setContributeTarget(null);
            setContributeAmount("");
            setContributeNotes("");
          }}
        >
          <div className="rounded-xl border border-border/60 bg-white/[0.02] p-4 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Target className="size-4 text-primary shrink-0" />
              {contributeTarget.title}
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Atual</div>
                <div className="font-semibold tabular-nums">{formatBRL(contributeTarget.current)}</div>
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-widest text-muted-foreground">Alvo</div>
                <div className="font-semibold tabular-nums">{formatBRL(contributeTarget.target)}</div>
              </div>
            </div>
            <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.min(100, Math.round((contributeTarget.current / Math.max(1, contributeTarget.target)) * 100))}%`,
                  background: "var(--gradient-primary)",
                }}
              />
            </div>
          </div>

          <div>
            <FieldLabel>Valor do aporte (R$)</FieldLabel>
            <FieldInput
              inputMode="decimal"
              placeholder="Ex: 150,00"
              value={contributeAmount}
              onChange={(e) => setContributeAmount(e.target.value)}
              autoFocus
            />
          </div>

          <div>
            <FieldLabel>Observação (opcional)</FieldLabel>
            <FieldInput
              placeholder="Ex: depósito na poupança"
              value={contributeNotes}
              onChange={(e) => setContributeNotes(e.target.value)}
            />
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed">
            O valor informado será somado ao progresso da meta. Isso não debita automaticamente da sua
            conta bancária — é um registro manual do quanto você guardou ou quitou em direção ao objetivo.
          </p>

          <button
            type="button"
            disabled={contribute.isPending}
            onClick={() => {
              const amount = parseFloat(contributeAmount.replace(",", "."));
              if (!Number.isFinite(amount) || amount <= 0) {
                toast.error("Informe um valor válido");
                return;
              }
              contribute.mutate({
                id: contributeTarget.id,
                amount,
                notes: contributeNotes.trim() || undefined,
              });
            }}
            className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground"
            style={{ background: "var(--gradient-primary)" }}
          >
            {contribute.isPending ? (
              <Loader2 className="size-4 animate-spin mx-auto" />
            ) : (
              "Confirmar aporte"
            )}
          </button>
        </FormModal>
      )}

      {open && (
        <FormModal title="Nova meta" onClose={() => setOpen(false)}>
          <FieldLabel>Título</FieldLabel>
          <FieldInput placeholder="Título" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          <FieldLabel>Valor alvo</FieldLabel>
          <FieldInput placeholder="Valor alvo" value={form.target_amount} onChange={(e) => setForm({ ...form, target_amount: e.target.value })} />
          <FieldLabel>Valor atual</FieldLabel>
          <FieldInput placeholder="Valor atual" value={form.current_amount} onChange={(e) => setForm({ ...form, current_amount: e.target.value })} />
          <FieldLabel>Contribuição mensal</FieldLabel>
          <FieldInput placeholder="Contribuição mensal" value={form.monthly_contribution} onChange={(e) => setForm({ ...form, monthly_contribution: e.target.value })} />
          <FieldLabel>Prazo</FieldLabel>
          <FieldInput type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
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
