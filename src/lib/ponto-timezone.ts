/** Fuso do bate-ponto — igual ao PHP (appFusoHorario / America/Sao_Paulo). */
export const PONTO_TIMEZONE = "America/Sao_Paulo";

/** Brasil sem horário de verão desde 2019. */
const PONTO_ISO_OFFSET = "-03:00";

/**
 * Interpreta DATETIME do MySQL como horário de parede em São Paulo (como o PHP).
 */
export function parsePontoDatetime(raw: string | null | undefined): Date {
  if (raw == null) return new Date(NaN);
  const s = String(raw).trim();
  if (!s) return new Date(NaN);

  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}):(\d{2}))?/);
  if (m) {
    const [, y, mo, d, h = "00", mi = "00", se = "00"] = m;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}${PONTO_ISO_OFFSET}`);
  }

  return new Date(s);
}

/** Data/hora atual para gravar no banco (Y-m-d H:i:s). */
export function pontoAgoraSql(now = new Date()): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: PONTO_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).formatToParts(now);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";
  return `${get("year")}-${get("month")}-${get("day")} ${get("hour")}:${get("minute")}:${get("second")}`;
}

/** YYYY-MM-DD no fuso de São Paulo (agrupar jornadas). */
export function pontoDiaChave(raw: string): string {
  const d = parsePontoDatetime(raw);
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("en-CA", { timeZone: PONTO_TIMEZONE }).format(d);
}

export function pontoHojeIso(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: PONTO_TIMEZONE }).format(new Date());
}

export function formatHoraPontoTz(raw: string | null): string {
  if (!raw) return "—";
  const d = parsePontoDatetime(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PONTO_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(d);
}

export function formatDataPontoTz(raw: string): string {
  const d = parsePontoDatetime(raw);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: PONTO_TIMEZONE }).format(d);
}

export function formatDataHoraPontoTz(raw: string): { data: string; hora: string } {
  return {
    data: formatDataPontoTz(raw),
    hora: formatHoraPontoTz(raw),
  };
}

export function formatAgoraPontoControle(): string {
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: PONTO_TIMEZONE,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}
