import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FuncionariosPage } from "@/components/admin/FuncionariosPage";

const searchSchema = z.object({
  semana: z.string().optional(),
  de: z.string().optional(),
  ate: z.string().optional(),
  usuario: z.coerce.number().optional().catch(undefined),
  funcionario: z.coerce.number().optional().catch(undefined),
});

export const Route = createFileRoute("/painel/funcionarios")({
  validateSearch: searchSchema,
  component: FuncionariosPage,
});
