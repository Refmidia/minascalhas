import type { AgendamentoItem } from "@/lib/admin-api";

/** Endereço completo como no PHP parseInventarioRow(). */
export function buildEnderecoCompleto(item: Pick<AgendamentoItem, "endereco" | "numero" | "bairro" | "cep">): string {
  const linha = [item.endereco, item.numero, item.bairro].filter(Boolean).join(", ");
  const cep = item.cep?.trim();
  if (!linha && !cep) return "";
  if (cep) return linha ? `${linha} - ${cep}` : cep;
  return linha;
}

export function googleMapsUrlEndereco(endereco: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(endereco.trim())}`;
}

export type EnderecoParts = {
  endereco?: string | null;
  numero?: string | null;
  bairro?: string | null;
  cep?: string | null;
};

/** Monta linha de endereço para exibição e link do Maps. */
export function joinEnderecoParts(parts: EnderecoParts): string {
  const linha = [parts.endereco, parts.numero, parts.bairro]
    .map((p) => (p ?? "").trim())
    .filter(Boolean)
    .join(", ");
  const cep = (parts.cep ?? "").trim();
  if (!linha && !cep) return "";
  if (cep) return linha ? `${linha} — ${cep}` : cep;
  return linha;
}
