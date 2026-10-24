import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getCalendar } from "@/lib/joao-financas/finance.functions";
import type { CalendarEvent } from "@/lib/joao-financas/finance.types";
import { calendarEventLink } from "@/lib/joao-financas/calendar-links";
import { formatMoney, formatDateBR, daysUntil } from "@/lib/joao-financas/format";
import { labelPriority, labelStatus } from "@/lib/joao-financas/labels";
import { cn } from "@/lib/utils";
import { CalendarClock, ChevronRight } from "lucide-react";

export const Route = createFileRoute("/financas/_authenticated/calendario")({
  head: () => ({
    meta: [{ title: "Calendário - João Finanças" }],
  }),
  component: CalendarPage,
});

type Filter =
  | "all"
  | "hoje"
  | "amanha"
  | "7d"
  | "15d"
  | "mes"
  | "vencidos"
  | "pagos"
  | "brl"
  | "usd"
  | "alta";

const kindLabel: Record<string, string> = {
  debt: "Dívida",
  recurring: "Recorrente",
  income: "Receita",
  installment: "Parcela",
  payment: "Pagamento",
};

function CalendarPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["calendar"],
    queryFn: () => getCalendar(),
  });
  const [filter, setFilter] = useState<Filter>("all");

  const filtered = useMemo(() => {
    const events = data || [];
    return events.filter((e) => {
      const days = daysUntil(e.date);
      if (filter === "hoje") return days === 0;
      if (filter === "amanha") return days === 1;
      if (filter === "7d") return days != null && days >= 0 && days <= 7;
      if (filter === "15d") return days != null && days >= 0 && days <= 15;
      if (filter === "mes") return days != null && days >= 0 && days <= 31;
      if (filter === "vencidos") return days != null && days < 0 && e.status !== "pago";
      if (filter === "pagos") return e.status === "pago" || e.kind === "payment";
      if (filter === "brl") return e.currency === "BRL";
      if (filter === "usd") return e.currency === "USD";
      if (filter === "alta") return e.priority === "alta" || e.priority === "essencial";
      return true;
    });
  }, [data, filter]);

  const tone = (e: (typeof filtered)[0]) => {
    if (e.status === "pago" || e.kind === "payment") return "text-success border-success/30";
    if (e.kind === "income") return "text-blue-400 border-blue-400/30";
    const days = daysUntil(e.date);
    if (days != null && days < 0) return "text-danger border-danger/30";
    if (days != null && days <= 3) return "text-orange-400 border-orange-400/30";
    if (days != null && days <= 7) return "text-warning border-warning/30";
    return "text-foreground border-border";
  };

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "Todos" },
    { id: "hoje", label: "Hoje" },
    { id: "amanha", label: "Amanhã" },
    { id: "7d", label: "7 dias" },
    { id: "15d", label: "15 dias" },
    { id: "mes", label: "Este mês" },
    { id: "vencidos", label: "Vencidos" },
    { id: "pagos", label: "Pagos" },
    { id: "brl", label: "BRL" },
    { id: "usd", label: "USD" },
    { id: "alta", label: "Alta prioridade" },
  ];

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Calendário financeiro</h1>
        <p className="text-sm text-muted-foreground">
          Dívidas, recorrentes, parcelas e receitas previstas.
        </p>
      </header>

      <div className="flex flex-wrap gap-2">
        {filters.map((f) => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs border",
              filter === f.id ? "border-primary bg-primary/15" : "border-border text-muted-foreground",
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}

      {!isLoading && filtered.length === 0 && (
        <div className="glass-card rounded-2xl p-10 text-center">
          <CalendarClock className="size-8 mx-auto text-muted-foreground mb-3" />
          <p className="font-semibold">Nenhum evento neste filtro</p>
        </div>
      )}

      <div className="space-y-2">
        {filtered.map((e) => (
          <CalendarEventCard key={e.id} event={e} tone={tone(e)} />
        ))}
      </div>
    </div>
  );
}

function CalendarEventCard({
  event: e,
  tone,
}: {
  event: CalendarEvent;
  tone: string;
}) {
  const link = calendarEventLink(e);
  const inner = (
    <>
      <div className="min-w-0 flex-1">
        <div className="font-medium truncate">{e.title}</div>
        <div className="text-[11px] opacity-80 mt-0.5">
          {formatDateBR(e.date)} · {kindLabel[e.kind] || e.kind} · {e.category} ·{" "}
          {labelPriority(e.priority)} · {labelStatus(e.status)}
        </div>
      </div>
      <div className="font-semibold tabular-nums shrink-0">{formatMoney(e.amount, e.currency)}</div>
      {link && <ChevronRight className="size-4 shrink-0 opacity-40" />}
    </>
  );

  const className = cn(
    "glass-card rounded-xl p-4 border flex items-center justify-between gap-3",
    tone,
    link && "hover:bg-white/[0.04] transition-colors cursor-pointer group",
  );

  if (!link) {
    return <div className={className}>{inner}</div>;
  }

  if ("params" in link) {
    return (
      <Link to={link.to} params={link.params} className={className}>
        {inner}
      </Link>
    );
  }

  return (
    <Link to={link.to} className={className}>
      {inner}
    </Link>
  );
}
