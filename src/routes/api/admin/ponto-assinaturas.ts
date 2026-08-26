import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest, podeConsultarPonto } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";
import { listarFuncionariosPonto } from "@/lib/ponto.server";
import { getAssinaturaEmpresaDataUrl, mapaAssinaturasDataUrl } from "@/lib/usuario-assinatura.server";
import { mapaThumbsEnriquecidos } from "@/lib/usuario-thumb.server";

export const Route = createFileRoute("/api/admin/ponto-assinaturas")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeConsultarPonto(session)) {
          return jsonResponse({ ok: false, message: "Sem permissão para consultar o ponto." }, 403);
        }
        try {
          const funcionarios = await listarFuncionariosPonto();
          const thumbs = await mapaThumbsEnriquecidos(funcionarios);
          const assinaturas = await mapaAssinaturasDataUrl(funcionarios.map((f) => f.id));
          const assinaturaEmpresa = await getAssinaturaEmpresaDataUrl(session.userId, session.visao);
          return jsonResponse({
            ok: true,
            assinaturaEmpresa,
            itens: funcionarios.map((f) => {
              const t = thumbs.get(f.id);
              return {
                id: f.id,
                nome: f.nome,
                thumb: t?.thumb ?? f.thumb,
                thumb_url: t?.thumb_url ?? null,
                dataUrl: assinaturas[f.id] ?? null,
              };
            }),
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
