/**
 * Normaliza colunas DATE do MySQL (Prisma devolve Date em UTC meia-noite).
 * Evita chaves quebradas no mapa e semana errada no histórico.
 */
export function ymdFromDb(value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "string") {
    const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value.trim());
    if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  }
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const y = value.getUTCFullYear();
    const m = String(value.getUTCMonth() + 1).padStart(2, "0");
    const d = String(value.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const s = String(value);
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const parsed = new Date(s);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
}

/** Data YYYY-MM-DD no fuso local. */
export function ymdLocal(d: Date): string {  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function pagamentoInicioSemana(dataYmd: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dataYmd.trim());
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  const day = d.getDay();
  const diff = day === 0 ? 6 : day - 1;
  d.setDate(d.getDate() - diff);
  return ymdLocal(d);
}

export function pagamentoFimSemana(semanaInicio: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(semanaInicio);
  const d = m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
  d.setDate(d.getDate() + 6);
  return ymdLocal(d);
}
