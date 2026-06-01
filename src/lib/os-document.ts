import type { AgendamentoItem } from "@/lib/admin-api";
import { inventarioSubtotalOrcamento, type OrcamentoLinha } from "@/lib/orcamento.server";

/** Cabeçalho fixo do PDF de orçamento (Alex os.php). */
export const OS_ORCAMENTO_EMPRESA = {
  tagline: "Calhas - Rufos e Pingadeiras",
  telefones: "18 996475269    996069273",
  cnpjIe: "CNPJ: 28.376.837/0001-59 - IE:731.021.804.118",
  enderecoLinha1: "Endereço: Rua Angelim, 137 - Distrito Industrial",
  enderecoLinha2: "Tarumã - SP",
  logoSrc: "/images/logo/logo-preto.png",
} as const;

export function formatOsMoney(value: number): string {
  return value.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatOsTelefone(telefone: string): string {
  const d = telefone.replace(/\D/g, "");
  if (d.length < 10) return telefone.trim() || "—";
  if (d.length === 11) {
    return d.replace(/(\d{2})(\d{5})(\d{4})/, "($1) $2-$3");
  }
  return d.replace(/(\d{2})(\d{4})(\d{4})/, "($1) $2-$3");
}

export function formatOsDocumento(doc: string | null | undefined): string {
  const d = (doc ?? "").replace(/\D/g, "");
  if (!d || d === "00000000000" || d === "00000000000000") return "—";
  if (d.length === 11) return d.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  if (d.length === 14) return d.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, "$1.$2.$3/$4-$5");
  return doc?.trim() || "—";
}

export function formatOsEndereco(item: AgendamentoItem): string {
  const parts = [item.endereco, item.numero, item.bairro].filter(Boolean);
  const base = parts.join(", ");
  const cep = (item.cep ?? "").trim();
  if (!base && !cep) return "—";
  return cep ? `${base} - ${cep}` : base;
}

export function calcTotaisOrcamento(itens: OrcamentoLinha[], valorFinal: number) {
  const subtotalMateriais = inventarioSubtotalOrcamento(itens);
  const bruto = Math.max(subtotalMateriais, valorFinal);
  const desconto = Math.max(0, bruto - valorFinal);
  return { subtotalMateriais, bruto, desconto, total: valorFinal };
}

export function dataEmissaoOs(): { data: string; hora: string } {
  const now = new Date();
  const data = now.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const hora = now.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });
  return { data, hora };
}
