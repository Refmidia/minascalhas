import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard,
  TrendingUp,
  TrendingDown,
  Wallet,
  Calendar,
  Target,
  LogOut,
  Sparkles,
  PiggyBank,
  Receipt,
  BarChart3,
  Repeat,
} from "lucide-react";
import { signOut } from "@/lib/joao-financas/auth.functions";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import { BrandLogo } from "@/components/joao-financas/brand-logo";

const nav = [
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

export function Sidebar() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const qc = useQueryClient();

  const handleSignOut = async () => {
    await qc.cancelQueries();
    qc.clear();
    await signOut();
    navigate({ to: "/painel/modulos", replace: true });
  };

  return (
    <aside className="jf-sidebar hidden lg:flex fixed left-0 top-0 h-full w-64 border-r border-border bg-sidebar/60 backdrop-blur-xl flex-col p-5 z-40">
      <BrandLogo to="/financas/dashboard" className="mb-8 px-2" imageClassName="h-9" />

      <nav className="flex-1 space-y-1 overflow-y-auto">
        {nav.map(({ to, label, icon: Icon }) => {
          const active =
            pathname === to ||
            (to !== "/financas/dashboard" && pathname.startsWith(to));
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all",
                active
                  ? "bg-white/[0.06] text-foreground shadow-inner"
                  : "text-muted-foreground hover:text-foreground hover:bg-white/[0.03]",
              )}
            >
              <Icon className={cn("size-4", active && "text-primary")} />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto space-y-3 pt-3">
        <div className="p-4 rounded-xl bg-primary/5 border border-primary/15">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="size-3.5 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Insight João</span>
          </div>
          <p className="text-xs text-foreground/80 leading-relaxed">
            Registre cada conta paga — clareza vem do hábito diário.
          </p>
        </div>
        <button
          onClick={handleSignOut}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-white/[0.03]"
        >
          <LogOut className="size-4" />
          Voltar aos módulos
        </button>
      </div>
    </aside>
  );
}
