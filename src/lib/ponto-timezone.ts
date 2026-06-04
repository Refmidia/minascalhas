/** Fuso do bate-ponto — igual ao PHP (appFusoHorario / America/Sao_Paulo). */
export const PONTO_TIMEZONE = "America/Sao_Paulo";

/** Brasil sem horário de verão desde 2019. */
const PONTO_ISO_OFFSET = "-03:00";

export const PONTO_SQL_DT_RE = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}):(\d{2})$/;
const SQL_DT_RE = PONTO_SQL_DT_RE;

/**
 * Converte valor vindo do MySQL/Prisma/JSON para `Y-m-d H:i:s` de parede (São Paulo).
 * O driver trata DATETIME sem fuso como UTC no objeto Date — usamos os componentes UTC
 * como o mesmo relógio gravado no banco (igual ao PHP).
 */
export function pontoSerializarDatetime(raw: unknown): string {
  if (raw == null || raw === "") return "";
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const p = (n: number) => String(n).padStart(2, "0");
    return `${raw.getUTCFullYear()}-${p(raw.getUTCMonth() + 1)}-${p(raw.getUTCDate())} ${p(raw.getUTCHours())}:${p(raw.getUTCMinutes())}:${p(raw.getUTCSeconds())}`;
  }

  const s = String(raw).trim();
  if (!s) return "";

  const isoZ = s.match(
    /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2}):(\d{2})(?:\.\d+)?Z$/i,
  );
  if (isoZ) {
    return `${isoZ[1]}-${isoZ[2]}-${isoZ[3]} ${isoZ[4]}:${isoZ[5]}:${isoZ[6]}`;
  }

  const sql = s.match(/^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})/);
  if (sql) return `${sql[1]} ${sql[2]}`;

  return s;
}

/**
 * Interpreta DATETIME do MySQL como horário de parede em São Paulo (como o PHP).
 */
export function parsePontoDatetime(raw: string | null | undefined): Date {
  const sql = pontoSerializarDatetime(raw ?? "");
  if (!sql) return new Date(NaN);

  const m = sql.match(SQL_DT_RE);
  if (m) {
    const [, y, mo, d, h, mi, se] = m;
    return new Date(`${y}-${mo}-${d}T${h}:${mi}:${se}${PONTO_ISO_OFFSET}`);
  }

  return new Date(sql);
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
  const sql = pontoSerializarDatetime(raw);
  if (!sql) return "—";
  const m = sql.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}:${m[3]}`;
  const d = parsePontoDatetime(sql);
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
  const sql = pontoSerializarDatetime(raw);
  const m = sql.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (m) return `${m[3]}/${m[2]}/${m[1]}`;
  const d = parsePontoDatetime(sql);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: PONTO_TIMEZONE }).format(d);
}

export function formatDataHoraPontoTz(raw: string): { data: string; hora: string } {
  return {
    data: formatDataPontoTz(raw),
    hora: formatHoraPontoTz(raw),
  };
}

/** Hora para input type="time" com segundos (HH:MM:SS). */
export function horaInputFromPontoSql(raw: string): string {
  const sql = pontoSerializarDatetime(raw);
  const m = sql.match(/(\d{2}):(\d{2}):(\d{2})/);
  if (m) return `${m[1]}:${m[2]}:${m[3]}`;
  const m2 = sql.match(/(\d{2}):(\d{2})/);
  if (m2) return `${m2[1]}:${m2[2]}:00`;
  return "";
}

/** Monta Y-m-d H:i:s a partir da data da jornada e hora digitada. */
export function montarDatetimePonto(dataIso: string, horaRaw: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dataIso.trim())) return null;
  const h = horaRaw.trim();
  const m = h.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
  if (!m) return null;
  const hh = m[1].padStart(2, "0");
  const mi = m[2].padStart(2, "0");
  const se = (m[3] ?? "00").padStart(2, "0");
  if (Number(hh) > 23 || Number(mi) > 59 || Number(se) > 59) return null;
  return `${dataIso} ${hh}:${mi}:${se}`;
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
