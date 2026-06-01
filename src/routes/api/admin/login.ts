import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import {
  adminSessionCookieHeader,
  authenticateUsuario,
  buildAdminSessionPayload,
  createAdminSessionToken,
  sessionToPublic,
} from "@/lib/auth.server";
import { getAuthSecret } from "@/lib/config.server";
import { dbErrorMessage } from "@/lib/agendamento.server";
import { jsonResponse } from "@/lib/http.server";

const bodySchema = z.object({
  usuario: z.string().trim().min(1, "Informe o usuário"),
  password: z.string().min(1, "Informe a senha"),
});

export const Route = createFileRoute("/api/admin/login")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!getAuthSecret()) {
          return jsonResponse(
            {
              ok: false,
              message:
                "AUTH_SECRET não encontrado. Crie o arquivo .env na raiz do projeto (copie de .env.example), defina AUTH_SECRET e reinicie o npm run dev.",
            },
            503,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, message: "JSON inválido." }, 400);
        }

        const parsed = bodySchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ ok: false, message: "Usuário e senha são obrigatórios." }, 422);
        }

        try {
          const user = await authenticateUsuario(parsed.data.usuario, parsed.data.password);
          if (!user) {
            return jsonResponse({ ok: false, message: "Usuário ou senha inválidos." }, 401);
          }

          const payload = await buildAdminSessionPayload(user);
          const token = createAdminSessionToken(payload);
          if (!token) {
            return jsonResponse({ ok: false, message: "Não foi possível criar a sessão." }, 503);
          }

          return jsonResponse(
            {
              ok: true,
              user: sessionToPublic({ ...payload, exp: Date.now() + 1 }),
            },
            200,
            Object.fromEntries([adminSessionCookieHeader(token)]),
          );
        } catch (err) {
          console.error("[POST /api/admin/login]", err);
          const message = dbErrorMessage(err);
          const status = message.includes("MySQL") || message.includes("Senha") ? 503 : 500;
          return jsonResponse({ ok: false, message }, status);
        }
      },
    },
  },
});
