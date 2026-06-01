import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ProdutosPage } from "@/components/admin/ProdutosPage";

const searchSchema = z.object({
  editar: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/painel/produtos")({
  validateSearch: searchSchema,
  component: ProdutosPage,
});
