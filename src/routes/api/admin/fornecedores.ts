import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";

import { dbErrorMessage } from "@/lib/agendamento.server";
import { getAdminSessionFromRequest, isAdminRequest } from "@/lib/auth.server";
import {
  analisarFornecedorFinanceiro,
  devolverCompraFornecedor,
  excluirCompraFornecedor,
  lancarCompraFornecedorAdmin,
} from "@/lib/fornecedor-controle.server";
import {
  atualizarPagamentoEntrega,
  contarEntregasPendentes,
  excluirEntrega,
  excluirFornecedor,
  listarEntregasAdmin,
  listarFornecedores,
  marcarEntregaRecebida,
  marcarItensEntregaPagos,
  marcarItensEntregaRecebidos,
  obterEntregaCompleta,
  salvarFornecedor,
} from "@/lib/fornecedores.server";
import { jsonResponse } from "@/lib/http.server";

const fornecedorSchema = z.object({
  razao_social: z.string(),
  nome_fantasia: z.string().optional(),
  cnpj: z.string(),
  email: z.string().optional(),
  telefone: z.string().optional(),
  contato_nome: z.string().optional(),
  cep: z.string().optional(),
  endereco: z.string().optional(),
  numero: z.string().optional(),
  complemento: z.string().optional(),
  bairro: z.string().optional(),
  cidade: z.string().optional(),
  uf: z.string().optional(),
  observacao: z.string().optional(),
});

const postSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("cadastrar"), dados: fornecedorSchema }),
  z.object({ action: z.literal("editar"), id: z.number().int().positive(), dados: fornecedorSchema }),
  z.object({ action: z.literal("excluir"), id: z.number().int().positive() }),
  z.object({
    action: z.literal("receber_itens"),
    entrega_id: z.number().int().positive(),
    item_ids: z.array(z.number().int().positive()),
    pagamento_status: z.enum(["pago", "pendente"]),
  }),
  z.object({
    action: z.literal("receber_entrega"),
    entrega_id: z.number().int().positive(),
    pagamento_status: z.enum(["pago", "pendente"]),
  }),
  z.object({
    action: z.literal("pagar_itens"),
    entrega_id: z.number().int().positive(),
    item_ids: z.array(z.number().int().positive()),
  }),
  z.object({
    action: z.literal("atualizar_pagamento"),
    entrega_id: z.number().int().positive(),
    pagamento_status: z.enum(["pago", "pendente"]),
  }),
  z.object({ action: z.literal("excluir_entrega"), entrega_id: z.number().int().positive() }),
  z.object({
    action: z.literal("lancar_compra"),
    fornecedor_id: z.number().int().positive(),
    material_id: z.number().int().positive(),
    metros: z.union([z.string(), z.number()]),
    valor_unitario: z.union([z.string(), z.number()]),
    observacao: z.string().optional().default(""),
    atualizar_custo_material: z.boolean().optional().default(true),
  }),
  z.object({
    action: z.literal("excluir_compra"),
    compra_id: z.number().int().positive(),
    fornecedor_id: z.number().int().positive(),
  }),
  z.object({
    action: z.literal("devolver_compra"),
    compra_id: z.number().int().positive(),
    fornecedor_id: z.number().int().positive(),
    metros_devolver: z.union([z.string(), z.number()]),
    motivo: z.string().optional().default(""),
  }),
]);

