/** YYYY-MM no fuso local (evita deslocar mês com toISOString/UTC). */
export function formatYmLocal(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  return `${y}-${m}`;
}

export function parseDataInventarioRow(row: Record<string, unknown>): Date | null {
  const candidatos = [
    String(row.data_montagem ?? "").trim(),
    String(row.data_visita ?? "").trim(),
  ];
  for (const d of candidatos) {
    if (!d || d === "0000-00-00") continue;
    const br = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(d);
    if (br) return new Date(Number(br[3]), Number(br[2]) - 1, Number(br[1]));
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
    const slash = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(d);
    if (slash) return new Date(Number(slash[3]), Number(slash[2]) - 1, Number(slash[1]));
  }
  return null;
}
