import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";
import { enterJoaoFinancas, getCurrentUser } from "@/lib/joao-financas/auth.functions";
import { AppShell } from "@/components/joao-financas/app-shell";

export const Route = createFileRoute("/financas/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    let user = await getCurrentUser();
    if (!user) {
      try {
        user = await enterJoaoFinancas();
      } catch {
        throw redirect({ to: "/painel/modulos" });
      }
    }
    if (!user) {
      throw redirect({ to: "/painel/modulos" });
    }
    return { user };
  },
  component: AuthenticatedLayout,
});

function AuthenticatedLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}
