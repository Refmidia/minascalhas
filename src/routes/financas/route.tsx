import { Outlet, createFileRoute } from "@tanstack/react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Toaster } from "sonner";

import "@/joao-financas.css";
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

    const strip = () => {
      document.querySelectorAll('link[rel="stylesheet"]').forEach((node) => {
        const link = node as HTMLLinkElement;
        const href = link.href || "";
        if (!isForeign(href)) return;
        if (href.includes("joao-financas")) return;
        link.disabled = true;
        link.remove();
      });

      // Classes do painel: body.dashboard-app { overflow:hidden; height:100vh }
      document.body.classList.remove(
        "dashboard-app",
        "dashboard-app--react",
        "dashboard-sidebar-mini",
        "dashboard-has-visao-banner",
      );
      document.body.style.removeProperty("overflow");
      document.body.style.removeProperty("height");
      document.documentElement.style.removeProperty("overflow");
      document.documentElement.style.removeProperty("height");
    };

    strip();
    document.documentElement.classList.add("jf-active");
    document.body.classList.add("jf-active");

    const mo = new MutationObserver(() => strip());
    mo.observe(document.head, { childList: true, subtree: true });
    mo.observe(document.body, { attributes: true, attributeFilter: ["class", "style"] });

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
