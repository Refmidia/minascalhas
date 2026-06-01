import { createFileRoute } from "@tanstack/react-router";
import { agendamentoSchema } from "@/lib/validation";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
} as const;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS },
  });

/**
 * POST /api/agendamentos
 *
 * Recebe um agendamento e persiste no MySQL.
 *
 * Esta rota está preparada para integração com Prisma + MySQL.
 * Para ativar a persistência:
 *
 * 1. Configure `DATABASE_URL` no `.env` (ver `.env.example`).
 * 2. Rode `npx prisma generate` (e `npx prisma db push` no Cursor,
 *    apenas se a tabela ainda não existir — nunca rode migrations
 *    destrutivas sobre uma base existente sem confirmação).
 * 3. Descomente o bloco Prisma abaixo.
 *
 * Mantemos um stub seguro para que o build atual rode em ambientes
 * sem MySQL disponível (ex.: preview/edge).
 */
export const Route = createFileRoute("/api/agendamentos")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),

      POST: async ({ request }) => {
        let body: unknown;
        try {
          body = await request.json();
        } catch {
          return json({ ok: false, message: "JSON inválido." }, 400);
        }

        const parsed = agendamentoSchema.safeParse(body);
        if (!parsed.success) {
          return json(
            {
              ok: false,
              message: "Dados inválidos.",
              issues: parsed.error.flatten(),
            },
            422,
          );
        }

        const data = parsed.data;

        // --- Integração MySQL (Prisma) ---------------------------------
        // import { getPrisma } from "@/lib/db.server";
        // const prisma = await getPrisma();
        // const agendamento = await prisma.agendamento.create({
        //   data: {
        //     nome: data.nome,
        //     cpfCnpj: data.cpfCnpj || null,
        //     telefone: data.telefone,
        //     endereco: data.endereco,
        //     bairro: data.bairro,
        //     cep: data.cep || null,
        //     numero: data.numero,
        //     data: new Date(`${data.data}T${data.hora}:00`),
        //     hora: data.hora,
        //     observacao: data.observacao || null,
        //     origem: data.origem,
        //   },
        // });
        // return json({ ok: true, id: agendamento.id });
        // ---------------------------------------------------------------

        console.log("[/api/agendamentos] novo agendamento:", data);

        return json({
          ok: true,
          id: `mock-${Date.now()}`,
          message: "Agendamento recebido.",
        });
      },
    },
  },
});
