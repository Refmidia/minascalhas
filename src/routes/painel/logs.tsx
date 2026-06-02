import { createFileRoute } from "@tanstack/react-router";

import { LogsPage } from "@/components/admin/LogsPage";

export const Route = createFileRoute("/painel/logs")({
  component: LogsPage,
});
