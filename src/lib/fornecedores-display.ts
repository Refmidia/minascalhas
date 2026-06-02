export function entregaNumeroNota(entregaId: number): string {
  return `NE-${String(entregaId).padStart(6, "0")}`;
}

export function fornecedorRotulo(f: {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  id?: number;
  fornecedor_id?: number;
}): string {
  const nf = (f.nome_fantasia ?? "").trim();
  const rs = (f.razao_social ?? "").trim();
  if (nf) return nf;
  if (rs) return rs;
  const fid = Number(f.fornecedor_id ?? f.id) || 0;
  return fid > 0 ? `Fornecedor #${fid}` : "Fornecedor";
}

export function fornecedorRotuloEmpresa(f: Parameters<typeof fornecedorRotulo>[0]): string {
  const nome = fornecedorRotulo(f);
  if (!/^Fornecedor #\d+$/.test(nome)) return nome;
  const fid = Number(f.fornecedor_id ?? f.id) || 0;
  return fid > 0
    ? `Fornecedor #${fid} (cadastro removido — recadastre em Administração)`
    : "Empresa não identificada";
}

export function formatMoeda(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function precoMaterialFornecedor(mat: {
  valor_fornecedor: number;
  valor_custo: number;
}): number {
  if (mat.valor_fornecedor > 0) return mat.valor_fornecedor;
  return mat.valor_custo > 0 ? mat.valor_custo : 0;
}

export function parseDecimalInput(raw: string): number {
  const s = raw.trim().replace(/\./g, "").replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? n : 0;
}

export function totalLinhaCarrinho(metros: string, valorUnit: string): number {
  return parseDecimalInput(metros) * parseDecimalInput(valorUnit);
}

export function formatCnpjExib(cnpj: string): string {
  const d = cnpj.replace(/\D/g, "");
  if (d.length !== 14) return cnpj.trim() || "—";
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function formatDataHora(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
