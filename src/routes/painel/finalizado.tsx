import { createFileRoute } from "@tanstack/react-router";



import { InventarioPage } from "@/components/admin/InventarioPage";



export const Route = createFileRoute("/painel/finalizado")({

  component: () => <InventarioPage variant="finalizado" />,

});

