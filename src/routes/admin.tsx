import { createFileRoute, redirect } from "@tanstack/react-router";

/** Favorito antigo `/admin` — o painel fica em `/painel`. */
export const Route = createFileRoute("/admin")({
  beforeLoad: () => {
    throw redirect({ to: "/painel" });
  },
});
