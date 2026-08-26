import { createFileRoute } from "@tanstack/react-router";

import { dbErrorMessage } from "@/lib/agendamento.server";
import {
  getAdminSessionFromRequest,
  isAdminRequest,
  podeConsultarPonto,
  podeGerenciarPonto,
  podeGerenciarUsuarios,
  type AdminSessionPayload,
} from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";
import {
  getUsuarioAssinaturaDataUrl,
  limparUsuarioAssinatura,
  salvarUsuarioAssinatura,
} from "@/lib/usuario-assinatura.server";
import { getUsuarioById } from "@/lib/usuarios.server";

function lerId(valor: string): number | null {
  const id = Number(valor);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function podeVerAssinatura(session: AdminSessionPayload | null, id: number): boolean {
  if (!session) return false;
  if (session.userId === id) return true;
  return podeGerenciarUsuarios(session) || podeGerenciarPonto(session) || podeConsultarPonto(session);
}

function podeEditarAssinatura(session: AdminSessionPayload | null, id: number): boolean {
  if (!session) return false;
  if (session.userId === id) return true;
  return podeGerenciarUsuarios(session);
}

export const Route = createFileRoute("/api/admin/usuarios/$id/assinatura")({
  server: {
    handlers: {
      GET: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        if (!podeVerAssinatura(session, id)) {
          return jsonResponse({ ok: false, message: "Sem permissão." }, 403);
        }
        try {
          const dataUrl = await getUsuarioAssinaturaDataUrl(id);
          return jsonResponse({ ok: true, dataUrl });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      DELETE: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        if (!podeEditarAssinatura(session, id)) {
          return jsonResponse({ ok: false, message: "Sem permissão para alterar esta assinatura." }, 403);
        }
        if (!podeGerenciarUsuarios(session)) {
          return jsonResponse(
            { ok: false, message: "A assinatura já foi gravada e não pode ser alterada." },
            403,
          );
        }
        try {
          const usuario = await getUsuarioById(id);
          if (!usuario) return jsonResponse({ ok: false, message: "Usuário não encontrado." }, 404);
          await limparUsuarioAssinatura(id);
          return jsonResponse({ ok: true, dataUrl: null });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request, params }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        const id = lerId(params.id);
        if (!id) return jsonResponse({ ok: false, message: "ID inválido." }, 400);
        if (!podeEditarAssinatura(session, id)) {
          return jsonResponse({ ok: false, message: "Sem permissão para alterar esta assinatura." }, 403);
        }

        const body = (await request.json().catch(() => null)) as { dataUrl?: unknown } | null;
        const dataUrl = typeof body?.dataUrl === "string" ? body.dataUrl : "";
        if (!dataUrl) {
          return jsonResponse({ ok: false, message: "Desenhe a assinatura antes de salvar." }, 422);
        }

        try {
          const usuario = await getUsuarioById(id);
          if (!usuario) return jsonResponse({ ok: false, message: "Usuário não encontrado." }, 404);
          const atual = await getUsuarioAssinaturaDataUrl(id);
          if (atual && !podeGerenciarUsuarios(session)) {
            return jsonResponse(
              { ok: false, message: "A assinatura já foi gravada e não pode ser alterada." },
              409,
            );
          }
          const saved = await salvarUsuarioAssinatura(id, dataUrl);
          if (typeof saved !== "string") {
            return jsonResponse({ ok: false, message: saved.erro }, 422);
          }
          return jsonResponse({ ok: true, dataUrl: saved });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
