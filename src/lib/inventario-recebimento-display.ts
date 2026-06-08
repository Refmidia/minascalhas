export const RECEBIMENTO_TIPOS = ["sinal", "parcela", "saldo", "outro"] as const;

export function labelRecebimentoTipo(tipo: string): string {
  switch (tipo) {
    case "sinal":
      return "Sinal";
    case "parcela":
      return "Parcela";
    case "saldo":
      return "Saldo";
    default:
      return "Outro";
  }
}

export function formatPagoEmExibicao(raw: string): string {
  const d = new Date(String(raw).replace(" ", "T"));
  if (Number.isNaN(d.getTime())) return raw;
  return d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}
