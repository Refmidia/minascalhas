import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ProdutosGaleriaPage } from "@/components/admin/ProdutosGaleriaPage";

const searchSchema = z.object({
  produto: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/painel/produtos-galeria")({
  validateSearch: searchSchema,
  component: ProdutosGaleriaPage,
});
