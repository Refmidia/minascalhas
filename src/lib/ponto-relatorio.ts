export type PontoRelatorioJornada = {
  usuario_id: number;
  usuario_nome: string;
  data: string;
  data_fmt: string;
  entrada_fmt: string;
  almoco_fmt: string;
  retorno_fmt: string;
  saida_fmt: string;
  intervalo_fmt: string;
  total_fmt: string;
  minutos_trabalhados: number | null;
  aberto: boolean;
  status_label: string;
};

export type PontoRelatorioGrupo = {
  usuario_id: number;
  usuario_nome: string;
  jornadas: PontoRelatorioJornada[];
  dias: number;
  minutos: number;
  total_fmt: string;
};

const MES_RE = /^\d{4}-\d{2}$/;
const ISO_DIA_RE = /^\d{4}-\d{2}-\d{2}$/;

export function periodoDoMes(yyyyMm: string): { de: string; ate: string } {
  if (!MES_RE.test(yyyyMm)) {
    const hoje = new Date();
    const y = hoje.getFullYear();
    const m = String(hoje.getMonth() + 1).padStart(2, "0");
    return periodoDoMes(`${y}-${m}`);
  }
  const [ys, ms] = yyyyMm.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const ultimo = new Date(y, m, 0).getDate();
  return {
    de: `${ys}-${ms}-01`,
    ate: `${ys}-${ms}-${String(ultimo).padStart(2, "0")}`,
  };
}

export function diasNoMes(yyyyMm: string): number {
  const { ate } = periodoDoMes(yyyyMm);
  return Number(ate.slice(8, 10)) || 0;
}

export function shiftYm(yyyyMm: string, delta: number): string {
  const base = MES_RE.test(yyyyMm) ? yyyyMm : "2000-01";
  const y = Number(base.slice(0, 4));
  const m = Number(base.slice(5, 7));
  const d = new Date(y, m - 1 + delta, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

/**
 * Liberação temporária: junho/2026 fica disponível mesmo sem quinzena fechada.
 * Depois voltamos só à regra de mês calendário (último dia do mês).
 */
export const MESES_PONTO_PDF_LIBERADOS = ["2026-06"] as const;

/** Mês já terminou (passou o último dia) ou está na lista temporária. */
export function mesPontoPdfLiberado(yyyyMm: string, hojeIso: string): boolean {
  if ((MESES_PONTO_PDF_LIBERADOS as readonly string[]).includes(yyyyMm)) return true;
  const { ate } = periodoDoMes(yyyyMm);
  return Boolean(hojeIso && ate && hojeIso > ate);
}

export function formatMesPonto(yyyyMm: string): string {
  if (!MES_RE.test(yyyyMm)) return yyyyMm;
  const [y, m] = yyyyMm.split("-").map(Number);
  const s = new Date(y, m - 1, 1).toLocaleDateString("pt-BR", {
    month: "long",
    year: "numeric",
  });
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function formatIsoDataBr(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

export function formatMinutosRelatorio(minutos: number | null): string {
  if (minutos === null || minutos < 0) return "—";
  if (minutos === 0) return "0min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

export function weekdayCurtoIso(iso: string): string {
  if (!ISO_DIA_RE.test(iso)) return "";
  const d = new Date(`${iso}T12:00:00-03:00`);
  if (Number.isNaN(d.getTime())) return "";
  return d
    .toLocaleDateString("pt-BR", { weekday: "short" })
    .replace(".", "")
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function agruparJornadasPorFuncionario(
  jornadas: PontoRelatorioJornada[],
): PontoRelatorioGrupo[] {
  const map = new Map<number, PontoRelatorioGrupo>();

  const ordenadas = [...jornadas].sort((a, b) => {
    const nome = a.usuario_nome.localeCompare(b.usuario_nome, "pt-BR");
    if (nome !== 0) return nome;
    return a.data.localeCompare(b.data);
  });

  for (const j of ordenadas) {
    let grupo = map.get(j.usuario_id);
    if (!grupo) {
      grupo = {
        usuario_id: j.usuario_id,
        usuario_nome: j.usuario_nome,
        jornadas: [],
        dias: 0,
        minutos: 0,
        total_fmt: "—",
      };
      map.set(j.usuario_id, grupo);
    }
    grupo.jornadas.push(j);
    grupo.dias += 1;
    grupo.minutos += Math.max(0, j.minutos_trabalhados ?? 0);
  }

  const grupos = [...map.values()];
  for (const g of grupos) {
    g.total_fmt = formatMinutosRelatorio(g.minutos);
  }
  return grupos;
}

export function nomeArquivoPontoRelatorio(de: string, ate: string, funcionario?: string): string {
  const mes = de.slice(0, 7);
  const slug =
    (funcionario ?? "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 40) || "";
  const periodo = de.slice(0, 7) === ate.slice(0, 7) ? mes : `${de}_a_${ate}`;
  return slug
    ? `Ponto-${periodo}-${slug}-MinasCalhas.pdf`
    : `Ponto-${periodo}-MinasCalhas.pdf`;
}
