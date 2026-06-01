import { createFileRoute } from "@tanstack/react-router";

import { PontoPage } from "@/components/admin/PontoPage";

export const Route = createFileRoute("/painel/ponto")({
  component: PontoPage,
});
