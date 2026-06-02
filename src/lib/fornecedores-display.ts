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

export function formatDocumentoExib(doc: string): string {
  const d = doc.replace(/\D/g, "");
  if (d.length === 11) {
    return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
  }
  if (d.length === 14) return formatCnpjExib(doc);
  return doc.trim() || "—";
}

export function documentoRotulo(doc: string): "CPF" | "CNPJ" {
  return doc.replace(/\D/g, "").length === 11 ? "CPF" : "CNPJ";
}

export function formatEnderecoFornecedor(f: {
  endereco?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  cidade?: string | null;
  uf?: string | null;
}): string {
  const parts = [
    (f.endereco ?? "").trim(),
    (f.numero ?? "").trim() ? `nº ${f.numero!.trim()}` : "",
    (f.complemento ?? "").trim(),
    (f.bairro ?? "").trim(),
    `${(f.cidade ?? "").trim()}${(f.uf ?? "").trim() ? `/${f.uf!.trim()}` : ""}`.trim(),
  ].filter(Boolean);
  return parts.join(" — ");
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

/** Data/hora compacta para tabelas (ex.: 01/06/26, 22:19). */
export function formatDataHoraCurta(raw: string | null): string {
  if (!raw) return "—";
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Primeiro + último sobrenome (ex.: José Roberto da Silva Gimenes → José Gimenes). */
export function abreviarNomePessoa(nome: string, maxLen = 22): string {
  const trimmed = nome.trim();
  if (!trimmed) return "—";
  const parts = trimmed.split(/\s+/).filter(Boolean);
  let short = parts.length <= 2 ? trimmed : `${parts[0]} ${parts[parts.length - 1]}`;
  if (short.length > maxLen) short = `${short.slice(0, maxLen - 1).trimEnd()}…`;
  return short;
}
