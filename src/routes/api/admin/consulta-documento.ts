import { createFileRoute } from "@tanstack/react-router";

import { consultarDocumento } from "@/lib/consulta-cnpj.server";
import { isAdminRequest } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/consulta-documento")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);

        const url = new URL(request.url);
        const documento = url.searchParams.get("documento") ?? url.searchParams.get("doc") ?? "";
        const payload = await consultarDocumento(documento);
        const code = payload.status === "sucesso" ? 200 : 400;
        return jsonResponse(payload, code);
      },
    },
  },
});
