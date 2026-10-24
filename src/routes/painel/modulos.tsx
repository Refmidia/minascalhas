import { createFileRoute, Navigate } from "@tanstack/react-router";

import { useAdminAuth } from "@/components/admin/admin-auth";
import { ModulosHubPage } from "@/components/admin/ModulosHubPage";
import { ehJoaoAdmin } from "@/lib/visao-acesso";

function ModulosGate() {
  const { user, ready } = useAdminAuth();

  if (!ready) return null;

  // Hub só para o admin João; demais papéis seguem para o destino do perfil.
  if (!user || user.visao !== "admin" || !ehJoaoAdmin(user)) {
    if (user?.visao === "funcionário") return <Navigate to="/painel/ponto" replace />;
    if (user?.visao === "contador") return <Navigate to="/painel/ponto-controle" replace />;
    if (user?.visao === "fornecedor") {
      const fid = user.fornecedorPreviewId;
      return (
        <Navigate to="/painel/inicio-fornecedor" search={fid > 0 ? { controle: fid } : {}} replace />
      );
    }
    return <Navigate to="/painel" replace />;
  }

  return <ModulosHubPage />;
}

export const Route = createFileRoute("/painel/modulos")({
  head: () => ({
    meta: [{ title: "Módulos — Minas Calhas" }],
    links: [{ rel: "stylesheet", href: "/admin/modulos-hub.css" }],
  }),
  component: ModulosGate,
});
