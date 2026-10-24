import { createFileRoute, Navigate, Outlet, useRouterState } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import { AdminAuthProvider, useAdminAuth } from "@/components/admin/admin-auth";
import { AdminShell } from "@/components/admin/AdminShell";
import { AdminTheme } from "@/components/admin/AdminTheme";
import { DashUiProvider } from "@/components/admin/DashUiProvider";

export const Route = createFileRoute("/painel")({
  head: () => ({
    meta: [
      { title: "Painel — Minas Calhas" },
      { name: "robots", content: "noindex" },
    ],
    links: [
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css",
      },
      {
        rel: "stylesheet",
        href: "https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css",
      },
      { rel: "stylesheet", href: "/admin/painel.css" },
      { rel: "stylesheet", href: "/admin/dashboard-saas.css" },
      { rel: "stylesheet", href: "/admin/admin-react.css" },
    ],
  }),
  component: PainelLayout,
});

function PainelLayout() {
  return (
    <AdminAuthProvider>
      <AdminTheme />
      <DashUiProvider>
        <PainelGate />
      </DashUiProvider>
    </AdminAuthProvider>
  );
}

function PainelGate() {
  const { ready, authenticated, refreshSession } = useAdminAuth();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [devLogin, setDevLogin] = useState<"idle" | "tentando" | "feito">(
    import.meta.env.DEV ? "idle" : "feito",
  );

  useEffect(() => {
    if (!ready || authenticated || devLogin !== "idle") return;
    setDevLogin("tentando");
    fetch("/api/admin/dev-login", { method: "POST", credentials: "include" })
      .then(async (res) => {
        if (res.ok) await refreshSession();
      })
      .catch(() => undefined)
      .finally(() => setDevLogin("feito"));
  }, [ready, authenticated, devLogin, refreshSession]);

  if (!ready || (!authenticated && devLogin !== "feito")) {
    return (
      <main className="min-h-screen grid place-items-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} aria-label="Carregando" />
      </main>
    );
  }

  if (!authenticated) {
    return <Navigate to="/" search={{ painel: "login" }} replace />;
  }

  // Tela de módulos: full-bleed sem sidebar do painel.
  if (pathname === "/painel/modulos" || pathname.startsWith("/painel/modulos/")) {
    return <Outlet />;
  }

  return <AdminShell />;
}
