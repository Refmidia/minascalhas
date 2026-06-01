import { telefoneWhatsappLink } from "@/lib/format-br";

export function mensagemWhatsappOrcamento(nome: string, valor: number, comLink = true): string {
  const primeiro = nome.trim().split(/\s+/)[0] || "";
  const saudacao = primeiro ? `Olá, ${primeiro}!` : "Olá!";
  const v = valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const base = `${saudacao} Segue o orçamento da *Alex Calhas* no valor de *${v}*.`;
  if (!comLink) return base;
  const link =
    typeof window !== "undefined"
      ? `${window.location.origin}/os?id=${encodeURIComponent(String(""))}`
      : "";
  return `${base}\n${link}`;
}

export function abrirWhatsappOrcamento(item: {
  id: number;
  nome: string;
  telefone: string;
  valor: number;
}): void {
  const wa = telefoneWhatsappLink(item.telefone);
  if (!wa) {
    window.alert("Telefone inválido para WhatsApp.");
    return;
  }
  const primeiro = item.nome.trim().split(/\s+/)[0] || "";
  const saudacao = primeiro ? `Olá, ${primeiro}!` : "Olá!";
  const v = item.valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
  const link = `${window.location.origin}/os?id=${item.id}`;
  const text = `${saudacao} Segue o orçamento da *Alex Calhas* no valor de *${v}*:\n${link}`;
  window.open(`${wa}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
}

export function gerarOS(id: number): void {
  window.open(`/os?id=${id}`, "_blank", "noopener,noreferrer");
}
