import {
  pagamentoEhLegadoSemanal,
  pagamentoFimSemana,
  pagamentoInicioSemana,
} from "@/lib/funcionario-pagamento-dates";

function partesYmd(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return { y: m[1], mo: m[2], d: m[3] };
}

function inicioNormalizado(periodoInicio: string): string {
  return pagamentoInicioSemana(periodoInicio);
}

function mesCurto(ymd: string): string {
  const p = partesYmd(ymd);
  if (!p) return "";
  return new Date(Number(p.y), Number(p.mo) - 1, Number(p.d)).toLocaleDateString("pt-BR", {
    month: "short",
    year: "numeric",
  });
}

/** 1ª ou 2ª quinzena do mês; null se registro legado semanal. */
export function pagamentoNumeroQuinzena(periodoInicio: string): 1 | 2 | null {
  const ini = inicioNormalizado(periodoInicio);
  if (pagamentoEhLegadoSemanal(ini)) return null;
  const day = Number.parseInt(ini.slice(8, 10), 10);
  return day === 1 ? 1 : 2;
}

/** Ex.: "1ª quinzena · jun. de 2026" */
export function pagamentoTituloQuinzena(periodoInicio: string): string {
  const ini = inicioNormalizado(periodoInicio);
  if (pagamentoEhLegadoSemanal(ini)) {
    return `${pagamentoFormatarSemana(ini)} (semana)`;
  }
  const num = pagamentoNumeroQuinzena(ini);
  return `${num}ª quinzena · ${mesCurto(ini)}`;
}

export function pagamentoFormatarSemana(semanaInicio: string): string {
  const ini = inicioNormalizado(semanaInicio);
  const fmt = (s: string) => {
    const p = partesYmd(s);
    if (!p) return s;
    return new Date(Number(p.y), Number(p.mo) - 1, Number(p.d)).toLocaleDateString("pt-BR");
  };
  return `${fmt(ini)} a ${fmt(pagamentoFimSemana(ini))}`;
}

/** Uma linha: 01–15/06, 16–30/06 ou 28/05–03/06 (legado) */
export function pagamentoFormatarSemanaCompacta(semanaInicio: string): string {
  const iniYmd = inicioNormalizado(semanaInicio);
  const ini = partesYmd(iniYmd);
  const fim = partesYmd(pagamentoFimSemana(iniYmd));
  if (!ini || !fim) return pagamentoFormatarSemana(semanaInicio);
  if (ini.mo === fim.mo && ini.y === fim.y) return `${ini.d}–${fim.d}/${ini.mo}`;
  return `${ini.d}/${ini.mo}–${fim.d}/${fim.mo}`;
}

/** Colunas do mapa: "1ª jun" ou "2ª jun" */
export function pagamentoFormatarQuinzenaMapa(semanaInicio: string): string {
  const ini = inicioNormalizado(semanaInicio);
  if (pagamentoEhLegadoSemanal(ini)) return pagamentoFormatarSemanaCompacta(ini);
  const num = pagamentoNumeroQuinzena(ini);
  const p = partesYmd(ini);
  if (!p || !num) return pagamentoFormatarSemanaCompacta(ini);
  const mes = new Date(Number(p.y), Number(p.mo) - 1, 1)
    .toLocaleDateString("pt-BR", { month: "short" })
    .replace(/\./g, "")
    .trim();
  return `${num}ª ${mes}`;
}

export function primeiroNome(nome: string): string {
  const t = nome.trim();
  if (!t) return "";
  return t.split(/\s+/)[0] ?? t;
}

export function formatMoeda(n: number): string {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

export function parseValorInput(raw: string): number {
  const v = String(raw).replace(/R\$\s?/g, "").replace(/\s/g, "").replace(/\./g, "").replace(",", ".");
  const n = parseFloat(v);
  return Number.isFinite(n) ? Math.max(0, Math.round(n * 100) / 100) : 0;
}

export function formatValorInput(n: number): string {
  return n.toFixed(2).replace(".", ",");
}
