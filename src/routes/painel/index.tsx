import { createFileRoute } from "@tanstack/react-router";

import { DashboardView } from "@/components/admin/DashboardView";

export const Route = createFileRoute("/painel/")({
  component: DashboardView,
});
