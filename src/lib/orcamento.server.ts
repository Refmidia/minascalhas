export type OrcamentoModoDesconto = "percent" | "valor" | "total";

export type OrcamentoLinha = {
  material: string;
  metros: number;
  valor: number;
  valor_custo?: number;
  id?: number;
};

export function parseMoneyBr(raw: unknown): number {
  const s = String(raw ?? "")
    .replace(/[^\d,.-]/g, "")
    .replace(/\./g, "")
    .replace(",", ".");
  const n = Number.parseFloat(s);
  return Number.isFinite(n) ? Math.round(Math.max(0, n) * 100) / 100 : 0;
}

/** Mantém só dígitos e vírgula decimal (máx. 2 casas) — igual ao Alex ao digitar. */
export function sanitizarNumeroBr(raw: string): string {
  let v = String(raw ?? "").replace(/[^\d.,]/g, "");
  if (v.includes(".") && !v.includes(",")) {
    v = v.replace(/\./g, ",");
  } else if (v.includes(".") && v.includes(",")) {
    v = v.replace(/\./g, "");
  }
  const ci = v.indexOf(",");
  if (ci !== -1) {
    const intPart = v.slice(0, ci).replace(/,/g, "");
    const dec = v.slice(ci + 1).replace(/[.,]/g, "").slice(0, 2);
    v = dec.length > 0 || raw.endsWith(",") ? `${intPart},${dec}` : intPart;
  }
  return v;
}

/** Bloqueia letras no teclado; permite dígitos, vírgula e teclas de edição. */
export function bloquearTeclaNaoNumerica(e: {
  key: string;
  ctrlKey: boolean;
  metaKey: boolean;
  altKey: boolean;
  preventDefault(): void;
}): void {
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const permitidas = ["Backspace", "Delete", "Tab", "ArrowLeft", "ArrowRight", "Home", "End", "Enter"];
  if (permitidas.includes(e.key)) return;
  if (e.key === "," || e.key === ".") return;
  if (/^\d$/.test(e.key)) return;
  e.preventDefault();
}

export function formatDescontoValorOrc(valor: number): string {
  if (valor <= 0) return "";
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function formatDescontoPctOrc(pct: number): string {
  if (pct <= 0) return "";
  return pct.toLocaleString("pt-BR", { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}

export type OrcamentoDescontoCalc = {
  subtotal: number;
  base: number;
  descontoValor: number;
  descontoPct: number;
  total: number;
};

export function baseOrcamento(
  subtotal: number,
  valorBaseManual: number,
  valorMostrarRaw: string,
): number {
  if (valorBaseManual > 0) return valorBaseManual;
  if (subtotal > 0) return subtotal;
  return parseMoneyBr(valorMostrarRaw);
}

/** Cálculo de desconto do modal (orcamento-novo-modal.js / orcamentado.php). */
export function calcDescontoOrcamento(
  subtotal: number,
  valorBaseManual: number,
  descontoSource: OrcamentoModoDesconto,
  descontoPctRaw: string,
  descontoValorRaw: string,
  valorMostrarRaw: string,
): OrcamentoDescontoCalc {
  const base = baseOrcamento(subtotal, valorBaseManual, valorMostrarRaw);
  let descontoValor = parseMoneyBr(descontoValorRaw);
  let descontoPct = parseMoneyBr(descontoPctRaw);
  let total = Math.max(0, base - descontoValor);

  if (descontoSource === "total") {
    total = parseMoneyBr(valorMostrarRaw);
    if (base > 0) {
      const diff = base - total;
      descontoValor = diff > 0 ? Math.round(diff * 100) / 100 : 0;
      descontoPct = diff > 0 ? Math.round((descontoValor / base) * 10000) / 100 : 0;
    }
  } else if (base > 0) {
    if (descontoSource === "valor") {
      total = Math.max(0, base - descontoValor);
      descontoPct = Math.round((descontoValor / base) * 10000) / 100;
    } else if (descontoSource === "percent") {
      descontoValor = Math.round(base * (descontoPct / 100) * 100) / 100;
      total = Math.max(0, base - descontoValor);
    }
  } else if (descontoSource === "total") {
    total = parseMoneyBr(valorMostrarRaw);
  }

  return {
    subtotal,
    base,
    descontoValor: Math.round(descontoValor * 100) / 100,
    descontoPct: Math.round(descontoPct * 100) / 100,
    total: Math.round(total * 100) / 100,
  };
}

export function inventarioSubtotalOrcamento(itens: OrcamentoLinha[]): number {
  let total = 0;
  for (const item of itens) {
    total += (Number(item.metros) || 0) * (Number(item.valor) || 0);
  }
  return Math.round(total * 100) / 100;
}

function normalizarDescontoPercent(raw: unknown): number {
  const n = parseMoneyBr(raw);
  return Math.min(100, Math.max(0, n));
}

export function normalizarModoDesconto(raw: string): OrcamentoModoDesconto {
  const m = raw.trim().toLowerCase();
  if (m === "valor" || m === "total") return m;
  return "percent";
}

export function normalizarFormaPagamento(raw: string): string {
  let v = raw.trim().toLowerCase();
  if (v === "débito") v = "debito";
  if (v === "crédito") v = "credito";
  return ["pix", "debito", "credito"].includes(v) ? v : "";
}

export function resolverDescontoOrcamento(
  subtotal: number,
  descontoPercentRaw: unknown,
  descontoValorRaw: unknown,
  modo: OrcamentoModoDesconto = "percent",
  valorTotalRaw?: unknown,
): { percent: number; valor: number; total: number } {
  const sub = Math.round(Math.max(0, subtotal) * 100) / 100;
  if (sub <= 0) {
    const totalManual = parseMoneyBr(valorTotalRaw ?? 0);
    if (totalManual > 0) return { percent: 0, valor: 0, total: totalManual };
    return { percent: 0, valor: 0, total: 0 };
  }

  if (modo === "total") {
    const totalDesejado = parseMoneyBr(valorTotalRaw ?? descontoValorRaw ?? 0);
    const valor = Math.round(Math.max(0, sub - totalDesejado) * 100) / 100;
    const percent = Math.round((valor / sub) * 10000) / 100;
    return { percent: Math.max(0, percent), valor, total: Math.round(Math.max(0, totalDesejado) * 100) / 100 };
  }

  if (modo === "valor") {
    const valor = parseMoneyBr(descontoValorRaw);
    const percent = Math.round((valor / sub) * 10000) / 100;
    return {
      percent: Math.max(0, percent),
      valor,
      total: Math.round(Math.max(0, sub - valor) * 100) / 100,
    };
  }

  const percent = normalizarDescontoPercent(descontoPercentRaw);
  const valor = Math.round(sub * (percent / 100) * 100) / 100;
  return {
    percent,
    valor,
    total: Math.round(Math.max(0, sub - valor) * 100) / 100,
  };
}

export function parseOrcamentoJson(raw: string | null | undefined): OrcamentoLinha[] {
  if (!raw?.trim()) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((x): x is Record<string, unknown> => x != null && typeof x === "object")
      .map((x) => ({
        material: String(x.material ?? ""),
        metros: Number(x.metros) || 0,
        valor: Number(x.valor) || 0,
        valor_custo: x.valor_custo != null ? Number(x.valor_custo) : undefined,
        id: x.id != null ? Number(x.id) : undefined,
      }));
  } catch {
    return [];
  }
}
