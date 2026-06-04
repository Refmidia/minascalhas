import type { PrismaClient } from "@prisma/client";

import {
  formatHoraVisitaExibicao,
  resolveHoraVisitaInventario,
} from "@/lib/inventario-format";
import { parseOrcamentoJson, valorOrcamentoParaExibicao } from "@/lib/orcamento.server";
import type { AgendamentoInput, AgendamentoSiteInput } from "@/lib/validation";

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

/** Hora atual (America/Sao_Paulo) — quando o cliente agenda pelo site sem informar horário. */
export function agendamentoHoraAtualBr(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Normaliza hora do formulário (input time) para gravar em hora-visita (HH:MM). */
export function normalizarHoraVisitaDb(horaRaw: string): string {
  const fmt = formatHoraVisitaExibicao(horaRaw.trim());
  return (fmt || agendamentoHoraAtualBr()).slice(0, 50);
}

/** Data/hora da visita agendada (fuso São Paulo) para coluna agendado_em. */
export function montarAgendadoEm(dataInput: string, horaRaw: string): Date {
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(dataInput.trim())
    ? dataInput.trim()
    : dataBrParaInput(dataInput.trim());
  const hora = normalizarHoraVisitaDb(horaRaw);
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  const hm = hora.match(/^(\d{2}):(\d{2})$/);
  if (!m || !hm) return new Date();
  return new Date(`${m[1]}-${m[2]}-${m[3]}T${hm[1]}:${hm[2]}:00-03:00`);
}

function horaInformadaNoPayload(data: AgendamentoInput | AgendamentoSiteInput): string {
  return "hora" in data && typeof data.hora === "string" ? data.hora.trim() : "";
}

/** Preenche hora-visita vazia no banco a partir de agendado_em / data (máx. por requisição). */
export async function backfillInventarioHorasVazias(
  prisma: PrismaClient,
  rows: { id: number; status: string; horaVisita: string; dataVisita: string; agendadoEm?: Date | null }[],
  limit = 40,
): Promise<void> {
  let gravados = 0;
  for (const row of rows) {
    if (gravados >= limit) break;
    if (String(row.horaVisita ?? "").trim()) continue;

    const resolvida = resolveHoraVisitaInventario({
      horaVisita: row.horaVisita,
      dataVisita: row.dataVisita,
      agendadoEm: row.agendadoEm,
      status: row.status,
    });
    if (!resolvida) continue;

    try {
      await prisma.inventario.update({
        where: { id: row.id },
        data: { horaVisita: resolvida },
      });
      row.horaVisita = resolvida;
      gravados++;
    } catch {
      /* coluna ou permissão — exibição ainda usa resolve na serialização */
    }
  }
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
    horaVisita: resolveHoraVisitaInventario({
      horaVisita: row.horaVisita,
      dataVisita: row.dataVisita,
      agendadoEm: row.agendadoEm,
      status: row.status,
    }),
    agendadoEm: row.agendadoEm ?? null,
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
    horaVisita: normalizarHoraVisitaDb(horaInformadaNoPayload(data) || agendamentoHoraAtualBr()),
    observacao: data.observacao?.trim() || null,
    funcionario: funcionarioId ?? null,
    valor: 0,
    descontoPercent: 0,
    formaPagamento: null,
    dataMontagem: null,
    orcamento: null,
    agendadoEm: montarAgendadoEm(data.data, horaInformadaNoPayload(data) || agendamentoHoraAtualBr()),
  };
}

/** Cria inventário mesmo se a coluna agendado_em ainda não existir no MySQL. */
export async function criarInventarioAgendamento(
  prisma: PrismaClient,
  data: ReturnType<typeof buildInventarioCreateData>,
) {
  try {
    return await prisma.inventario.create({ data });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "";
    const code =
      err && typeof err === "object" && "code" in err ? String((err as { code: string }).code) : "";
    if (code === "P2022" || msg.includes("agendado_em")) {
      const { agendadoEm: _omit, ...semAgendado } = data;
      return await prisma.inventario.create({ data: semAgendado });
    }
    throw err;
  }
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
