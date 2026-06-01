export function formatMoeda(n: number): string {
  return n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function finYmLabel(ym: string): string {
  const nomes = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro",
  ];
  const m = /^(\d{4})-(\d{2})$/.exec(ym);
  if (!m) return ym;
  const mes = parseInt(m[2], 10);
  return `${nomes[mes - 1] ?? m[2]} de ${m[1]}`;
}