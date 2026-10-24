import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getReserve, moveReserve } from "@/lib/joao-financas/finance.functions";
import { toast } from "sonner";
import { formatBRL, formatDateBR, num } from "@/lib/joao-financas/format";
import { Loader2, PiggyBank } from "lucide-react";

export const Route = createFileRoute("/financas/_authenticated/reserva")({
  head: () => ({
    meta: [{ title: "Reserva - João Finanças" }],
  }),
  component: ReservePage,
});

function ReservePage() {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["reserve"],
    queryFn: () => getReserve(),
  });
  const [type, setType] = useState<"deposit" | "withdraw">("deposit");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");

  const move = useMutation({
    mutationFn: async () => {
      const v = parseFloat(amount.replace(",", "."));
      if (!Number.isFinite(v) || v <= 0) throw new Error("Valor inválido");
      await moveReserve({
        data: { type, amount: v, reason: reason || null },
      });
    },
    onSuccess: () => {
      toast.success(type === "deposit" ? "Depósito registrado" : "Retirada registrada");
      setAmount("");
      setReason("");
      qc.invalidateQueries({ queryKey: ["reserve"] });
      qc.invalidateQueries({ queryKey: ["finance-overview"] });
      qc.invalidateQueries({ queryKey: ["goals"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading || !data) {
    return <div className="text-sm text-muted-foreground">Carregando...</div>;
  }

  const current = num(data.reserve.current_amount);
  const target = num(data.reserve.target_amount);
  const safety = num(data.reserve.safety_target);
  const pct = Math.min(100, Math.round((current / Math.max(1, target)) * 100));
  const remaining = Math.max(0, target - current);
  const monthsCovered = 8530 > 0 ? current / 8530 : 0;

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Reserva de emergência</h1>
        <p className="text-sm text-muted-foreground">Proteção mínima e meta principal.</p>
      </header>

      {current < safety && (
        <div className="rounded-2xl border border-danger/30 bg-danger/10 p-4 text-sm">
          Caixa vulnerável: sua reserva ainda está abaixo do mínimo de segurança ({formatBRL(safety)}).
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card label="Atual" value={formatBRL(current)} />
        <Card label="Meta principal" value={formatBRL(target)} />
        <Card label="Restante" value={formatBRL(remaining)} />
        <Card label="Meses cobertos (est.)" value={monthsCovered.toFixed(2)} />
      </div>

      <div className="glass-card rounded-2xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <PiggyBank className="size-4 text-primary" />
          <span className="font-semibold">Progresso {pct}%</span>
        </div>
        <div className="h-2 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "var(--gradient-primary)" }} />
        </div>
        <div className="text-xs text-muted-foreground mt-2">
          Meta de segurança: {formatBRL(safety)} ({Math.min(100, Math.round((current / safety) * 100))}%)
        </div>
      </div>

      <div className="glass-card rounded-2xl p-5 space-y-3">
        <h3 className="font-semibold">Movimentar</h3>
        <div className="flex gap-2">
          <button
            className={`px-3 py-1.5 rounded-lg text-xs border ${type === "deposit" ? "border-primary bg-primary/15" : "border-border"}`}
            onClick={() => setType("deposit")}
          >
            Depositar
          </button>
          <button
            className={`px-3 py-1.5 rounded-lg text-xs border ${type === "withdraw" ? "border-primary bg-primary/15" : "border-border"}`}
            onClick={() => setType("withdraw")}
          >
            Retirar
          </button>
        </div>
        <input
          className="w-full bg-white/[0.03] border border-border rounded-xl px-3 py-2 text-sm"
          placeholder="Valor"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
        />
        <input
          className="w-full bg-white/[0.03] border border-border rounded-xl px-3 py-2 text-sm"
          placeholder="Motivo"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
        <button
          disabled={move.isPending}
          onClick={() => move.mutate()}
          className="w-full py-2.5 rounded-xl font-semibold text-primary-foreground"
          style={{ background: "var(--gradient-primary)" }}
        >
          {move.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Confirmar"}
        </button>
      </div>

      <div className="glass-card rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Histórico</h3>
        {(data.transactions || []).length === 0 && (
          <p className="text-sm text-muted-foreground">Nenhuma movimentação ainda.</p>
        )}
        <div className="space-y-2">
          {(data.transactions || []).map((t) => (
            <div key={t.id} className="flex justify-between text-sm border-b border-border py-2">
              <div>
                <div className="font-medium capitalize">{t.type === "deposit" ? "Depósito" : "Retirada"}</div>
                <div className="text-xs text-muted-foreground">
                  {formatDateBR(t.occurred_at)} {t.reason ? `· ${t.reason}` : ""}
                </div>
              </div>
              <div className={t.type === "deposit" ? "text-success font-semibold" : "text-danger font-semibold"}>
                {t.type === "deposit" ? "+" : "-"}
                {formatBRL(t.amount)}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass-card rounded-xl p-4">
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{label}</div>
      <div className="text-lg font-bold mt-1">{value}</div>
    </div>
  );
}
