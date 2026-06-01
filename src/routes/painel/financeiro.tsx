import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { FinanceiroPage } from "@/components/admin/FinanceiroPage";

const searchSchema = z.object({
  ano: z.coerce.number().optional().catch(undefined),
  desde: z.string().optional(),
});

export const Route = createFileRoute("/painel/financeiro")({
  validateSearch: searchSchema,
  component: FinanceiroPage,
});
