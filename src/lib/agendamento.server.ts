import type { AgendamentoInput, AgendamentoSiteInput } from "@/lib/validation";
import { parseOrcamentoJson, valorOrcamentoParaExibicao } from "@/lib/orcamento.server";

export { INVENTARIO_STATUS, type InventarioStatus } from "@/lib/agendamento-constants";

/** Converte YYYY-MM-DD (input date) → DD-MM-YYYY (banco legado). */
export function toDataVisitaBr(isoDate: string): string {
  const [y, m, d] = isoDate.trim().split("-");
  if (!y || !m || !d) return isoDate;
  return `${d.padStart(2, "0")}-${m.padStart(2, "0")}-${y}`;
}

/** Converte DD-MM-YYYY → YYYY-MM-DD (input date). */
export function dataBrParaInput(data: string): string {
  const t = data.trim();
  const m = t.match(/^(\d{2})-(\d{2})-(\d{4})$/);
  if (!m) return t;
  return `${m[3]}-${m[2]}-${m[1]}`;
}

export function dataInputParaDb(isoDate: string): string {
  if (!isoDate.trim()) return "";
  return toDataVisitaBr(isoDate);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function serializeInventario(row: any) {
  const orcamentoItens = parseOrcamentoJson(row.orcamento);
  const valorGravado = row.valor != null ? Number(row.valor) : 0;
  const descontoPercent = row.descontoPercent != null ? Number(row.descontoPercent) : 0;
  const valor =
    orcamentoItens.length > 0
      ? valorOrcamentoParaExibicao(valorGravado, descontoPercent, orcamentoItens)
      : valorGravado;

  return {
    id: Number(row.id),
    status: row.status,
    nome: row.nome,
    cpfCnpj: row.cpfCnpj ?? null,
    telefone: row.telefone,
    endereco: row.endereco,
    bairro: row.bairro,
    cep: row.cep ?? "",
    numero: row.numero,
    dataVisita: row.dataVisita,
    horaVisita: row.horaVisita,
    observacao: row.observacao ?? null,
    funcionario: row.funcionario ?? null,
    valor,
    descontoPercent,
    formaPagamento: row.formaPagamento ?? null,
    dataMontagem: row.dataMontagem ?? null,
    orcamentoItens,
    materiaisCount: orcamentoItens.length,
  };
}

export function inventarioWhereStatus(status?: string) {
  if (!status) return undefined;
  if (status === "orcamentado") {
    return { OR: [{ status: "orcamentado" }, { status: "orçamentado" }] };
  }
  return { status };
}

export function buildInventarioCreateData(
  data: AgendamentoInput | AgendamentoSiteInput,
  funcionarioId?: number | null,
) {
  return {
    status: "agendado",
    nome: data.nome.slice(0, 50),
    telefone: data.telefone.slice(0, 50),
    cpfCnpj: data.cpfCnpj?.trim() || null,
    endereco: data.endereco.slice(0, 50),
    bairro: data.bairro.slice(0, 50),
    numero: data.numero.slice(0, 50),
    cep: (data.cep?.trim() || "").slice(0, 50),
    dataVisita: toDataVisitaBr(data.data),
    horaVisita: ("hora" in data && typeof data.hora === "string" ? data.hora : "").trim().slice(0, 50),
    observacao: data.observacao?.trim() || null,
    funcionario: funcionarioId ?? null,
    valor: 0,
    descontoPercent: 0,
    formaPagamento: null,
    dataMontagem: null,
    orcamento: null,
  };
}

export function dbErrorMessage(err: unknown): string {
  const msg = err instanceof Error ? err.message : "";
  if (msg.includes("Authentication failed") || msg.includes("credentials")) {
    return "Senha ou usuário do MySQL incorretos. No painel Hostinger → Bancos de dados MySQL, confira o usuário u945870447_feroz01 e atualize DB_PASSWORD no .env (reinicie o npm run dev).";
  }
  if (err && typeof err === "object" && "code" in err) {
    const code = (err as { code: string }).code;
    if (code === "P1000") {
      return "MySQL recusou usuário/senha. Corrija DB_PASSWORD no .env com a senha definida na Hostinger para esse banco.";
    }
    if (code === "P1001") {
      return "Não foi possível alcançar o MySQL. Libere acesso remoto ao IP do seu PC na Hostinger ou teste pelo servidor de hospedagem.";
    }
    if (code === "P2021" || code === "P2022") {
      return "Tabela ou coluna inexistente. Confira se o schema Prisma está alinhado ao banco.";
    }
  }
  return err instanceof Error ? err.message : "Erro no banco de dados.";
}
