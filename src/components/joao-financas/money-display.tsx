import { useQuery } from "@tanstack/react-query";
import { formatBRL, formatMoney, num } from "@/lib/joao-financas/format";
import { getUsdBrlRateFn } from "@/lib/joao-financas/exchange-rate.functions";
import { cn } from "@/lib/utils";

/** Valor na moeda original + conversão BRL quando USD. */
export function MoneyDisplay({
  value,
  currency = "BRL",
  className,
  subClassName,
  showConversion = true,
  inline = false,
}: {
  value: number | string | null | undefined;
  currency?: string;
  className?: string;
  subClassName?: string;
  showConversion?: boolean;
  inline?: boolean;
}) {
  const isUsd = (currency || "BRL") === "USD";
  const amount = num(value);

  const { data: fx } = useQuery({
    queryKey: ["usd-brl-rate"],
    queryFn: () => getUsdBrlRateFn(),
    enabled: isUsd && showConversion,
    staleTime: 60 * 60 * 1000,
    retry: 2,
  });

  const brlEstimate = fx ? num(amount) * fx.rate : null;

  if (!isUsd || !showConversion) {
    return (
      <span className={cn("tabular-nums", className)}>
        {formatMoney(value, currency || "BRL")}
      </span>
    );
  }

  return (
    <span className={cn(inline ? "inline-flex flex-wrap items-baseline gap-x-2" : "inline-flex flex-col", className)}>
      <span className="tabular-nums font-[inherit]">{formatMoney(value, "USD")}</span>
      {brlEstimate != null && (
        <span className={cn("text-xs text-muted-foreground font-normal tabular-nums", subClassName)}>
          ≈ {formatBRL(brlEstimate)}
          <span className="opacity-70"> · {formatBRL(fx!.rate)}/USD</span>
        </span>
      )}
    </span>
  );
}

/** Linha compacta só com cotação (ex.: rodapé do painel). */
export function ExchangeRateHint() {
  const { data: fx, isLoading } = useQuery({
    queryKey: ["usd-brl-rate"],
    queryFn: () => getUsdBrlRateFn(),
    staleTime: 60 * 60 * 1000,
  });

  if (isLoading) return null;
  if (!fx) return null;

  return (
    <p className="text-[10px] text-muted-foreground">
      Cotação USD/BRL: {formatBRL(fx.rate)} · atualizada via AwesomeAPI
    </p>
  );
}
