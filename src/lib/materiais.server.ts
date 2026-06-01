import { getPrisma } from "@/lib/db.server";

export type MaterialRow = {
  id: number;
  material: string;
  valor_custo: number;
  valor: number;
  fornecedor_id: number | null;
  visivel_fornecedor: boolean;
  valor_fornecedor: number;
  fornecedor_ids: number[];
  qtd_fornecedores: number;
  fornecedores_nomes: string[];
};

type DbMaterialRow = {
  id: number;
  material: string | null;
  valor_custo: unknown;
  valor: unknown;
  fornecedor_id: number | null;
  visivel_fornecedor: number;
  valor_fornecedor: unknown;
};

type LiberacaoRow = {
  material_id: number;
  fornecedor_id: number;
  razao_social: string;
  nome_fantasia: string | null;
};

function fornecedorRotulo(row: { razao_social: string; nome_fantasia: string | null }): string {
  const nf = row.nome_fantasia?.trim();
  const rs = row.razao_social?.trim();
  return nf || rs || "Fornecedor";
}

function num(v: unknown): number {
  if (typeof v === "bigint") return num(Number(v));
  if (
    v !== null &&
    typeof v === "object" &&
    "toNumber" in v &&
    typeof (v as { toNumber: () => number }).toNumber === "function"
  ) {
    return num((v as { toNumber: () => number }).toNumber());
  }
  const n = Number(v);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
}

function int(v: unknown): number {
  if (typeof v === "bigint") return Number(v);
  return Number(v);
}

function rowToMaterial(
  r: DbMaterialRow,
  lib: { ids: number[]; nomes: string[] },
): MaterialRow {
  return {
    id: int(r.id),
    material: r.material ?? "",
    valor_custo: num(r.valor_custo),
    valor: num(r.valor),
    fornecedor_id: r.fornecedor_id != null ? int(r.fornecedor_id) : null,
    visivel_fornecedor: int(r.visivel_fornecedor) === 1,
    valor_fornecedor: num(r.valor_fornecedor),
    fornecedor_ids: lib.ids,
    qtd_fornecedores: lib.ids.length,
    fornecedores_nomes: lib.nomes,
  };
}

async function queryMateriais(): Promise<DbMaterialRow[]> {
  const prisma = await getPrisma();
  return prisma.$queryRawUnsafe<DbMaterialRow[]>(
    `SELECT id, material, valor_custo, valor, fornecedor_id, visivel_fornecedor, valor_fornecedor
     FROM materiais
     ORDER BY material ASC`,
  );
}

async function loadLiberacaoMap(): Promise<Map<number, { ids: number[]; nomes: string[] }>> {
  const prisma = await getPrisma();
  const map = new Map<number, { ids: number[]; nomes: string[] }>();

  try {
    const rows = await prisma.$queryRawUnsafe<LiberacaoRow[]>(
      `SELECT mfl.material_id, mfl.fornecedor_id, f.razao_social, f.nome_fantasia
       FROM material_fornecedor_liberacao mfl
       INNER JOIN fornecedores f ON f.id = mfl.fornecedor_id
       ORDER BY mfl.material_id ASC, f.razao_social ASC`,
    );
    for (const row of rows) {
      const mid = int(row.material_id);
      const fid = int(row.fornecedor_id);
      if (mid <= 0 || fid <= 0) continue;
      if (!map.has(mid)) map.set(mid, { ids: [], nomes: [] });
      const entry = map.get(mid)!;
      entry.ids.push(fid);
      entry.nomes.push(fornecedorRotulo(row));
    }
  } catch {
    // Tabela pode não existir em bases antigas.
  }

  return map;
}

export async function listMateriais(): Promise<MaterialRow[]> {
  const [rows, libMap] = await Promise.all([queryMateriais(), loadLiberacaoMap()]);
  return rows.map((r) => rowToMaterial(r, libMap.get(int(r.id)) ?? { ids: [], nomes: [] }));
}

export async function findMaterialByNome(material: string): Promise<DbMaterialRow | null> {
  const prisma = await getPrisma();
  const rows = await prisma.$queryRawUnsafe<DbMaterialRow[]>(
    `SELECT id, material, valor_custo, valor, fornecedor_id, visivel_fornecedor, valor_fornecedor
     FROM materiais WHERE material = ? LIMIT 1`,
    material,
  );
  return rows[0] ?? null;
}

export async function findMaterialById(id: number): Promise<DbMaterialRow | null> {
  const prisma = await getPrisma();
  const rows = await prisma.$queryRawUnsafe<DbMaterialRow[]>(
    `SELECT id, material, valor_custo, valor, fornecedor_id, visivel_fornecedor, valor_fornecedor
     FROM materiais WHERE id = ? LIMIT 1`,
    id,
  );
  return rows[0] ?? null;
}

export async function createMaterial(data: {
  material: string;
  valor_custo: number;
  valor: number;
}): Promise<void> {
  const prisma = await getPrisma();
  await prisma.$executeRawUnsafe(
    `INSERT INTO materiais (material, valor_custo, valor) VALUES (?, ?, ?)`,
    data.material,
    data.valor_custo,
    data.valor,
  );
}

export async function updateMaterial(
  id: number,
  data: {
    material: string;
    valor_custo: number;
    valor: number;
    valor_fornecedor?: number;
  },
): Promise<void> {
  const prisma = await getPrisma();
  if (data.valor_fornecedor !== undefined) {
    await prisma.$executeRawUnsafe(
      `UPDATE materiais
       SET material = ?, valor_custo = ?, valor = ?, valor_fornecedor = ?
       WHERE id = ?`,
      data.material,
      data.valor_custo,
      data.valor,
      data.valor_fornecedor,
      id,
    );
  } else {
    await prisma.$executeRawUnsafe(
      `UPDATE materiais SET material = ?, valor_custo = ?, valor = ? WHERE id = ?`,
      data.material,
      data.valor_custo,
      data.valor,
      id,
    );
  }
}

export async function salvarMaterialFornecedoresLiberados(
  materialId: number,
  fornecedorIds: number[],
): Promise<void> {
  const prisma = await getPrisma();
  const ids = [...new Set(fornecedorIds.map((id) => Number(id)).filter((id) => id > 0))];

  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM material_fornecedor_liberacao WHERE material_id = ?`,
      materialId,
    );
    for (const fid of ids) {
      await prisma.$executeRawUnsafe(
        `INSERT IGNORE INTO material_fornecedor_liberacao (material_id, fornecedor_id) VALUES (?, ?)`,
        materialId,
        fid,
      );
    }
  } catch {
    // Ignora se a tabela ainda não foi criada no Hostinger.
  }

  const visivel = ids.length > 0 ? 1 : 0;
  await prisma.$executeRawUnsafe(
    `UPDATE materiais SET visivel_fornecedor = ? WHERE id = ?`,
    visivel,
    materialId,
  );
}

export async function deleteMaterial(id: number): Promise<void> {
  const prisma = await getPrisma();
  const exists = await findMaterialById(id);
  if (!exists) {
    const err = new Error("Material não encontrado.");
    (err as { code?: string }).code = "P2025";
    throw err;
  }
  try {
    await prisma.$executeRawUnsafe(
      `DELETE FROM material_fornecedor_liberacao WHERE material_id = ?`,
      id,
    );
  } catch {
    /* tabela opcional */
  }
  await prisma.$executeRawUnsafe(`DELETE FROM materiais WHERE id = ?`, id);
}
