import { getPrisma } from "@/lib/db.server";

const MESES_CURTO = [
  "Jan", "Fev", "Mar", "Abr", "Mai", "Jun",
  "Jul", "Ago", "Set", "Out", "Nov", "Dez",
];

export function parseDataInventario(row: {
  dataMontagem: string | null;
  dataVisita: string;
}): Date | null {
  const candidatos = [row.dataMontagem?.trim() ?? "", row.dataVisita.trim()];
  for (const d of candidatos) {
    if (!d || d === "0000-00-00") continue;
    const m = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(d);
    if (m) return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1]));
    const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
    if (iso) return new Date(Number(iso[1]), Number(iso[2]) - 1, Number(iso[3]));
  }
  return null;
}

function bucketStatus(status: string) {
  const s = status.trim().toLowerCase().replace("ç", "c");
  if (s === "orcamentado") return "orcamentado";
  if (["agendado", "confirmado", "finalizado"].includes(s)) return s;
  return "outros";
}

function parseOrcamentoParts(raw: string | null) {
  if (!raw) return { venda: 0, custo: 0 };
  try {
    const parts = JSON.parse(raw) as unknown[];
    if (!Array.isArray(parts)) return { venda: 0, custo: 0 };
    let venda = 0;
    let custo = 0;
    for (const p of parts) {
      if (!p || typeof p !== "object") continue;
      const o = p as Record<string, unknown>;
      const metros = Number(o.metros ?? 1) || 1;
      const valor = Number(o.valor ?? 0) || 0;
      venda += metros * valor;
      custo += Number(o.custo ?? 0) || 0;
    }
    return { venda, custo };
  } catch {
    return { venda: 0, custo: 0 };
  }
}

export async function getDashboardStats() {
  const prisma = await getPrisma();
  const now = new Date();
  const mesAtualYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const mesLabel = now.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const rows = await prisma.inventario.findMany({
    select: {
      status: true,
      valor: true,
      orcamento: true,
      dataVisita: true,
      dataMontagem: true,
    },
  });

  const operacional = { agendado: 0, orcamentado: 0, confirmado: 0, finalizado: 0 };
  let receitaConfirmado = 0;
  let receitaFaturadaMes = 0;
  let qtdFaturadoMes = 0;
  let margemMes = 0;

  const porStatusMes = {
    confirmado: { venda: 0, custo: 0 },
    finalizado: { venda: 0, custo: 0 },
  };

  for (const row of rows) {
    const b = bucketStatus(row.status);
    if (b === "agendado") operacional.agendado++;
    else if (b === "orcamentado") operacional.orcamentado++;
    else if (b === "confirmado") {
      operacional.confirmado++;
      receitaConfirmado += Number(row.valor);
    } else if (b === "finalizado") {
      operacional.finalizado++;
    }

    if (b !== "confirmado" && b !== "finalizado") continue;

    const parts = parseOrcamentoParts(row.orcamento);
    const dt = parseDataInventario(row);
    const noMes =
      dt && dt.getFullYear() === now.getFullYear() && dt.getMonth() === now.getMonth();

    if (b === "confirmado") {
      porStatusMes.confirmado.venda += parts.venda;
      porStatusMes.confirmado.custo += parts.custo;
    }
    if (b === "finalizado" && noMes) {
      receitaFaturadaMes += Number(row.valor);
      qtdFaturadoMes++;
      porStatusMes.finalizado.venda += parts.venda;
      porStatusMes.finalizado.custo += parts.custo;
    }
  }

  margemMes =
    porStatusMes.confirmado.venda -
    porStatusMes.confirmado.custo +
    (porStatusMes.finalizado.venda - porStatusMes.finalizado.custo);

  const totalGeral = receitaConfirmado + receitaFaturadaMes;

  const countByVisitDate = new Map<string, number>();
  for (const row of rows) {
    const dv = row.dataVisita?.trim();
    if (!dv || dv === "0000-00-00") continue;
    countByVisitDate.set(dv, (countByVisitDate.get(dv) ?? 0) + 1);
  }

  const dailyLabels: string[] = [];
  const dailyValues: number[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    const key = `${day}-${month}-${year}`;
    dailyLabels.push(`${day}/${month}`);
    dailyValues.push(countByVisitDate.get(key) ?? 0);
  }

  return {
    updatedAt: now.toISOString(),
    operacional,
    financeiro: {
      mesLabel,
      confirmado: receitaConfirmado,
      faturadoMes: receitaFaturadaMes,
      faturadoMesQtd: qtdFaturadoMes,
      totalGeral,
      margemMes,
    },
    charts: {
      daily: { labels: dailyLabels, values: dailyValues },
      status: {
        labels: ["Agendado", "Orçamentado", "Confirmado", "Finalizado"],
        values: [
          operacional.agendado,
          operacional.orcamentado,
          operacional.confirmado,
          operacional.finalizado,
        ],
      },
    },
  };
}
