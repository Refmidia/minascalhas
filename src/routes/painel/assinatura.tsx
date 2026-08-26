import { createFileRoute } from "@tanstack/react-router";

import { AssinaturaPontoPage } from "@/components/admin/AssinaturaPontoPage";

export const Route = createFileRoute("/painel/assinatura")({
  component: AssinaturaPontoPage,
});
