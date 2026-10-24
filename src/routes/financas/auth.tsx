import { createFileRoute, redirect } from "@tanstack/react-router";
import { enterJoaoFinancas, getCurrentUser } from "@/lib/joao-financas/auth.functions";

/** Login próprio removido: o módulo abre via SSO do painel (admin João). */
export const Route = createFileRoute("/financas/auth")({
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
    throw redirect({ to: "/financas/dashboard", replace: true });
  },
  component: () => null,
});
