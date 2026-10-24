/** Cotação USD/BRL via AwesomeAPI (gratuita, atualização frequente). */

let cache: { rate: number; fetchedAt: number } | null = null;
const TTL_MS = 60 * 60 * 1000; // 1 hora

type AwesomeUsdBrl = {
  USDBRL?: { bid: string; ask: string; create_date: string };
};

export async function fetchUsdBrlRate(): Promise<{ rate: number; source: string; updatedAt: string }> {
  if (cache && Date.now() - cache.fetchedAt < TTL_MS) {
    return {
      rate: cache.rate,
      source: "AwesomeAPI (cache)",
      updatedAt: new Date(cache.fetchedAt).toISOString(),
    };
  }

  const res = await fetch("https://economia.awesomeapi.com.br/json/last/USD-BRL", {
    headers: { Accept: "application/json" },
  });

  if (!res.ok) throw new Error("Não foi possível obter a cotação do dólar");

  const json = (await res.json()) as AwesomeUsdBrl;
  const bid = parseFloat(json.USDBRL?.bid || "");
  if (!Number.isFinite(bid) || bid <= 0) throw new Error("Cotação USD/BRL inválida");

  cache = { rate: bid, fetchedAt: Date.now() };

  return {
    rate: bid,
    source: "AwesomeAPI",
    updatedAt: json.USDBRL?.create_date || new Date().toISOString(),
  };
}

export function usdToBrl(usd: number, rate: number): number {
  return Math.round(usd * rate * 100) / 100;
}
