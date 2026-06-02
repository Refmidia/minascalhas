import type { Prisma } from "@prisma/client";

import { getPrisma } from "@/lib/db.server";

export type AdminLogNivel = "error" | "warning" | "security" | "info";
export type AdminLogFiltroNivel = AdminLogNivel | "problemas" | "todos";

export type AdminLogRow = {
  id: string;
  nivel: AdminLogNivel;
  mensagem: string;
  como_resolver: string;
  contexto: string | null;
  pagina: string | null;
  usuario_nome: string | null;
  criado_em: string;
};

const NIVEIS_PROBLEMA: AdminLogNivel[] = ["error", "warning", "security"];

export function normalizarNivel(nivel: string): AdminLogNivel {
  const n = nivel.trim().toLowerCase();
  if (n === "error" || n === "warning" || n === "security" || n === "info") return n;
  return "info";
}

export function rotuloNivel(nivel: string): string {
  return (
    {
      error: "Erro",
      warning: "Aviso",
      security: "Segurança",
      info: "Info",
    } as Record<string, string>
  )[normalizarNivel(nivel)] ?? "Info";
}

function sugerirResolucao(
  mensagem: string,
  nivel: string,
  contexto: Record<string, unknown>,
  pagina: string,
): string {
  const msg = mensagem.toLowerCase();
  const pag = pagina.toLowerCase();

  if (msg.includes("vínculo inválido") || msg.includes("empresa não encontrada")) {
    const fid = Number(contexto.fornecedor_id ?? 0);
    return (
      "1. Abra Administração → Fornecedores e cadastre a empresa novamente (CNPJ correto).\n" +
      "2. Vá em Administração → Usuários, edite o login do fornecedor e selecione a empresa.\n" +
      "3. Peça para o fornecedor sair e entrar de novo no sistema." +
      (fid > 0 ? `\nVínculo antigo no banco: fornecedor #${fid}.` : "")
    );
  }

  if (msg.includes("banco de dados") || msg.includes("mysql") || msg.includes("connection")) {
    return (
      "1. Verifique se o MySQL está ligado (Hostinger ou servidor local).\n" +
      "2. Confira as variáveis DB_* ou DATABASE_URL no ambiente.\n" +
      "3. Na Hostinger, aguarde se aparecer limite de conexões.\n" +
      "4. Veja também os logs de erro do servidor."
    );
  }

  if (msg.includes("undefined") || msg.includes("call to undefined")) {
    const arquivo = String(contexto.arquivo ?? "");
    const linha = Number(contexto.linha ?? 0);
    return (
      "1. Erro de programação: variável ou função inexistente.\n" +
      (arquivo ? `2. Arquivo: ${arquivo}${linha > 0 ? ` (linha ${linha}).` : "."}\n` : "") +
      "3. Atualize os arquivos no servidor ou envie este log para manutenção.\n" +
      "4. Limpe o cache do navegador (Ctrl+F5) após a correção."
    );
  }

  if (normalizarNivel(nivel) === "security") {
    return (
      "1. Revise quem acessou o sistema neste horário (usuário e IP no registro).\n" +
      "2. Altere senhas se suspeitar de acesso indevido.\n" +
      "3. Após corrigir, pode apagar este registro do log."
    );
  }

  if (normalizarNivel(nivel) === "error") {
    return (
      "1. Anote a mensagem e a página onde ocorreu.\n" +
      "2. Tente repetir a ação após Ctrl+F5.\n" +
      "3. Se continuar, use o botão de detalhes e encaminhe para manutenção."
    );
  }

  if (normalizarNivel(nivel) === "warning") {
    return (
      "1. Leia a mensagem acima — geralmente indica validação ou bloqueio esperado.\n" +
      "2. Corrija os dados informados e tente de novo.\n" +
      "3. Após resolver, pode apagar este registro."
    );
  }

  if (msg.includes("entrega não encontrada") || pag.includes("fornecedor")) {
    return (
      "1. A nota pode ter sido excluída ou o filtro da aba esconde o status.\n" +
      "2. Em Entregas, teste a aba Todas.\n" +
      "3. Confirme se a empresa fornecedora ainda está cadastrada."
    );
  }

  return (
    "1. Verifique a mensagem e em qual página ocorreu.\n" +
    "2. Tente atualizar a página (Ctrl+F5) e repetir a ação.\n" +
    "3. Se persistir, use o botão de detalhes e encaminhe para manutenção."
  );
}

