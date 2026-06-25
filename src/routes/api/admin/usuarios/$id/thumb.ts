import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest, podeGerenciarUsuarios } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";
import {
  getUsuarioThumbData,
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
      GET: async ({ request, params }) => {
        if (!isAdminRequest(request)) return new Response("Unauthorized", { status: 401 });
        const session = getAdminSessionFromRequest(request);
        if (!session) return new Response("Unauthorized", { status: 401 });

        const id = lerId(params.id);
        if (!id) return new Response("Not found", { status: 404 });

        try {
          const payload = await getUsuarioThumbData(id);
          if (!payload) return new Response("Not found", { status: 404 });

          return new Response(new Uint8Array(payload.data), {
            status: 200,
            headers: {
              "Content-Type": payload.mime,
              "Cache-Control": "private, max-age=3600",
            },
          });
        } catch {
          return new Response("Error", { status: 503 });
        }
      },

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

          const thumbAnterior = usuario.thumb ?? "nao.png";
          const saved = await salvarThumbUpload(id, file);
          if ("erro" in saved) {
            return jsonResponse({ ok: false, message: saved.erro }, 422);
          }

          await setUsuarioThumb(id, saved.arquivo);
          if (
            thumbAnterior !== "nao.png" &&
            thumbAnterior !== saved.arquivo
          ) {
            await removerThumbArquivo(thumbAnterior);
          }

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
