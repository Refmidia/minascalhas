/** Jornada oficial: 07:00 → 12:00 → 13:00 → 17:00, com quebras leves. */

const BASE: Record<string, { h: number; m: number }> = {
  entrada: { h: 7, m: 0 },
  almoco: { h: 12, m: 0 },
  retorno_almoco: { h: 13, m: 0 },
  saida: { h: 17, m: 0 },
};

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function temHoraFmt(fmt: string | null | undefined): boolean {
  return Boolean(fmt && fmt !== "—");
}

function hmsParaSegundos(hms: string): number {
  const m = /^(\d{2}):(\d{2}):(\d{2})$/.exec(hms);
  if (!m) return 0;
  return Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3]);
}

function minutosEntreHms(inicio: string, fim: string): number | null {
  const a = hmsParaSegundos(inicio);
  const b = hmsParaSegundos(fim);
  if (b <= a) return null;
  return Math.floor((b - a) / 60);
}

function formatMinutos(minutos: number | null): string {
  if (minutos === null || minutos < 0) return "—";
  if (minutos === 0) return "0min";
  const h = Math.floor(minutos / 60);
  const m = minutos % 60;
  if (h > 0) return `${h}h ${String(m).padStart(2, "0")}min`;
  return `${m}min`;
}

/**
 * Horário oficial da batida. Sempre tem segundos quebrados;
 * em ~30% dos casos também desloca 1–3 minutos (nunca número redondo).
 */
export function horaHierarquiaPonto(tipo: string, usuarioId: number, dataIso: string): string {
  const base = BASE[tipo];
  if (!base || !/^\d{4}-\d{2}-\d{2}$/.test(dataIso)) return "";

  const seed = hashSeed(`${usuarioId}|${dataIso}|${tipo}`);
  const segundos = 1 + (seed % 59);
  const quebraMinuto = seed % 10 < 3;
  const extra = quebraMinuto ? 1 + ((seed >>> 5) % 3) : 0;
  const dir = ((seed >>> 11) & 1) === 0 ? 1 : -1;

  let minutes = base.m + dir * extra;
  let hours = base.h;
  if (minutes < 0) {
    hours -= 1;
    minutes += 60;
  } else if (minutes >= 60) {
    hours += 1;
    minutes -= 60;
  }

  return `${pad(hours)}:${pad(minutes)}:${pad(segundos)}`;
}

export function datetimeHierarquiaPonto(
  tipo: string,
  usuarioId: number,
  dataIso: string,
): string {
  const hora = horaHierarquiaPonto(tipo, usuarioId, dataIso);
  return hora ? `${dataIso} ${hora}` : "";
}

export type JornadaHierarquia = {
  usuario_id: number;
  data: string;
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

export function aplicarHierarquiaJornada<T extends JornadaHierarquia>(j: T): T {
  const entrada = temHoraFmt(j.entrada_fmt)
    ? horaHierarquiaPonto("entrada", j.usuario_id, j.data)
    : "";
  const almoco = temHoraFmt(j.almoco_fmt)
    ? horaHierarquiaPonto("almoco", j.usuario_id, j.data)
    : "";
  const retorno = temHoraFmt(j.retorno_fmt)
    ? horaHierarquiaPonto("retorno_almoco", j.usuario_id, j.data)
    : "";
  const saida = temHoraFmt(j.saida_fmt)
    ? horaHierarquiaPonto("saida", j.usuario_id, j.data)
    : "";

  const minAlm = almoco && retorno ? minutosEntreHms(almoco, retorno) : null;
  const aberto = Boolean(entrada && !saida);
  let minTrab: number | null = null;
  if (entrada && saida) {
    if (almoco && retorno) {
      const m1 = minutosEntreHms(entrada, almoco);
      const m2 = minutosEntreHms(retorno, saida);
      minTrab = m1 != null && m2 != null ? m1 + m2 : minutosEntreHms(entrada, saida);
    } else {
      minTrab = minutosEntreHms(entrada, saida);
    }
  }

  return {
    ...j,
    entrada_fmt: entrada || "—",
    almoco_fmt: almoco || "—",
    retorno_fmt: retorno || "—",
    saida_fmt: saida || "—",
    intervalo_fmt: formatMinutos(minAlm),
    total_fmt: formatMinutos(minTrab),
    minutos_trabalhados: minTrab,
    aberto,
    status_label: aberto ? j.status_label : "Encerrado",
  };
}
