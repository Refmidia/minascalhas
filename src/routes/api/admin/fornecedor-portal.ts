import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest } from "@/lib/auth.server";
import { fornecedorDashNomeEmpresa, resolverFornecedorIdSessao } from "@/lib/fornecedor-dashboard.server";
import {
  listarEntregasAdmin,
  listarFornecedores,
  obterEntregaCompleta,
} from "@/lib/fornecedores.server";
import { jsonResponse } from "@/lib/http.server";

export const Route = createFileRoute("/api/admin/fornecedor-portal")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || session.visao !== "fornecedor") {
          return jsonResponse({ ok: false, message: "Disponível na visão fornecedor." }, 403);
        }

        const url = new URL(request.url);
        const controleQuery = Number(url.searchParams.get("controle") ?? 0);
        const ver = Number.parseInt(url.searchParams.get("ver") ?? "", 10);
        let status = url.searchParams.get("status") ?? "todas";
        if (!["enviado", "recebido", "todas"].includes(status)) status = "todas";

        try {
          const fornecedorId = await resolverFornecedorIdSessao(session, controleQuery);
          if (fornecedorId <= 0) {
            return jsonResponse({
              ok: true,
              fornecedor_id: 0,
              erro: "sem_vinculo",
              entregas: [],
            });
          }

          if (ver > 0) {
            const entrega = await obterEntregaCompleta(ver);
            if (!entrega || entrega.fornecedor_id !== fornecedorId) {
              return jsonResponse({ ok: false, message: "Entrega não encontrada." }, 404);
            }
            return jsonResponse({ ok: true, fornecedor_id: fornecedorId, entrega });
          }

          const filtro =
            status === "enviado" ? "enviado" : status === "recebido" ? "recebido" : "todas";
          const entregas = await listarEntregasAdmin(filtro, fornecedorId);
          const fornecedores = await listarFornecedores();
          const fornecedor = fornecedores.find((f) => f.id === fornecedorId) ?? null;
          const nomeEmpresa =
            fornecedor?.nome_fantasia || fornecedor?.razao_social || (await fornecedorDashNomeEmpresa(fornecedorId));

          return jsonResponse({
            ok: true,
            fornecedor_id: fornecedorId,
            nome_empresa: nomeEmpresa,
            fornecedor,
            entregas,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