function parseContexto(raw: string | null): Record<string, unknown> {
  if (!raw?.trim()) return {};
  try {
    const decoded = JSON.parse(raw) as unknown;
    return decoded && typeof decoded === "object" && !Array.isArray(decoded)
      ? (decoded as Record<string, unknown>)
      : {};
  } catch {
    return {};
  }
}

function enriquecer(row: {
  nivel: string;
  mensagem: string;
  comoResolver: string | null;
  contexto: string | null;
  pagina: string | null;
}): string {
  const resolver = row.comoResolver?.trim() ?? "";
  if (resolver) return resolver;
  return sugerirResolucao(
    row.mensagem,
    row.nivel,
    parseContexto(row.contexto),
    row.pagina ?? "",
  );
}

function buildWhere(nivel: AdminLogFiltroNivel, busca: string): Prisma.AdminLogWhereInput {
  const where: Prisma.AdminLogWhereInput = {};

  if (nivel === "problemas") {
    where.nivel = { in: NIVEIS_PROBLEMA };
  } else if (nivel !== "todos") {
    where.nivel = normalizarNivel(nivel);
  }

  const q = busca.trim();
  if (q) {
    where.OR = [
      { mensagem: { contains: q } },
      { comoResolver: { contains: q } },
      { pagina: { contains: q } },
      { usuarioNome: { contains: q } },
      { contexto: { contains: q } },
    ];
  }

  return where;
}

function mapRow(r: {
  id: bigint;
  nivel: string;
  mensagem: string;
  comoResolver: string | null;
  contexto: string | null;
  pagina: string | null;
  usuarioNome: string | null;
  criadoEm: Date;
}): AdminLogRow {
  const nivel = normalizarNivel(r.nivel);
  const como_resolver = enriquecer(r);
  return {
    id: String(r.id),
    nivel,
    mensagem: r.mensagem,
    como_resolver,
    contexto: r.contexto,
    pagina: r.pagina,
    usuario_nome: r.usuarioNome,
    criado_em: r.criadoEm.toISOString(),
  };
}

export async function listAdminLogs(params: {
  nivel: AdminLogFiltroNivel;
  busca: string;
  page: number;
  perPage: number;
}): Promise<{ itens: AdminLogRow[]; total: number }> {
  const prisma = await getPrisma();
  const perPage = Math.min(200, Math.max(1, params.perPage));
  const page = Math.max(1, params.page);
  const where = buildWhere(params.nivel, params.busca);

  const [total, rows] = await Promise.all([
    prisma.adminLog.count({ where }),
    prisma.adminLog.findMany({
      where,
      orderBy: { id: "desc" },
      skip: (page - 1) * perPage,
      take: perPage,
    }),
  ]);

  return { itens: rows.map(mapRow), total };
}

export async function countAdminLogsTotal(): Promise<number> {
  const prisma = await getPrisma();
  return prisma.adminLog.count();
}

export async function countAdminLogsErrosRecentes(horas = 24): Promise<number> {
  const prisma = await getPrisma();
  const h = Math.min(168, Math.max(1, horas));
  const desde = new Date(Date.now() - h * 60 * 60 * 1000);
  return prisma.adminLog.count({
    where: {
      nivel: { in: NIVEIS_PROBLEMA },
      criadoEm: { gte: desde },
    },
  });
}

export async function deleteAdminLog(id: string): Promise<boolean> {
  const prisma = await getPrisma();
  const n = BigInt(id);
  if (n <= 0n) return false;
  try {
    await prisma.adminLog.delete({ where: { id: n } });
    return true;
  } catch {
    return false;
  }
}

export async function clearAdminLogs(nivel: AdminLogFiltroNivel | null): Promise<number> {
  const prisma = await getPrisma();
  if (!nivel || nivel === "todos") {
    const r = await prisma.adminLog.deleteMany();
    return r.count;
  }
  if (nivel === "problemas") {
    const r = await prisma.adminLog.deleteMany({ where: { nivel: { in: NIVEIS_PROBLEMA } } });
    return r.count;
  }
  const r = await prisma.adminLog.deleteMany({ where: { nivel: normalizarNivel(nivel) } });
  return r.count;
}
