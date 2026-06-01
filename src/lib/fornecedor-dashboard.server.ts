import type { AdminSessionPayload } from "@/lib/auth.server";
import { getPrisma } from "@/lib/db.server";
import { listarEntregasAdmin } from "@/lib/fornecedores.server";
import type { EntregaListaRow } from "@/lib/fornecedores.server";

function int(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export type FornecedorDashResumo = {
  total: number;
  recebidas: number;
  aguardando: number;
  suas_entregas: number;
  suas_recebidas: number;
};

export type FornecedorDashPorUsuario = {
  usuario_id: number;
  usuario_nome: string;
  total: number;
  recebidas: number;
  aguardando: number;
};

/** Resolve ID do fornecedor na visão fornecedor (simulação ou login futuro). */
export async function resolverFornecedorIdSessao(
  session: AdminSessionPayload,
  controleQuery?: number,
): Promise<number> {
  if (session.visao !== "fornecedor") return 0;

  const controle = int(controleQuery);
  if (controle > 0) return controle;
  if (session.fornecedorPreviewId > 0) return session.fornecedorPreviewId;

  const prisma = await getPrisma();
  const row = await prisma.usuario.findUnique({
    where: { id: session.userId },
    select: { fornecedorId: true },
  });
  return int(row?.fornecedorId);
}

async function contarEntregas(
  fornecedorId: number,
  status?: "enviado" | "recebido",
  usuarioId?: number,
): Promise<number> {
  if (fornecedorId <= 0) return 0;
  const prisma = await getPrisma();
  const where = [`e.fornecedor_id = ${fornecedorId}`];
  if (status === "enviado") where.push("e.status = 'enviado'");
  if (status === "recebido") where.push("e.status = 'recebido'");
  if (usuarioId != null && usuarioId > 0) where.push(`e.usuario_id = ${usuarioId}`);

  const rows = await prisma.$queryRawUnsafe<{ c: unknown }[]>(
    `SELECT COUNT(*) AS c FROM fornecedor_entregas e WHERE ${where.join(" AND ")}`,
  );
  return int(rows[0]?.c);
}

export async function fornecedorDashResumo(
  fornecedorId: number,
  usuarioId: number,
): Promise<FornecedorDashResumo> {
  const total = await contarEntregas(fornecedorId);
  const aguardando = await contarEntregas(fornecedorId, "enviado");
  const recebidas = await contarEntregas(fornecedorId, "recebido");
  const suas_entregas =
    usuarioId > 0 ? await contarEntregas(fornecedorId, undefined, usuarioId) : 0;
  const suas_recebidas =
    usuarioId > 0 ? await contarEntregas(fornecedorId, "recebido", usuarioId) : 0;

  return { total, recebidas, aguardando, suas_entregas, suas_recebidas };
}

export async function fornecedorDashNomeEmpresa(fornecedorId: number): Promise<string> {
  if (fornecedorId <= 0) return "";
  const prisma = await getPrisma();
  const rows = await prisma.$queryRawUnsafe<{ nome_fantasia: string; razao_social: string }[]>(
    `SELECT nome_fantasia, razao_social FROM fornecedores WHERE id = ${fornecedorId} LIMIT 1`,
  );
  const row = rows[0];
  if (!row) return "";
  const fantasia = String(row.nome_fantasia ?? "").trim();
  const razao = String(row.razao_social ?? "").trim();
  return fantasia || razao;
}

export async function fornecedorDashEntregasPorUsuario(
  fornecedorId: number,
): Promise<FornecedorDashPorUsuario[]> {
  if (fornecedorId <= 0) return [];
  const prisma = await getPrisma();
  const rows = await prisma.$queryRawUnsafe<
    Record<string, unknown>[]
  >(`SELECT
        COALESCE(e.usuario_id, 0) AS usuario_id,
        COALESCE(NULLIF(TRIM(MAX(u.nome)), ''), 'Sem usuário vinculado') AS usuario_nome,
        COUNT(*) AS total,
        SUM(CASE WHEN e.status = 'recebido' THEN 1 ELSE 0 END) AS recebidas,
        SUM(CASE WHEN e.status = 'enviado' THEN 1 ELSE 0 END) AS aguardando
      FROM fornecedor_entregas e
      LEFT JOIN usuarios u ON u.id = e.usuario_id
      WHERE e.fornecedor_id = ${fornecedorId}
      GROUP BY COALESCE(e.usuario_id, 0)
      ORDER BY total DESC, usuario_nome ASC`);

  return rows.map((r) => ({
    usuario_id: int(r.usuario_id),
    usuario_nome: String(r.usuario_nome ?? ""),
    total: int(r.total),
    recebidas: int(r.recebidas),
    aguardando: int(r.aguardando),
  }));
}

export async function fornecedorDashUltimasEntregas(
  fornecedorId: number,
  limite = 5,
): Promise<EntregaListaRow[]> {
  const todas = await listarEntregasAdmin("todas", fornecedorId);
  return todas.slice(0, limite);
}

export function fornecedorDashPercentualRecebidas(resumo: FornecedorDashResumo): number {
  if (resumo.total <= 0) return 0;
  return Math.round((resumo.recebidas / resumo.total) * 100);
}

export function fornecedorDashFormatarDataHora(datetime: string | null | undefined): string {
  if (!datetime) return "—";
  const d = new Date(datetime);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
