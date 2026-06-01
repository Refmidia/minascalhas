import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest, podeGerenciarUsuarios } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";
import {
  removerThumbArquivo,
  salvarThumbUpload,
  thumbPublicUrl,
} from "@/lib/usuario-thumb.server";
import { getUsuarioById, setUsuarioThumb } from "@/lib/usuarios.server";

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export const Route = createFileRoute("/api/admin/usuarios/$id/thumb")({
  server: {
    handlers: {
      POST: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!podeGerenciarUsuarios(session)) {
          return jsonResponse({ ok: false, message: "Acesso apenas para administrador." }, 403);
        }
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);

        let form: FormData;
        try {
          form = await request.formData();
        } catch {
          return jsonResponse({ ok: false, message: "FormData inválido." }, 400);
        }

        const file = form.get("arquivo");
        if (!(file instanceof File) || !file.size) {
          return jsonResponse({ ok: false, message: "Envie uma imagem." }, 422);
        }

        try {
          const usuario = await getUsuarioById(id);
          if (!usuario) return jsonResponse({ ok: false, message: "Usuário não encontrado." }, 404);

          const saved = await salvarThumbUpload(file);
          if ("erro" in saved) {
            return jsonResponse({ ok: false, message: saved.erro }, 422);
          }

          const thumbAnterior = await setUsuarioThumb(id, saved.arquivo);
          if (thumbAnterior) await removerThumbArquivo(thumbAnterior);

          return jsonResponse({
            ok: true,
            thumb: saved.arquivo,
            thumb_url: thumbPublicUrl(saved.arquivo),
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
