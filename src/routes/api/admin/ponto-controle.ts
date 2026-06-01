import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest, podeGerenciarPonto } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";
import {
  apagarRegistroPonto,
  buscarRegistrosAdmin,
  listarFuncionariosPonto,
  montarJornadasAdmin,
} from "@/lib/ponto.server";

export const Route = createFileRoute("/api/admin/ponto-controle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeGerenciarPonto(session)) {
          return jsonResponse({ ok: false, message: "Sem permissão para controle de ponto." }, 403);
        }

        const url = new URL(request.url);
        const usuario = Number(url.searchParams.get("usuario") ?? 0);
        const hoje = new Date().toISOString().slice(0, 10);
        const primeiroMes = `${hoje.slice(0, 8)}01`;
        let de = url.searchParams.get("de")?.trim() || primeiroMes;
        let ate = url.searchParams.get("ate")?.trim() || hoje;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(de)) de = primeiroMes;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) ate = hoje;

        try {
          const funcionarios = await listarFuncionariosPonto();
          const registros = await buscarRegistrosAdmin(
            usuario > 0 ? usuario : null,
            de,
            ate,
          );
          const jornadas = montarJornadasAdmin(registros);
          return jsonResponse({
            ok: true,
            updated_at: new Date().toLocaleString("pt-BR"),
            funcionarios,
            registros,
            jornadas,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      DELETE: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeGerenciarPonto(session)) {
          return jsonResponse({ ok: false, message: "Sem permissão para excluir registros." }, 403);
        }

        const url = new URL(request.url);
        const id = Number(url.searchParams.get("id") ?? 0);
        if (!Number.isFinite(id) || id <= 0) {
          return jsonResponse({ ok: false, message: "Registro inválido." }, 400);
        }

        try {
          const res = await apagarRegistroPonto(id);
          return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
