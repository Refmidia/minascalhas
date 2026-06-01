import { createFileRoute } from "@tanstack/react-router";

import { MateriaisPage } from "@/components/admin/MateriaisPage";

export const Route = createFileRoute("/painel/material")({
  component: MateriaisPage,
});
