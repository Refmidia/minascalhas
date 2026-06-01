import type { AgendamentoPayload } from "@/types/site";

export type AgendamentoResponse = {
  ok: boolean;
  id?: string | number;
  message?: string;
};

/**
 * Envia um agendamento para a API REST.
 *
 * Em produção esta rota é servida pelo backend próprio (MySQL via Prisma).
 * Veja `src/routes/api/agendamentos.ts` para o handler de exemplo e
 * `prisma/schema.prisma` para a estrutura da tabela.
 */
export async function enviarAgendamento(
  payload: AgendamentoPayload,
): Promise<AgendamentoResponse> {
  const res = await fetch("/api/agendamentos", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    let message = "Não foi possível enviar o agendamento.";
    try {
      const data = (await res.json()) as { message?: string };
      if (data?.message) message = data.message;
    } catch {
      /* ignore */
    }
    throw new Error(message);
  }

  return (await res.json()) as AgendamentoResponse;
}
