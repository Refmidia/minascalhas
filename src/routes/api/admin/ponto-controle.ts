import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest, podeGerenciarPonto } from "@/lib/auth.server";
import { jsonResponse } from "@/lib/http.server";
import {
  apagarJornadaPonto,
  apagarRegistroPonto,
  atualizarRegistroPonto,
  buscarRegistrosAdmin,
  criarRegistroPontoAdmin,
  listarFuncionariosPonto,
  mapaValorDiarioFuncionarios,
  montarJornadasAdmin,
} from "@/lib/ponto.server";
import { mapaThumbsEnriquecidos } from "@/lib/usuario-thumb.server";
import {
  formatAgoraPontoControle,
  montarDatetimePonto,
  pontoHojeIso,
  PONTO_SQL_DT_RE,
  pontoSerializarDatetime,
} from "@/lib/ponto-timezone";

const patchSchema = z.object({
  id: z.number().int().positive(),
  registrado_em: z.string().trim().min(1).optional(),
  data: z.string().trim().optional(),
  hora: z.string().trim().optional(),
});

const postSchema = z.object({
  usuario_id: z.number().int().positive(),
  tipo: z.string().trim().min(1),
  registrado_em: z.string().trim().min(1).optional(),
  data: z.string().trim().optional(),
  hora: z.string().trim().optional(),
});

export const Route = createFileRoute("/api/admin/ponto-controle")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeGerenciarPonto(session)) {
          return jsonResponse({ ok: false, message: "Sem permiss?o para controle de ponto." }, 403);
        }

        const url = new URL(request.url);
        const usuario = Number(url.searchParams.get("usuario") ?? 0);
        const hoje = pontoHojeIso();
        const primeiroMes = `${hoje.slice(0, 8)}01`;
        let de = url.searchParams.get("de")?.trim() || primeiroMes;
        let ate = url.searchParams.get("ate")?.trim() || hoje;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(de)) de = primeiroMes;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(ate)) ate = hoje;

        try {
          const funcionariosRaw = await listarFuncionariosPonto();
          const registrosRaw = await buscarRegistrosAdmin(
            usuario > 0 ? usuario : null,
            de,
            ate,
          );
          const ids = [...new Set(registrosRaw.map((r) => r.usuario_id))];
          const valorDiarioMap = await mapaValorDiarioFuncionarios(ids);
          const jornadasRaw = montarJornadasAdmin(registrosRaw, valorDiarioMap);

          const thumbItems = [
            ...funcionariosRaw.map((f) => ({ id: f.id, thumb: f.thumb })),
            ...jornadasRaw.map((j) => ({ id: j.usuario_id, thumb: j.thumb })),
            ...registrosRaw.map((r) => ({ id: r.usuario_id, thumb: r.thumb })),
          ];
          const thumbMap = await mapaThumbsEnriquecidos(thumbItems);

          const funcionarios = funcionariosRaw.map((f) => {
            const t = thumbMap.get(f.id);
            return {
              ...f,
              thumb: t?.thumb ?? f.thumb,
              thumb_url: t?.thumb_url ?? null,
            };
          });
          const jornadas = jornadasRaw.map((j) => {
            const t = thumbMap.get(j.usuario_id);
            return {
              ...j,
              thumb: t?.thumb ?? j.thumb,
              thumb_url: t?.thumb_url ?? null,
            };
          });
          const registros = registrosRaw.map((r) => {
            const t = thumbMap.get(r.usuario_id);
            return {
              ...r,
              thumb: t?.thumb ?? r.thumb,
              thumb_url: t?.thumb_url ?? null,
            };
          });

          return jsonResponse({
            ok: true,
            updated_at: formatAgoraPontoControle(),
            funcionarios,
            registros,
            jornadas,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      PATCH: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeGerenciarPonto(session)) {
          return jsonResponse(
            { ok: false, message: "Somente administradores podem corrigir hor?rios de ponto." },
            403,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, message: "JSON inv?lido." }, 400);
        }

        const parsed = patchSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ ok: false, message: "Dados inv?lidos." }, 422);
        }

        let registradoEm = parsed.data.registrado_em?.trim() ?? "";
        if (!registradoEm && parsed.data.data && parsed.data.hora) {
          const montado = montarDatetimePonto(parsed.data.data, parsed.data.hora);
          if (!montado) {
            return jsonResponse({ ok: false, message: "Data ou hora inv?lida." }, 422);
          }
          registradoEm = montado;
        }

        registradoEm = pontoSerializarDatetime(registradoEm);
        if (!PONTO_SQL_DT_RE.test(registradoEm)) {
          return jsonResponse({ ok: false, message: "Informe data e hora v?lidas." }, 422);
        }

        try {
          const res = await atualizarRegistroPonto(parsed.data.id, registradoEm);
          return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeGerenciarPonto(session)) {
          return jsonResponse(
            { ok: false, message: "Somente administradores podem corrigir hor?rios de ponto." },
            403,
          );
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, message: "JSON inv?lido." }, 400);
        }

        const parsed = postSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ ok: false, message: "Dados inv?lidos." }, 422);
        }

        let registradoEm = parsed.data.registrado_em?.trim() ?? "";
        if (!registradoEm && parsed.data.data && parsed.data.hora) {
          const montado = montarDatetimePonto(parsed.data.data, parsed.data.hora);
          if (!montado) {
            return jsonResponse({ ok: false, message: "Data ou hora inv?lida." }, 422);
          }
          registradoEm = montado;
        }

        if (!registradoEm) {
          return jsonResponse({ ok: false, message: "Informe data e hora v?lidas." }, 422);
        }

        try {
          const res = await criarRegistroPontoAdmin(
            parsed.data.usuario_id,
            parsed.data.tipo,
            registradoEm,
          );
          return jsonResponse(
            { ok: res.ok, message: res.message, id: res.id },
            res.ok ? 200 : 400,
          );
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      DELETE: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || !podeGerenciarPonto(session)) {
          return jsonResponse({ ok: false, message: "Sem permiss?o para excluir registros." }, 403);
        }

        const url = new URL(request.url);
        const id = Number(url.searchParams.get("id") ?? 0);
        const usuarioJornada = Number(url.searchParams.get("usuario") ?? 0);
        const dataJornada = url.searchParams.get("data")?.trim() ?? "";

        try {
          if (Number.isFinite(id) && id > 0) {
            const res = await apagarRegistroPonto(id);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }

          if (Number.isFinite(usuarioJornada) && usuarioJornada > 0 && /^\d{4}-\d{2}-\d{2}$/.test(dataJornada)) {
            const res = await apagarJornadaPonto(usuarioJornada, dataJornada);
            return jsonResponse(
              { ok: res.ok, message: res.message, removidos: res.removidos },
              res.ok ? 200 : 400,
            );
          }

          return jsonResponse({ ok: false, message: "Informe o ID do registro ou usu?rio + data." }, 400);
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
