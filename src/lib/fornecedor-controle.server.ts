import { getPrisma } from "@/lib/db.server";
import type { EntregaListaRow, FornecedorRow } from "@/lib/fornecedores.server";
import { parseMoney, rowFornecedor } from "@/lib/fornecedores.server";

export type MaterialControleRow = {
  id: number;
  material: string;
  valor_custo: number;
  valor: number;
  valor_fornecedor: number;
  liberado: boolean;
};

export type CompraFornecedorRow = {
  id: number;
  fornecedor_id: number;
  material_id: number;
  material_nome: string;
  metros: number;
  metros_devolvidos: number;
  metros_efetivos: number;
  metros_disponivel_devolver: number;
  valor_unitario: number;
  observacao: string | null;
  criado_em: string | null;
  total_pago: number;
  total_original: number;
};

export type OrcamentoFornecedorRow = {
  inventario_id: number;
  cliente: string;
  status: string;
  data_visita: string | null;
  total_custo: number;
  total_venda_forn: number;
};

export type ItemOrcamentoFornecedorRow = {
  inventario_id: number;
  cliente: string;
  status: string;
  material: string;
  metros: number;
  total_custo: number;
  total_venda: number;
};

export type FornecedorControleResumo = {
  total_custo: number;
  total_custo_orcamentos: number;
  total_custo_compras: number;
  total_venda: number;
  margem: number;
  qtd_orcamentos: number;
  qtd_itens: number;
  qtd_compras: number;
};

export type FornecedorControleDados = {
  fornecedor: FornecedorRow;
  resumo: FornecedorControleResumo;
  compras: CompraFornecedorRow[];
  orcamentos: OrcamentoFornecedorRow[];
  itens: ItemOrcamentoFornecedorRow[];
  materiais: MaterialControleRow[];
};

export type FornecedorControlePainel = FornecedorControleDados & {
  pendentes: number;
  entregas_pendentes: EntregaListaRow[];
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

function escSql(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/'/g, "''");
}

function enriquecerCompra(row: Record<string, unknown>): CompraFornecedorRow {
  const metros = num(row.metros);
  const dev = num(row.metros_devolvidos);
  const unit = num(row.valor_unitario);
  const efetivos = Math.max(0, metros - dev);
  return {
    id: int(row.id),
    fornecedor_id: int(row.fornecedor_id),
    material_id: int(row.material_id),
    material_nome: str(row.material_nome),
    metros,
    metros_devolvidos: dev,
    metros_efetivos: efetivos,
    metros_disponivel_devolver: efetivos,
    valor_unitario: unit,
    observacao: row.observacao ? str(row.observacao) : null,
    criado_em: row.criado_em ? str(row.criado_em) : null,
    total_pago: efetivos * unit,
    total_original: metros * unit,
  };
}

export async function listarMateriaisControleAdmin(
  fornecedorId: number,
): Promise<MaterialControleRow[]> {
  const prisma = await getPrisma();
  const fid = int(fornecedorId);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT m.id, m.material, m.valor_custo, m.valor, m.valor_fornecedor,
            CASE WHEN mfl.fornecedor_id IS NOT NULL THEN 1 ELSE 0 END AS liberado
     FROM materiais m
     LEFT JOIN material_fornecedor_liberacao mfl
       ON mfl.material_id = m.id AND mfl.fornecedor_id = ${fid}
     ORDER BY m.material ASC`,
  );
  return rows.map((r) => ({
    id: int(r.id),
    material: str(r.material),
    valor_custo: num(r.valor_custo),
    valor: num(r.valor),
    valor_fornecedor: num(r.valor_fornecedor),
    liberado: int(r.liberado) === 1,
  }));
}

async function listarComprasFornecedor(fornecedorId: number): Promise<CompraFornecedorRow[]> {
  const prisma = await getPrisma();
  const fid = int(fornecedorId);
  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT c.*, m.material AS material_nome
     FROM fornecedor_compras c
     INNER JOIN materiais m ON m.id = c.material_id
     WHERE c.fornecedor_id = ${fid}
     ORDER BY c.criado_em DESC, c.id DESC`,
  );
  return rows.map(enriquecerCompra);
}

function parsePartItemFornecedor(item: Record<string, unknown>, fornecedorId: number) {
  const metros = parseMoney(String(item.metros ?? 0));
  const vendaUnit = parseMoney(String(item.valor ?? 0));
  const custoUnit = parseMoney(String(item.custo ?? item.valor_custo ?? 0));
  const fid = int(item.fornecedor_id);
  if (fid !== fornecedorId) return null;
  return {
    material_id: int(item.id),
    material: str(item.material),
    metros,
    total_venda: metros * vendaUnit,
    total_custo: metros * custoUnit,
    fornecedor_id: fid,
  };
}

