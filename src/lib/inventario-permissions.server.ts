import type { AdminSessionPayload } from "@/lib/auth.server";

export function sessionEhAdmin(session: AdminSessionPayload): boolean {
  return session.visao === "admin";
}

export function podeEditarClienteInventario(
  session: AdminSessionPayload,
  row: { status: string; funcionario: number | null },
): boolean {
  if (sessionEhAdmin(session)) return true;
  if (row.status !== "agendado") return false;
  return row.funcionario === session.userId;
}

export function podeEnviarOrcamento(session: AdminSessionPayload): boolean {
  return session.visao === "admin" || session.visao === "funcionário";
}

export function podeEditarOrcamentoExistente(session: AdminSessionPayload): boolean {
  return sessionEhAdmin(session);
}

export function filtroFuncionarioWhere(session: AdminSessionPayload): { funcionario?: number } {
  if (session.visao === "funcionário") return { funcionario: session.userId };
  return {};
}
