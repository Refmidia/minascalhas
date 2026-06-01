import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { ClientesPage } from "@/components/admin/ClientesPage";

const searchSchema = z.object({
  ver: z.coerce.number().optional().catch(undefined),
  pag: z.coerce.number().optional().catch(undefined),
  q: z.string().optional(),
});

export const Route = createFileRoute("/painel/clientes")({
  validateSearch: searchSchema,
  component: ClientesPage,
});
