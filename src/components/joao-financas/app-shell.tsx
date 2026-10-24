import { useEffect, useState, type ReactNode } from "react";
import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  Wallet,
  Target,
  Search,
  Menu,
  X,
  PiggyBank,
  Receipt,
  Plus,
  User,
  TrendingUp,
  TrendingDown,
  Calendar,
  BarChart3,
  Repeat,
} from "lucide-react";
import { Sidebar } from "./sidebar";
import { cn } from "@/lib/utils";
import { getProfile } from "@/lib/joao-financas/auth.functions";
import { searchFinance } from "@/lib/joao-financas/finance.functions";
import { useQuery } from "@tanstack/react-query";
import { formatMoney, num } from "@/lib/joao-financas/format";
import { BrandLogo } from "@/components/joao-financas/brand-logo";

const mobileNav = [
  { to: "/financas/dashboard", label: "Início", icon: LayoutDashboard },
  { to: "/financas/contas-do-mes", label: "Contas", icon: Receipt },
  { to: "__add__", label: "Adicionar", icon: Plus },
  { to: "/financas/dividas", label: "Dívidas", icon: Wallet },
  { to: "/financas/metas", label: "Perfil", icon: User },
] as const;

const drawerNav = [
  { to: "/financas/dashboard", label: "Visão geral", icon: LayoutDashboard },
  { to: "/financas/contas-do-mes", label: "Contas do mês", icon: Receipt },
  { to: "/financas/dividas", label: "Dívidas", icon: Wallet },
  { to: "/financas/receitas", label: "Receitas", icon: TrendingUp },
  { to: "/financas/gastos", label: "Despesas", icon: TrendingDown },
  { to: "/financas/calendario", label: "Calendário", icon: Calendar },
  { to: "/financas/reserva", label: "Reserva", icon: PiggyBank },
  { to: "/financas/metas", label: "Metas", icon: Target },
  { to: "/financas/relatorios", label: "Relatórios", icon: BarChart3 },
  { to: "/financas/plano-quitacao", label: "Plano de quitação", icon: Target },
  { to: "/financas/contas-recorrentes", label: "Contas mensais", icon: Repeat },
] as const;

