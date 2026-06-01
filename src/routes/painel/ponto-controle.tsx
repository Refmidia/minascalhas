import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { PontoControlePage } from "@/components/admin/PontoControlePage";

const searchSchema = z.object({
  usuario: z.coerce.number().optional().catch(undefined),
  de: z.string().optional(),
  ate: z.string().optional(),
});

export const Route = createFileRoute("/painel/ponto-controle")({
  validateSearch: searchSchema,
  component: PontoControlePage,
});