export type FornecedorFiltroStatus =
  | "confirmado"
  | "finalizado"
  | "financeiro"
  | "sem_finalizado"
  | null;

function statusInventarioPermitido(status: string, filtro: FornecedorFiltroStatus): boolean {
  let st = status.trim().toLowerCase().replace("ç", "c");
  if (st === "orcamentado") st = "orcamentado";
  if (filtro === "confirmado") return st === "confirmado";
  if (filtro === "finalizado") return st === "finalizado";
  if (filtro === "financeiro") return st === "confirmado" || st === "finalizado";
  if (filtro === "sem_finalizado") return st !== "finalizado";
  return true;
}

export async function analisarFornecedorFinanceiro(
  fornecedorId: number,
  filtroStatus: FornecedorFiltroStatus = null,
): Promise<FornecedorControleDados | null> {
  const prisma = await getPrisma();
  const fid = int(fornecedorId);
  if (fid <= 0) return null;

  const fornRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT * FROM fornecedores WHERE id = ${fid} LIMIT 1`,
  );
  if (!fornRows[0]) return null;
  const fornecedor = rowFornecedor(fornRows[0]);

  const orcamentosMap = new Map<number, OrcamentoFornecedorRow & { itens: unknown[] }>();
  const itensAvulsos: ItemOrcamentoFornecedorRow[] = [];

  const invRows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT id, nome, status, valor, orcamento, \`data-visita\` AS data_visita
     FROM inventario
     WHERE orcamento IS NOT NULL AND TRIM(orcamento) <> '' AND orcamento <> '[]'`,
  );

  for (const row of invRows) {
    if (!statusInventarioPermitido(str(row.status), filtroStatus)) continue;
    let parts: unknown[];
    try {
      parts = JSON.parse(str(row.orcamento) || "[]") as unknown[];
    } catch {
      continue;
    }
    if (!Array.isArray(parts)) continue;
    const invId = int(row.id);
    const cliente = str(row.nome);
    const status = str(row.status);

    for (const raw of parts) {
      if (!raw || typeof raw !== "object") continue;
      const parsed = parsePartItemFornecedor(raw as Record<string, unknown>, fid);
      if (!parsed) continue;

      if (!orcamentosMap.has(invId)) {
        orcamentosMap.set(invId, {
          inventario_id: invId,
          cliente,
          status,
          data_visita: row.data_visita ? str(row.data_visita) : null,
          total_custo: 0,
          total_venda_forn: 0,
          itens: [],
        });
      }
      const o = orcamentosMap.get(invId)!;
      o.total_custo += parsed.total_custo;
      o.total_venda_forn += parsed.total_venda;
      itensAvulsos.push({
        inventario_id: invId,
        cliente,
        status,
        material: parsed.material,
        metros: parsed.metros,
        total_custo: parsed.total_custo,
        total_venda: parsed.total_venda,
      });
    }
  }

  const orcamentos = [...orcamentosMap.values()]
    .map(({ itens: _i, ...o }) => o)
    .sort((a, b) => b.inventario_id - a.inventario_id);

  let totalCustoOrc = 0;
  let totalVendaForn = 0;
  for (const o of orcamentos) {
    totalCustoOrc += o.total_custo;
    totalVendaForn += o.total_venda_forn;
  }

  const compras = await listarComprasFornecedor(fid);
  let totalCustoCompras = 0;
  for (const c of compras) totalCustoCompras += c.total_pago;

  const totalCusto = totalCustoOrc + totalCustoCompras;
  const materiais = await listarMateriaisControleAdmin(fid);

  return {
    fornecedor,
    resumo: {
      total_custo: totalCusto,
      total_custo_orcamentos: totalCustoOrc,
      total_custo_compras: totalCustoCompras,
      total_venda: totalVendaForn,
      margem: totalVendaForn - totalCusto,
      qtd_orcamentos: orcamentos.length,
      qtd_itens: itensAvulsos.length,
      qtd_compras: compras.length,
    },
    compras,
    orcamentos,
    itens: itensAvulsos,
    materiais,
  };
}

