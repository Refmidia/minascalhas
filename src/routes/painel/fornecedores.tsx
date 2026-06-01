import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { FornecedorPortalPage } from "@/components/admin/FornecedorPortalPage";
import { FornecedoresPage } from "@/components/admin/FornecedoresPage";

const searchSchema = z.object({
  status: z.enum(["enviado", "recebido", "todas"]).optional().catch(undefined),
  ver: z.coerce.number().optional().catch(undefined),
  controle: z.coerce.number().optional().catch(undefined),
  nota: z.coerce.number().optional().catch(undefined),
});

function FornecedoresRoutePage() {
  const { user } = useAdminAuth();
  if (user?.visao === "fornecedor") return <FornecedorPortalPage />;
  return <FornecedoresPage />;
}

export const Route = createFileRoute("/painel/fornecedores")({
  validateSearch: searchSchema,
  component: FornecedoresRoutePage,
});
