import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { DashboardView } from "@/components/admin/DashboardView";

function PainelHome() {
  const { user, ready } = useAdminAuth();

  if (!ready) return null;

  if (user?.visao === "funcionário") {
    return <Navigate to="/painel/ponto" replace />;
  }
  if (user?.visao === "fornecedor") {
    const fid = user.fornecedorPreviewId;
    return (
      <Navigate
        to="/painel/inicio-fornecedor"
        search={fid > 0 ? { controle: fid } : {}}
        replace
      />
    );
  }

  return <DashboardView />;
}

export const Route = createFileRoute("/painel/")({
  component: PainelHome,
});
