import { getPrisma } from "@/lib/db.server";

export type MaterialLiberadoRow = {
  id: number;
  material: string;
  valor_custo: number;
  valor: number;
  valor_fornecedor: number;
};

function int(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  return Number(v) || 0;
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function str(v: unknown): string {
  return v == null ? "" : String(v);
}

function mapMaterial(r: Record<string, unknown>): MaterialLiberadoRow {
  return {
    id: int(r.id),
    material: str(r.material),
    valor_custo: num(r.valor_custo),
    valor: num(r.valor),
    valor_fornecedor: num(r.valor_fornecedor),
  };
}

/** Materiais liberados para o fornecedor montar nota (igual Alex `listarMateriaisLiberadosFornecedor`). */
export async function listarMateriaisLiberadosFornecedor(
  fornecedorId: number,
): Promise<MaterialLiberadoRow[]> {
  const prisma = await getPrisma();
  const fid = int(fornecedorId);
  if (fid <= 0) return [];

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.id, m.material, m.valor_custo, m.valor, m.valor_fornecedor
     FROM materiais m
     INNER JOIN material_fornecedor_liberacao mfl ON mfl.material_id = m.id
     WHERE mfl.fornecedor_id = ${fid}
     ORDER BY m.material ASC`,
  );
  return rows.map(mapMaterial);
}

export async function materialVisivelParaFornecedor(
  materialId: number,
  fornecedorId: number,
): Promise<boolean> {
  const mid = int(materialId);
  const fid = int(fornecedorId);
  if (mid <= 0 || fid <= 0) return false;

  const prisma = await getPrisma();
  const rows = await prisma.$queryRawUnsafe<{ material_id: unknown }[]>(
    `SELECT material_id FROM material_fornecedor_liberacao
     WHERE material_id = ${mid} AND fornecedor_id = ${fid}
     LIMIT 1`,
  );
  return rows.length > 0;
}

export async function obterMaterialLiberado(
  materialId: number,
  fornecedorId: number,
): Promise<MaterialLiberadoRow | null> {
  const mid = int(materialId);
  const fid = int(fornecedorId);
  if (mid <= 0 || fid <= 0) return null;

  const prisma = await getPrisma();
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.id, m.material, m.valor_custo, m.valor, m.valor_fornecedor
     FROM materiais m
     INNER JOIN material_fornecedor_liberacao mfl ON mfl.material_id = m.id
     WHERE mfl.material_id = ${mid} AND mfl.fornecedor_id = ${fid}
     LIMIT 1`,
  );
  return rows[0] ? mapMaterial(rows[0]) : null;
}