export async function lancarCompraFornecedorAdmin(
  fornecedorId: number,
  materialId: number,
  metrosRaw: string | number,
  valorRaw: string | number,
  observacao: string,
  atualizarCustoMaterial: boolean,
): Promise<{ ok: boolean; message: string }> {
  const fid = int(fornecedorId);
  const mid = int(materialId);
  const metros =
    typeof metrosRaw === "number" ? metrosRaw : parseMoney(String(metrosRaw));
  const valorUnit = parseMoney(String(valorRaw));

  if (fid <= 0 || mid <= 0) {
    return { ok: false, message: "Fornecedor e material são obrigatórios." };
  }
  if (metros <= 0) {
    return { ok: false, message: "Informe a quantidade (metros) maior que zero." };
  }
  if (valorUnit < 0) {
    return { ok: false, message: "Informe o valor pago por metro." };
  }

  const prisma = await getPrisma();
  const forn = await prisma.$queryRawUnsafe<{ id: unknown }[]>(
    `SELECT id FROM fornecedores WHERE id = ${fid} LIMIT 1`,
  );
  if (!forn[0]) return { ok: false, message: "Fornecedor não encontrado." };

  const mat = await prisma.$queryRawUnsafe<{ id: unknown }[]>(
    `SELECT id FROM materiais WHERE id = ${mid} LIMIT 1`,
  );
  if (!mat[0]) return { ok: false, message: "Material não encontrado." };

  const m = metros.toFixed(2);
  const v = Math.max(0, valorUnit).toFixed(2);
  const obs = escSql(observacao.trim());

  await prisma.$executeRawUnsafe(
    `INSERT INTO fornecedor_compras (fornecedor_id, material_id, metros, valor_unitario, observacao)
     VALUES (${fid}, ${mid}, '${m}', '${v}', '${obs}')`,
  );

  if (atualizarCustoMaterial) {
    await prisma.$executeRawUnsafe(
      `UPDATE materiais SET valor_custo = '${v}', fornecedor_id = ${fid} WHERE id = ${mid}`,
    );
  }

  return { ok: true, message: "Compra lançada com sucesso." };
}

export async function excluirCompraFornecedor(
  compraId: number,
  fornecedorId: number,
): Promise<{ ok: boolean; message: string }> {
  const prisma = await getPrisma();
  const cid = int(compraId);
  const fid = int(fornecedorId);
  if (cid <= 0 || fid <= 0) {
    return { ok: false, message: "Lançamento inválido." };
  }
  await prisma.$executeRawUnsafe(
    `DELETE FROM fornecedor_compras WHERE id = ${cid} AND fornecedor_id = ${fid}`,
  );
  return { ok: true, message: "Lançamento removido." };
}

export async function devolverCompraFornecedor(
  compraId: number,
  fornecedorId: number,
  metrosDevolverRaw: string | number,
  motivo: string,
): Promise<{ ok: boolean; message: string }> {
  const prisma = await getPrisma();
  const cid = int(compraId);
  const fid = int(fornecedorId);
  if (cid <= 0 || fid <= 0) {
    return { ok: false, message: "Lançamento inválido." };
  }

  const rows = await prisma.$queryRawUnsafe<Record<string, unknown>[]>(
    `SELECT c.*, m.material AS material_nome FROM fornecedor_compras c
     INNER JOIN materiais m ON m.id = c.material_id
     WHERE c.id = ${cid} AND c.fornecedor_id = ${fid} LIMIT 1`,
  );
  if (!rows[0]) {
    return { ok: false, message: "Lançamento de compra não encontrado." };
  }

  const compra = enriquecerCompra(rows[0]);
  const metrosDevolver =
    typeof metrosDevolverRaw === "number"
      ? metrosDevolverRaw
      : parseMoney(String(metrosDevolverRaw));

  if (metrosDevolver <= 0) {
    return { ok: false, message: "Informe quantos metros estão sendo devolvidos (maior que zero)." };
  }
  if (metrosDevolver > compra.metros_disponivel_devolver + 0.0001) {
    return {
      ok: false,
      message: `A devolução não pode passar de ${compra.metros_disponivel_devolver.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m.`,
    };
  }

  const novoDevolvido = compra.metros_devolvidos + metrosDevolver;
  const linhaDev = `Devolução ${new Date().toLocaleString("pt-BR")}: ${metrosDevolver.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m${motivo.trim() ? ` — ${motivo.trim()}` : ""}`;
  const obsAtual = (compra.observacao ?? "").trim();
  const obsNova = obsAtual ? `${obsAtual} | ${linhaDev}` : linhaDev;

  await prisma.$executeRawUnsafe(
    `UPDATE fornecedor_compras
     SET metros_devolvidos = '${novoDevolvido.toFixed(2)}',
         observacao = '${escSql(obsNova)}'
     WHERE id = ${cid} AND fornecedor_id = ${fid}`,
  );

  const restante = Math.max(0, compra.metros - novoDevolvido);
  return {
    ok: true,
    message: `Devolução registrada. Permanecem ${restante.toLocaleString("pt-BR", { minimumFractionDigits: 2 })} m em estoque/custo deste lançamento.`,
  };
}
