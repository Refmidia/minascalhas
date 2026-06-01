import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FornecedorInicioPage } from "@/components/admin/FornecedorInicioPage";

const searchSchema = z.object({
  controle: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/painel/inicio-fornecedor")({
  validateSearch: searchSchema,
  component: FornecedorInicioPage,
});
