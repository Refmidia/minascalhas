import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useMutation } from "@tanstack/react-query";
import { payBill } from "@/lib/joao-financas/bills.functions";
import { toast } from "sonner";
import { formatMoney } from "@/lib/joao-financas/format";
import { Check, ChevronDown, Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const methods = ["Pix", "Dinheiro", "Cartão", "Débito", "Transferência", "Boleto"];

export function PaymentModal({
  title,
  expectedAmount,
  currency = "BRL",
  monthlyBillId,
  debtId,
  installmentId,
  onClose,
  onSuccess,
  defaultDate,
}: {
  title: string;
  expectedAmount: number;
  currency?: string;
  monthlyBillId?: string;
  debtId?: string;
  installmentId?: string;
  onClose: () => void;
  onSuccess: () => void;
  defaultDate?: string;
}) {
  const [mounted, setMounted] = useState(false);
  const [amount, setAmount] = useState(String(expectedAmount));
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState("Pix");
  const [mode, setMode] = useState<"total" | "parcial">("total");
  const [showExtra, setShowExtra] = useState(false);
  const [account, setAccount] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const mutate = useMutation({
    mutationFn: async () => {
      const value = parseFloat(amount.replace(",", "."));
      if (!Number.isFinite(value) || value <= 0) throw new Error("Informe um valor válido");
      const isFull = mode === "total" || Math.abs(value - expectedAmount) < 0.01;
      await payBill({
        data: {
          monthlyBillId,
          debtId,
          installmentId,
          amount: value,
          payment_date: date,
          payment_method: method,
          account_used: account || null,
          notes: notes || null,
          is_full: isFull,
          idempotencyKey: `${monthlyBillId || installmentId || debtId}-${value}-${date}-${Date.now()}`,
        },
      });
    },
    onSuccess: () => {
      toast.success("Pagamento registrado ✓");
      onSuccess();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm border-0"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full sm:max-w-md rounded-t-3xl sm:rounded-3xl border border-border/80 shadow-2xl overflow-hidden"
        style={{ background: "var(--surface-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header com valor em destaque */}
        <div className="relative px-5 pt-5 pb-4 border-b border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Registrar pagamento
          </p>
          <h2 className="text-lg font-bold pr-8 leading-tight">{title}</h2>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums tracking-tight">
              {formatMoney(parseFloat(amount.replace(",", ".")) || expectedAmount, currency)}
            </span>
            {mode === "parcial" && (
              <span className="text-xs text-muted-foreground">
                de {formatMoney(expectedAmount, currency)}
              </span>
            )}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4 max-h-[60vh] overflow-y-auto">
          {/* Total vs Parcial */}
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-white/[0.04] border border-border/50">
            {(["total", "parcial"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMode(m);
                  if (m === "total") setAmount(String(expectedAmount));
                }}
                className={cn(
                  "py-2 rounded-lg text-sm font-medium transition-all",
                  mode === m
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {m === "total" ? "Pagamento total" : "Pagamento parcial"}
              </button>
            ))}
          </div>

          {mode === "parcial" && (
            <div>
              <label className="text-xs text-muted-foreground mb-1.5 block">Quanto pagou?</label>
              <input
                className="field text-lg font-semibold tabular-nums"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                autoFocus
              />
            </div>
          )}

          {/* Data do pagamento — sempre visível */}
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Data do pagamento</label>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          {/* Forma de pagamento — pills */}
          <div>
            <label className="text-xs text-muted-foreground mb-2 block">Como pagou?</label>
            <div className="flex flex-wrap gap-1.5">
              {methods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                    method === m
                      ? "border-primary bg-primary/20 text-foreground"
                      : "border-border/60 text-muted-foreground hover:border-border hover:text-foreground",
                  )}
                >
                  {m}
                </button>
              ))}
            </div>
          </div>

          {/* Opções extras colapsáveis */}
          <button
            type="button"
            onClick={() => setShowExtra(!showExtra)}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground w-full"
          >
            <ChevronDown className={cn("size-3.5 transition-transform", showExtra && "rotate-180")} />
            {showExtra ? "Menos opções" : "Conta e observação (opcional)"}
          </button>

          {showExtra && (
            <div className="space-y-3 pt-1">
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Conta usada</label>
                <input
                  className="field"
                  placeholder="Ex: Nubank, Inter..."
                  value={account}
                  onChange={(e) => setAccount(e.target.value)}
                />
              </div>
              <div>
                <label className="text-xs text-muted-foreground mb-1 block">Observação</label>
                <textarea
                  className="field resize-none"
                  rows={2}
                  placeholder="Opcional"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>
            </div>
          )}
        </div>

        {/* Botão principal */}
        <div className="px-5 pb-5 pt-2 border-t border-border/40">
          <button
            type="button"
            disabled={mutate.isPending}
            onClick={() => mutate.mutate()}
            className="w-full py-3.5 rounded-2xl font-semibold text-primary-foreground flex items-center justify-center gap-2 text-base"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutate.isPending ? (
              <Loader2 className="size-5 animate-spin" />
            ) : (
              <>
                <Check className="size-5" />
                Confirmar pagamento
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}

export type QuickPayTarget = {
  title: string;
  amount: number;
  currency?: string;
  monthlyBillId?: string;
  installmentId?: string;
  debtId?: string;
};

/** Confirmação rápida com controle de data */
export function QuickPayModal({
  target,
  defaultDate,
  onClose,
  onSuccess,
}: {
  target: QuickPayTarget;
  defaultDate?: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [mounted, setMounted] = useState(false);
  const [date, setDate] = useState(defaultDate || new Date().toISOString().slice(0, 10));

  useEffect(() => {
    setMounted(true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  const mutate = useMutation({
    mutationFn: async () => {
      if (target.monthlyBillId) {
        const { payBillQuick } = await import("@/lib/joao-financas/bills.functions");
        return payBillQuick({
          data: { monthlyBillId: target.monthlyBillId, payment_date: date },
        });
      }
      if (target.installmentId) {
        const { payInstallmentQuick } = await import("@/lib/joao-financas/bills.functions");
        return payInstallmentQuick({
          data: {
            installmentId: target.installmentId,
            debtId: target.debtId,
            payment_date: date,
          },
        });
      }
      throw new Error("Pagamento inválido");
    },
    onSuccess: () => {
      toast.success("Pagamento registrado ✓");
      onSuccess();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  if (!mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4">
      <button
        type="button"
        aria-label="Fechar"
        className="absolute inset-0 bg-black/80 backdrop-blur-sm border-0"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full sm:max-w-sm rounded-t-3xl sm:rounded-3xl border border-border/80 shadow-2xl overflow-hidden"
        style={{ background: "var(--surface-elevated)" }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-5 pt-5 pb-4 border-b border-border/60">
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-white/5"
          >
            <X className="size-4" />
          </button>
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-1">
            Confirmar pagamento
          </p>
          <h2 className="text-lg font-bold pr-8 leading-tight">{target.title}</h2>
          <div className="mt-2 text-2xl font-bold tabular-nums">
            {formatMoney(target.amount, target.currency || "BRL")}
          </div>
        </div>

        <div className="px-5 py-4 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1.5 block">Data do pagamento</label>
            <input
              className="field"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              autoFocus
            />
          </div>
        </div>

        <div className="px-5 pb-5 pt-2 border-t border-border/40 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-2xl border border-border text-sm font-medium"
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={mutate.isPending}
            onClick={() => mutate.mutate()}
            className="flex-1 py-3 rounded-2xl font-semibold text-primary-foreground flex items-center justify-center gap-2 text-sm"
            style={{ background: "var(--gradient-primary)" }}
          >
            {mutate.isPending ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <>
                <Check className="size-4" />
                Confirmar
              </>
            )}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
