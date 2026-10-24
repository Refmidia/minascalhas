import { Outlet, createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

/** Só via ?url no head — evita injetar o CSS do Finanças na home/painel. */
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

/** Remove CSS/classes do painel que bloqueiam o scroll e quebram o layout. */
function useStripForeignStyles() {
  useEffect(() => {
    const isForeign = (href: string) =>
      href.includes("bootstrap") ||
      href.includes("bootstrap-icons") ||
      href.includes("/admin/") ||
      href.includes("modulos-hub") ||
      href.includes("dashboard-saas") ||
      href.includes("painel.css");

    const unlockBody = () => {
      // Classes do painel: body.dashboard-app { overflow:hidden; height:100vh }
      document.body.classList.remove(
        "dashboard-app",
        "dashboard-app--react",
        "dashboard-sidebar-mini",
        "dashboard-has-visao-banner",
      );
      if (document.body.style.overflow) document.body.style.removeProperty("overflow");
      if (document.body.style.height) document.body.style.removeProperty("height");
      if (document.documentElement.style.overflow) {
        document.documentElement.style.removeProperty("overflow");
      }
      if (document.documentElement.style.height) {
        document.documentElement.style.removeProperty("height");
      }
    };

    const stripLinks = () => {
      document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
        const link = node as HTMLLinkElement;
        const href = link.href || "";
        if (!isForeign(href)) return;
        if (href.includes("joao-financas")) return;
        link.disabled = true;
        link.remove();
      });
    };

    stripLinks();
    unlockBody();
    document.documentElement.classList.add("jf-active");
    document.body.classList.add("jf-active");

    // Só observa o head (links CSS). Observar class/style no body causava loop infinito.
    const mo = new MutationObserver(() => {
      stripLinks();
      unlockBody();
    });
    mo.observe(document.head, { childList: true, subtree: true });

    return () => {
      mo.disconnect();
      document.documentElement.classList.remove("jf-active");
      document.body.classList.remove("jf-active");
    };
  }, []);
}

function FinancasLayout() {
  useStripForeignStyles();
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
