import { pagamentoFimSemana } from "@/lib/funcionario-pagamento-dates";

function partesYmd(ymd: string) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(ymd.trim());
  if (!m) return null;
  return { y: m[1], mo: m[2], d: m[3] };
}

export function pagamentoFormatarSemana(semanaInicio: string): string {
  const fmt = (s: string) => {
    const p = partesYmd(s);
    if (!p) return s;
    return new Date(Number(p.y), Number(p.mo) - 1, Number(p.d)).toLocaleDateString("pt-BR");
  };
  return `${fmt(semanaInicio)} a ${fmt(pagamentoFimSemana(semanaInicio))}`;
}

/** Uma linha: 25–31/05 ou 28/05–03/06 */
export function pagamentoFormatarSemanaCompacta(semanaInicio: string): string {
  const ini = partesYmd(semanaInicio);
  const fim = partesYmd(pagamentoFimSemana(semanaInicio));
  if (!ini || !fim) return pagamentoFormatarSemana(semanaInicio);
  if (ini.mo === fim.mo && ini.y === fim.y) return `${ini.d}–${fim.d}/${ini.mo}`;
  return `${ini.d}/${ini.mo}–${fim.d}/${fim.mo}`;
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
