import type { AgendamentoItem } from "@/lib/admin-api";

/** Hora atual em São Paulo (HH:MM) — momento do agendamento pelo site. */
export function horaAtualBr(): string {
  return new Date().toLocaleTimeString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

/** Tenta extrair hora embutida em data-visita legada (ex.: "03-06-2026 14:30"). */
export function extrairHoraDeDataVisita(dataVisita: string): string {
  const t = dataVisita.trim();
  const comEspaco = t.match(/^(\d{2}-\d{2}-\d{4})\s+(\d{1,2}:\d{2})/);
  if (comEspaco) return formatHoraVisitaExibicao(comEspaco[2]);
  const qualquer = t.match(/\b(\d{1,2}):(\d{2})(?::\d{2})?\b/);
  if (qualquer && t.length > 10) return formatHoraVisitaExibicao(`${qualquer[1]}:${qualquer[2]}`);
  return "";
}

export type InventarioHoraRow = {
  horaVisita?: string | null;
  dataVisita?: string | null;
  agendadoEm?: string | Date | null;
  status?: string | null;
};

/** Resolve hora a partir do banco (hora-visita, agendado_em, legado na data). */
export function resolveHoraVisitaInventario(item: InventarioHoraRow): string {
  const h = formatHoraVisitaExibicao(String(item.horaVisita ?? ""));
  if (h) return h;

  if (item.agendadoEm) {
    const d =
      item.agendadoEm instanceof Date ? item.agendadoEm : new Date(String(item.agendadoEm));
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleTimeString("pt-BR", {
        timeZone: "America/Sao_Paulo",
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });
    }
  }

  const legado = extrairHoraDeDataVisita(String(item.dataVisita ?? ""));
  if (legado) return legado;

  const dv = String(item.dataVisita ?? "").trim();
  if (item.status === "agendado" && /^\d{2}-\d{2}-\d{4}$/.test(dv)) {
    return "09:00";
  }

  return "";
}

/** Hora para listagem: campo hora-visita, agendado_em ou legado na data. */
export function horaParaExibicaoVisita(item: InventarioHoraRow): string {
  return resolveHoraVisitaInventario(item);
}

/** Normaliza hora gravada no banco para exibição (HH:MM). */
export function formatHoraVisitaExibicao(hora: string): string {
  const h = hora.trim();
  if (!h) return "";
  const m24 = h.match(/^(\d{1,2}):(\d{2})/);
  if (m24) return `${m24[1].padStart(2, "0")}:${m24[2]}`;
  const mh = h.match(/^(\d{1,2})\s*h\s*(\d{2})?/i);
  if (mh) return `${mh[1].padStart(2, "0")}:${(mh[2] ?? "00").padStart(2, "0")}`;
  const dots = h.match(/^(\d{1,2})\.(\d{2})/);
  if (dots) return `${dots[1].padStart(2, "0")}:${dots[2]}`;
  const soDigitos = h.replace(/\D/g, "");
  if (soDigitos.length === 4) {
    return `${soDigitos.slice(0, 2)}:${soDigitos.slice(2)}`;
  }
  return h.length > 8 ? h.slice(0, 8) : h;
}

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
