export function pontoNormalizarTipo(tipo: string): string | null {
  const t = tipo.toLowerCase().trim();
  const map: Record<string, string> = {
    entrada: "entrada",
    almoco: "almoco",
    almoço: "almoco",
    retorno: "retorno_almoco",
    retorno_almoco: "retorno_almoco",
    saida: "saida",
    saída: "saida",
  };
  return map[t] ?? null;
}

export function pontoLabelTipo(tipo: string): string {
  switch (pontoNormalizarTipo(tipo)) {
    case "entrada":
      return "Entrada";
    case "almoco":
      return "Almoço";
    case "retorno_almoco":
      return "Retorno";
    case "saida":
      return "Saída";
    default:
      return tipo;
  }
}

export function pontoClasseBadge(tipo: string): string {
  switch (pontoNormalizarTipo(tipo)) {
    case "entrada":
      return "dash-ponto-tipo--entrada";
    case "almoco":
      return "dash-ponto-tipo--almoco";
    case "retorno_almoco":
      return "dash-ponto-tipo--retorno";
    case "saida":
      return "dash-ponto-tipo--saida";
    default:
      return "bg-secondary";
  }
}

export function formatDataHoraPonto(raw: string): { data: string; hora: string } {
  const d = new Date(raw);
  if (Number.isNaN(d.getTime())) return { data: "—", hora: "—" };
  return {
    data: d.toLocaleDateString("pt-BR"),
    hora: d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    }),
  };
}
