import { createFileRoute } from "@tanstack/react-router";

import { consultarCnpjFornecedor } from "@/lib/consulta-cnpj.server";
import { isAdminRequest } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/consulta-cnpj")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);

        const url = new URL(request.url);
        const cnpj = url.searchParams.get("cnpj") ?? url.searchParams.get("documento") ?? "";
        const res = await consultarCnpjFornecedor(cnpj);

        if (!res.ok) {
          return jsonResponse({ status: "erro", mensagem: res.message }, 400);
        }

        return jsonResponse({
          status: "sucesso",
          dados: res.dados,
          fonte: res.fonte,
        });
      },
    },
  },
});
