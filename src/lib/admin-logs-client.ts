import type { AdminLogFiltroNivel, AdminLogRow } from "@/lib/admin-logs.server";

export type { AdminLogFiltroNivel, AdminLogRow };

export type AdminLogsData = {
  itens: AdminLogRow[];
  total: number;
  totalGeral: number;
  erros24h: number;
  page: number;
  perPage: number;
  totalPaginas: number;
  nivel: AdminLogFiltroNivel;
  busca: string;
};

async function parseJson<T>(res: Response): Promise<T> {
  return (await res.json()) as T;
}

export async function fetchAdminLogs(params: {
  nivel: AdminLogFiltroNivel;
  q: string;
  page: number;
}): Promise<AdminLogsData> {
  const qs = new URLSearchParams({
    nivel: params.nivel,
    p: String(params.page),
    perPage: "30",
  });
  if (params.q.trim()) qs.set("q", params.q.trim());

  const res = await fetch(`/api/admin/logs?${qs}`, { credentials: "include" });
  const data = await parseJson<AdminLogsData & { ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao carregar log.");
  return data;
}

export async function apagarAdminLog(id: string): Promise<void> {
  const res = await fetch("/api/admin/logs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "delete", id }),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao apagar registro.");
}

export async function limparAdminLogs(nivel: AdminLogFiltroNivel | "todos"): Promise<string> {
  const res = await fetch("/api/admin/logs", {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "clear", nivel }),
  });
  const data = await parseJson<{ ok?: boolean; message?: string }>(res);
  if (!res.ok) throw new Error(data.message ?? "Erro ao limpar log.");
  return data.message ?? "Concluído.";
}
