import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { saveSplits } from "@/lib/joao-financas/bills.functions";
import { toast } from "sonner";
import { formatBRL } from "@/lib/joao-financas/format";
import { Loader2 } from "lucide-react";
import { FieldInput, FieldLabel, FormModal } from "@/components/joao-financas/form-modal";

type Bundle = "utilities_650" | "fuel_food_1000";

const configs: Record<Bundle, { title: string; total: number; items: string[] }> = {
  utilities_650: {
    title: "Distribuir valor de R$ 650,00",
    total: 650,
    items: ["Internet", "Água", "Energia"],
  },
  fuel_food_1000: {
    title: "Distribuir valor de R$ 1.000,00",
    total: 1000,
    items: ["Combustível", "Alimentação"],
  },
};

export function BudgetSplitModal({
  bundleKey,
  onClose,
  onSuccess,
}: {
  bundleKey: Bundle;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const cfg = configs[bundleKey];
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(cfg.items.map((n) => [n, ""])),
  );

  const sum = cfg.items.reduce((a, n) => {
    const v = parseFloat((values[n] || "0").replace(",", "."));
    return a + (Number.isFinite(v) ? v : 0);
  }, 0);
  const ok = Math.abs(sum - cfg.total) < 0.01;

  const mutate = useMutation({
    mutationFn: async () => {
      const items = cfg.items.map((name) => ({
        name,
        amount: parseFloat((values[name] || "0").replace(",", ".")),
      }));
      await saveSplits({ data: { bundleKey, items } });
    },
    onSuccess: () => {
      toast.success("Valores distribuídos com sucesso");
      onSuccess();
      onClose();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  return (
    <FormModal title={cfg.title} onClose={onClose}>
      <p className="text-sm text-muted-foreground">
        Informe o valor de cada item. A soma deve ser exatamente {formatBRL(cfg.total)}.
      </p>
      {cfg.items.map((name) => (
        <div key={name}>
          <FieldLabel>{name}</FieldLabel>
          <FieldInput
            inputMode="decimal"
            placeholder="0,00"
            value={values[name]}
            onChange={(e) => setValues({ ...values, [name]: e.target.value })}
          />
        </div>
      ))}
      <div className={`text-sm ${ok ? "text-success" : "text-warning"}`}>
        Soma atual: {formatBRL(sum)} {ok ? "✓" : `(faltam ${formatBRL(cfg.total - sum)})`}
      </div>
      <div className="flex gap-2 pt-1">
        <button type="button" className="flex-1 py-2.5 rounded-xl border border-border" onClick={onClose}>
          Cancelar
        </button>
        <button
          type="button"
          disabled={!ok || mutate.isPending}
          onClick={() => mutate.mutate()}
          className="flex-1 py-2.5 rounded-xl font-semibold text-primary-foreground disabled:opacity-50"
          style={{ background: "var(--gradient-primary)" }}
        >
          {mutate.isPending ? <Loader2 className="size-4 animate-spin mx-auto" /> : "Confirmar"}
        </button>
      </div>
    </FormModal>
  );
}
