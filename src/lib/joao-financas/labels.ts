const statusMap: Record<string, string> = {
  em_dia: "Em dia",
  pago: "Pago",
  pendente: "Pendente",
  parcial: "Parcialmente pago",
  atrasado: "Atrasado",
  atrasada: "Atrasada",
  ativa: "Ativa",
  inativa: "Inativa",
  prevista: "Prevista",
  recebida: "Recebida",
  cancelada: "Cancelada",
  vence_hoje: "Vence hoje",
  vence_em_breve: "Vence em breve",
};

const priorityMap: Record<string, string> = {
  essencial: "Essencial",
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

const currencyMap: Record<string, string> = {
  BRL: "Real",
  USD: "Dólar",
};

const groupMap: Record<string, string> = {
  essenciais: "Contas essenciais",
  trabalho: "Ferramentas de trabalho",
  dividas: "Dívidas e parcelas",
  variaveis: "Gastos variáveis",
  outros: "Outros",
};

export function labelStatus(value?: string | null) {
  if (!value) return "—";
  return statusMap[value] || value.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

export function labelPriority(value?: string | null) {
  if (!value) return "—";
  return priorityMap[value] || value;
}

export function labelCurrency(value?: string | null) {
  if (!value) return "Real";
  return currencyMap[value] || value;
}

export function labelGroup(value?: string | null) {
  if (!value) return "Outros";
  return groupMap[value] || value;
}

export function statusTone(value?: string | null): "success" | "danger" | "warning" | "muted" | "primary" {
  switch (value) {
    case "pago":
    case "em_dia":
    case "recebida":
      return "success";
    case "atrasado":
    case "atrasada":
      return "danger";
    case "vence_hoje":
    case "vence_em_breve":
    case "parcial":
      return "warning";
    case "pendente":
    case "prevista":
      return "primary";
    default:
      return "muted";
  }
}

export function monthLabel(ym: string) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, (m || 1) - 1, 1);
  return new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(d);
}

export function shiftMonth(ym: string, delta: number) {
  const [y, m] = ym.split("-").map(Number);
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function computeBillDisplayStatus(input: {
  status: string;
  due_date: string;
  paid_amount: number;
  expected_amount: number;
}): string {
  const paid = input.paid_amount;
  const expected = input.expected_amount;
  if (paid >= expected - 0.001 || input.status === "pago") return "pago";
  if (paid > 0) return "parcial";

  const due = new Date(input.due_date + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return "atrasado";
  if (diff === 0) return "vence_hoje";
  if (diff <= 3) return "vence_em_breve";
  return "pendente";
}