function useDisplayName() {
  return useQuery({
    queryKey: ["profile"],
    queryFn: async () => {
      const profile = await getProfile();
      return profile.displayName || "";
    },
  });
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [q, setQ] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const { data: name } = useDisplayName();
  const navigate = useNavigate();

  const { data: results } = useQuery({
    queryKey: ["search", q],
    queryFn: () => searchFinance({ data: { q } }),
    enabled: q.trim().length >= 2,
  });

  useEffect(() => {
    setMobileOpen(false);
    setSearchOpen(false);
    setAddOpen(false);
  }, [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setSearchOpen(true);
        (document.getElementById("global-search") as HTMLInputElement | null)?.focus();
      }
      if (e.key === "Escape") {
        setSearchOpen(false);
        setAddOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string) => {
    setSearchOpen(false);
    setAddOpen(false);
    setQ("");
    navigate({ to });
  };

  return (
    <div className="min-h-dvh bg-background text-foreground relative overflow-x-clip">
      <div className="pointer-events-none fixed inset-0 -z-10 opacity-40" style={{ background: "var(--gradient-glow)" }} aria-hidden />
      <Sidebar />

      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={() => setMobileOpen(false)}>
          <div className="absolute left-0 top-0 h-full w-[min(85vw,16rem)] bg-sidebar border-r border-border p-5 overflow-y-auto pb-safe" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-8">
              <BrandLogo to="/financas/dashboard" imageClassName="h-7" />
              <button onClick={() => setMobileOpen(false)}><X className="size-5" /></button>
            </div>
            <nav className="space-y-1">
              {drawerNav.map(({ to, label, icon: Icon }) => (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2 rounded-lg text-sm",
                    pathname === to || (to !== "/dashboard" && pathname.startsWith(to))
                      ? "bg-white/10 text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-4" />
                  {label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      )}

      {addOpen && (
        <div className="jf-sheet" onClick={() => setAddOpen(false)} role="dialog" aria-modal="true" aria-label="Novo lançamento">
          <div className="jf-sheet__backdrop" aria-hidden />
          <div className="jf-sheet__panel" onClick={(e) => e.stopPropagation()}>
            <div className="jf-sheet__head">
              <h2 className="jf-sheet__title">Novo lançamento</h2>
              <button type="button" className="jf-sheet__close" onClick={() => setAddOpen(false)} aria-label="Fechar">
                <X className="size-4" />
              </button>
            </div>
            <p className="jf-sheet__hint">Escolha o que deseja registrar</p>
            <div className="jf-sheet__list">
              {[
                { to: "/financas/receitas", label: "Receita", desc: "Salário, freela, entrada", icon: TrendingUp },
                { to: "/financas/gastos", label: "Despesa", desc: "Gasto do dia a dia", icon: TrendingDown },
                { to: "/financas/contas-do-mes", label: "Pagamento", desc: "Conta do mês a pagar", icon: Receipt },
                { to: "/financas/contas-recorrentes", label: "Conta mensal", desc: "Conta que se repete", icon: Repeat },
                { to: "/financas/dividas", label: "Dívida", desc: "Parcelas e credores", icon: Wallet },
                { to: "/financas/reserva", label: "Reserva", desc: "Depósito na emergência", icon: PiggyBank },
              ].map(({ to, label, desc, icon: Icon }) => (
                <button key={label} type="button" className="jf-sheet__item" onClick={() => go(to)}>
                  <span className="jf-sheet__item-icon" aria-hidden>
                    <Icon className="size-4" />
                  </span>
                  <span className="jf-sheet__item-text">
                    <strong>{label}</strong>
                    <small>{desc}</small>
                  </span>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <main className="jf-main relative">
        <header className="sticky top-0 z-30 bg-background/70 backdrop-blur-xl border-b border-border pt-safe">
          <div className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 md:px-8 h-14 min-h-[3.5rem]">
            <button
              type="button"
              className="lg:hidden p-2.5 -ml-1 rounded-lg hover:bg-white/[0.05] shrink-0"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="size-5" />
            </button>

            <BrandLogo to="/financas/dashboard" variant="icon" className="lg:hidden shrink-0" imageClassName="size-8" />

            <div className="relative flex-1 min-w-0 max-w-md">
              <Search className="size-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
              <input
                id="global-search"
                type="search"
                enterKeyHint="search"
                autoComplete="off"
                value={q}
                onChange={(e) => {
                  setQ(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                placeholder="Buscar…"
                className="w-full bg-surface/60 border border-border rounded-xl pl-9 pr-3 md:pr-16 py-2.5 text-base md:text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
              />
              <kbd className="hidden md:inline absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground bg-white/5 border border-border rounded px-1.5 py-0.5 font-mono">
                Ctrl K
              </kbd>

              {searchOpen && q.trim().length >= 2 && (
                <div className="absolute top-full mt-2 inset-x-0 glass-card rounded-xl border border-border p-2 max-h-80 overflow-y-auto z-50">
                  {!results && <div className="text-xs text-muted-foreground p-2">Buscando...</div>}
                  {results &&
                    [
                      ...results.debts.map((d) => ({
                        key: `d-${d.id}`,
                        label: d.creditor,
                        meta: `Dívida · ${formatMoney(num(d.total_amount) - num(d.paid_amount), d.currency || "BRL")}`,
                        to: `/financas/dividas/${d.id}`,
                      })),
                      ...results.incomes.map((i) => ({
                        key: `i-${i.id}`,
                        label: i.description,
                        meta: `Receita · ${formatMoney(i.amount, "BRL")}`,
                        to: "/financas/receitas",
                      })),
                      ...results.expenses.map((e) => ({
                        key: `e-${e.id}`,
                        label: e.description,
                        meta: `Despesa · ${formatMoney(e.amount, "BRL")}`,
                        to: "/financas/gastos",
                      })),
                      ...results.goals.map((g) => ({
                        key: `g-${g.id}`,
                        label: g.title,
                        meta: `Meta · ${formatMoney(g.current_amount, "BRL")}`,
                        to: "/financas/metas",
                      })),
                      ...results.recurring.map((r) => ({
                        key: `r-${r.id}`,
                        label: r.name,
                        meta: `Conta · ${formatMoney(r.amount, "BRL")}`,
                        to: "/financas/contas-do-mes",
                      })),
                    ].length === 0 && (
                      <div className="text-xs text-muted-foreground p-2">Nenhum resultado</div>
                    )}
                  {results &&
                    [
                      ...results.debts.map((d) => ({
                        key: `d-${d.id}`,
                        label: d.creditor,
                        meta: `Dívida · ${formatMoney(num(d.total_amount) - num(d.paid_amount), d.currency || "BRL")}`,
                        to: `/financas/dividas/${d.id}`,
                      })),
                      ...results.incomes.map((i) => ({
                        key: `i-${i.id}`,
                        label: i.description,
                        meta: `Receita · ${formatMoney(i.amount, "BRL")}`,
                        to: "/financas/receitas",
                      })),
                      ...results.expenses.map((e) => ({
                        key: `e-${e.id}`,
                        label: e.description,
                        meta: `Despesa · ${formatMoney(e.amount, "BRL")}`,
                        to: "/financas/gastos",
                      })),
                      ...results.goals.map((g) => ({
                        key: `g-${g.id}`,
                        label: g.title,
                        meta: `Meta · ${formatMoney(g.current_amount, "BRL")}`,
                        to: "/financas/metas",
                      })),
                      ...results.recurring.map((r) => ({
                        key: `r-${r.id}`,
                        label: r.name,
                        meta: `Conta · ${formatMoney(r.amount, "BRL")}`,
                        to: "/financas/contas-do-mes",
                      })),
                    ].map((item) => (
                      <button
                        key={item.key}
                        onClick={() => go(item.to)}
                        className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/[0.05]"
                      >
                        <div className="text-sm font-medium truncate">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.meta}</div>
                      </button>
                    ))}
                </div>
              )}
            </div>

            <div className="ml-auto flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setAddOpen(true)}
                className="md:hidden inline-flex items-center justify-center size-10 rounded-xl text-primary-foreground shrink-0"
                style={{ background: "var(--gradient-primary)" }}
                aria-label="Novo lançamento"
              >
                <Plus className="size-4" />
              </button>
              <button
                onClick={() => setAddOpen(true)}
                className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold text-primary-foreground"
                style={{ background: "var(--gradient-primary)" }}
              >
                <Plus className="size-3.5" /> Novo
              </button>
              <div
                onClick={() => navigate({ to: "/financas/dashboard" })}
                className="hidden md:flex items-center gap-2 pr-2 pl-3 py-1 rounded-full bg-white/5 border border-border cursor-pointer"
              >
                <div className="size-2 rounded-full bg-success animate-pulse" />
                <span className="text-xs text-muted-foreground">
                  Olá, <span className="text-foreground font-medium">{name || "…"}</span>
                </span>
              </div>
            </div>
          </div>
        </header>

        <div className="jf-content px-3 sm:px-4 md:px-6 lg:px-8 py-4 md:py-6 w-full max-w-[1400px] mx-auto relative z-10 animate-fade-up">
          {children}
        </div>

        <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 bg-background/95 backdrop-blur-xl border-t border-border pb-safe px-safe">
          <div className="grid grid-cols-5">
            {mobileNav.map(({ to, label, icon: Icon }) => {
              if (to === "__add__") {
                return (
                  <button
                    key="add"
                    type="button"
                    onClick={() => setAddOpen(true)}
                    className="flex flex-col items-center justify-center gap-0.5 min-h-[3.25rem] py-1 text-[10px] text-primary"
                    aria-label="Adicionar"
                  >
                    <span
                      className="size-9 -mt-4 rounded-full grid place-items-center text-primary-foreground shadow-lg"
                      style={{ background: "var(--gradient-primary)" }}
                    >
                      <Plus className="size-4" />
                    </span>
                    <span className="sr-only sm:not-sr-only">{label}</span>
                  </button>
                );
              }
              const active = pathname === to || (to !== "/dashboard" && pathname.startsWith(to));
              return (
                <Link
                  key={to}
                  to={to}
                  className={cn(
                    "flex flex-col items-center justify-center gap-1 min-h-[3.25rem] py-2 text-[10px] font-medium",
                    active ? "text-primary" : "text-muted-foreground",
                  )}
                >
                  <Icon className="size-5" />
                  {label}
                </Link>
              );
            })}
          </div>
        </nav>
        <div className="lg:hidden h-[calc(4.5rem+env(safe-area-inset-bottom,0px))]" />
      </main>
    </div>
  );
}
