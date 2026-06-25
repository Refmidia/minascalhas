/**
 * Normaliza colunas DATE do MySQL (Prisma devolve Date em UTC meia-noite).
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
export function ymdLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYmdLocal(ymd: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  return m ? new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])) : new Date();
}

/** Pagamento quinzenal: 1–15 ou 16–último dia do mês. */
export function pagamentoInicioPeriodo(dataYmd: string): string {
  const d = parseYmdLocal(dataYmd);
  const y = d.getFullYear();
  const mo = d.getMonth();
  if (d.getDate() <= 15) return ymdLocal(new Date(y, mo, 1));
  return ymdLocal(new Date(y, mo, 16));
}

export function pagamentoFimPeriodo(periodoInicio: string): string {
  const ini = pagamentoInicioPeriodo(periodoInicio);
  const d = parseYmdLocal(ini);
  if (d.getDate() === 1) return ymdLocal(new Date(d.getFullYear(), d.getMonth(), 15));
  return ymdLocal(new Date(d.getFullYear(), d.getMonth() + 1, 0));
}

export function pagamentoPeriodoAnterior(periodoInicio: string): string {
  const d = parseYmdLocal(pagamentoInicioPeriodo(periodoInicio));
  if (d.getDate() === 1) {
    d.setMonth(d.getMonth() - 1);
    d.setDate(16);
  } else {
    d.setDate(1);
  }
  return ymdLocal(d);
}

export function pagamentoPeriodoProximo(periodoInicio: string): string {
  const d = parseYmdLocal(pagamentoInicioPeriodo(periodoInicio));
  if (d.getDate() === 1) {
    d.setDate(16);
  } else {
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
  }
  return ymdLocal(d);
}

/** Registros antigos (início na segunda) continuam legíveis no histórico. */
export function pagamentoEhLegadoSemanal(periodoInicio: string): boolean {
  const ymd = ymdFromDb(periodoInicio) || periodoInicio;
  const day = Number.parseInt(ymd.slice(8, 10), 10);
  return day !== 1 && day !== 16;
}

/** @deprecated Use pagamentoInicioPeriodo — mantido para parâmetros `semana` da API. */
export function pagamentoInicioSemana(dataYmd: string): string {
  const ymd = ymdFromDb(dataYmd) || dataYmd;
  if (pagamentoEhLegadoSemanal(ymd)) {
    const d = parseYmdLocal(ymd);
    const dow = d.getDay();
    const diff = dow === 0 ? 6 : dow - 1;
    d.setDate(d.getDate() - diff);
    return ymdLocal(d);
  }
  return pagamentoInicioPeriodo(ymd);
}

/** @deprecated Use pagamentoFimPeriodo */
export function pagamentoFimSemana(semanaInicio: string): string {
  const ini = pagamentoInicioSemana(semanaInicio);
  if (pagamentoEhLegadoSemanal(ini)) {
    const d = parseYmdLocal(ini);
    d.setDate(d.getDate() + 6);
    return ymdLocal(d);
  }
  return pagamentoFimPeriodo(ini);
}

export type DiaPeriodo = {
  chave: string;
  data: string;
  label: string;
};

/** Dias úteis (seg–sex) dentro do período de pagamento. */
export function diasUteisPeriodo(periodoInicio: string): DiaPeriodo[] {
  const ini = pagamentoInicioSemana(periodoInicio);
  const fim = pagamentoFimSemana(ini);
  const out: DiaPeriodo[] = [];
  const cur = parseYmdLocal(ini);
  const end = parseYmdLocal(fim);
  while (cur <= end) {
    const dow = cur.getDay();
    if (dow >= 1 && dow <= 5) {
      const data = ymdLocal(cur);
      out.push({
        chave: data,
        data,
        label: cur.toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          month: "2-digit",
        }),
      });
    }
    cur.setDate(cur.getDate() + 1);
  }
  return out;
}
