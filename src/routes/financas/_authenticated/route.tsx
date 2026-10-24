import { createFileRoute, isRedirect, Outlet, redirect } from "@tanstack/react-router";
import { enterJoaoFinancas, getCurrentUser } from "@/lib/joao-financas/auth.functions";
import { AppShell } from "@/components/joao-financas/app-shell";

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} demorou demais`)), ms);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

export const Route = createFileRoute("/financas/_authenticated")({
  ssr: false,
  beforeLoad: async () => {
    try {
      let user = await withTimeout(getCurrentUser(), 8_000, "Sessão");
      if (!user) {
        user = await withTimeout(enterJoaoFinancas(), 12_000, "Entrada no João Finanças");
      }
      if (!user) {
        throw redirect({ to: "/painel/modulos" });
      }
      return { user };
    } catch (err) {
      if (isRedirect(err)) throw err;
      throw redirect({ to: "/painel/modulos" });
    }
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
