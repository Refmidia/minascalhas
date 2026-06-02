export function rotuloNivel(nivel: string): string {
  const n = nivel.trim().toLowerCase();
  const map: Record<string, string> = {
    error: "Erro",
    warning: "Aviso",
    security: "Segurança",
    info: "Info",
  };
  return map[n] ?? "Info";
}

export function formatLogData(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function resolverPassos(texto: string): string[] {
  return texto
    .split(/\r\n|\r|\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => l.replace(/^\d+\.\s*/, ""));
}

export function formatContextoJson(raw: string | null): string {
  const t = raw?.trim() ?? "";
  if (!t) return "—";
  try {
    return JSON.stringify(JSON.parse(t) as unknown, null, 2);
  } catch {
    return t;
  }
}
