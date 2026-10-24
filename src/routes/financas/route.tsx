import { Outlet, createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import { Toaster } from "sonner";

import joaoFinancasCss from "@/joao-financas.css?url";

export const Route = createFileRoute("/financas")({
  head: () => ({
    meta: [
      { title: "João Finanças — Painel financeiro" },
      { name: "robots", content: "noindex" },
      { name: "theme-color", content: "#0f0f13" },
    ],
    links: [{ rel: "stylesheet", href: joaoFinancasCss }],
  }),
  component: FinancasLayout,
});

function FinancasLayout() {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 30_000, retry: 1 },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <div className="dark jf-root min-h-dvh bg-background text-foreground">
        <Outlet />
        <Toaster theme="dark" position="top-right" richColors closeButton />
      </div>
    </QueryClientProvider>
  );
}
