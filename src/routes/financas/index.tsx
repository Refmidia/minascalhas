import { createFileRoute, redirect } from "@tanstack/react-router";
import { enterJoaoFinancas, getCurrentUser } from "@/lib/joao-financas/auth.functions";

export const Route = createFileRoute("/financas/")({
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
    throw redirect({
      to: user ? "/financas/dashboard" : "/painel/modulos",
      replace: true,
    });
  },
  component: () => null,
});