export const Route = createFileRoute("/api/admin/fornecedores")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || session.visao !== "admin") {
          return jsonResponse({ ok: false, message: "Acesso apenas na visão administrador." }, 403);
        }

        const url = new URL(request.url);
        const ver = Number.parseInt(url.searchParams.get("ver") ?? "", 10);
        const controle = Number.parseInt(url.searchParams.get("controle") ?? "", 10);
        let status = url.searchParams.get("status") ?? "enviado";
        if (!["enviado", "recebido", "todas"].includes(status)) status = "enviado";

        try {
          const pendentes_total = await contarEntregasPendentes();

          if (Number.isFinite(ver) && ver > 0) {
            const entrega = await obterEntregaCompleta(ver);
            if (!entrega) {
              return jsonResponse({ ok: false, message: "Entrega não encontrada." }, 404);
            }
            return jsonResponse({ ok: true, pendentes_total, entrega });
          }

          if (Number.isFinite(controle) && controle > 0) {
            const financeiro = await analisarFornecedorFinanceiro(controle);
            if (!financeiro) {
              return jsonResponse({ ok: false, message: "Fornecedor não encontrado." }, 404);
            }
            const fornecedores = await listarFornecedores();
            const pendentes = await contarEntregasPendentes(controle);
            const entregas_pendentes = await listarEntregasAdmin("enviado", controle);
            const { fornecedor, resumo, compras, orcamentos, itens, materiais } = financeiro;
            return jsonResponse({
              ok: true,
              pendentes_total,
              fornecedores,
              controle: {
                fornecedor,
                pendentes,
                entregas_pendentes,
                resumo,
                compras,
                orcamentos,
                itens,
                materiais,
              },
            });
          }

          const filtro = status === "todas" ? null : (status as "enviado" | "recebido");
          const [fornecedores, entregas] = await Promise.all([
            listarFornecedores(),
            listarEntregasAdmin(filtro),
          ]);

          return jsonResponse({
            ok: true,
            pendentes_total,
            fornecedores,
            entregas,
          });
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },

      POST: async ({ request }) => {
        if (!isAdminRequest(request)) return jsonResponse({ ok: false }, 401);
        const session = getAdminSessionFromRequest(request);
        if (!session || session.visao !== "admin") {
          return jsonResponse({ ok: false, message: "Acesso apenas na visão administrador." }, 403);
        }

        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return jsonResponse({ ok: false, message: "JSON inválido." }, 400);
        }

        const parsed = postSchema.safeParse(body);
        if (!parsed.success) {
          return jsonResponse({ ok: false, message: "Dados inválidos." }, 400);
        }

        try {
          const data = parsed.data;
          const adminId = session.userId;

          if (data.action === "cadastrar") {
            const res = await salvarFornecedor(data.dados);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "editar") {
            const res = await salvarFornecedor(data.dados, data.id);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "excluir") {
            const res = await excluirFornecedor(data.id);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "receber_itens") {
            const res = await marcarItensEntregaRecebidos(
              data.entrega_id,
              data.item_ids,
              adminId,
              data.pagamento_status,
            );
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "receber_entrega") {
            const res = await marcarEntregaRecebida(
              data.entrega_id,
              adminId,
              data.pagamento_status,
            );
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "pagar_itens") {
            const res = await marcarItensEntregaPagos(data.entrega_id, data.item_ids);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "atualizar_pagamento") {
            await atualizarPagamentoEntrega(data.entrega_id, data.pagamento_status);
            const msg =
              data.pagamento_status === "pago"
                ? "Pagamento marcado como pago."
                : "Pagamento marcado como pendente.";
            return jsonResponse({ ok: true, message: msg });
          }
          if (data.action === "excluir_entrega") {
            const res = await excluirEntrega(data.entrega_id);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "lancar_compra") {
            const res = await lancarCompraFornecedorAdmin(
              data.fornecedor_id,
              data.material_id,
              data.metros,
              data.valor_unitario,
              data.observacao ?? "",
              data.atualizar_custo_material ?? true,
            );
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "excluir_compra") {
            const res = await excluirCompraFornecedor(data.compra_id, data.fornecedor_id);
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }
          if (data.action === "devolver_compra") {
            const res = await devolverCompraFornecedor(
              data.compra_id,
              data.fornecedor_id,
              data.metros_devolver,
              data.motivo ?? "",
            );
            return jsonResponse({ ok: res.ok, message: res.message }, res.ok ? 200 : 400);
          }

          return jsonResponse({ ok: false, message: "Ação desconhecida." }, 400);
        } catch (err) {
          return jsonResponse({ ok: false, message: dbErrorMessage(err) }, 503);
        }
      },
    },
  },
});
