import { query } from "./db.server";
import { requireHousehold, householdUserScope, resolveHouseholdId } from "./household.server";
import { num } from "./format";
import { computeBillDisplayStatus } from "./labels";
import type { Debt, DebtInstallment, RecurringAccount } from "./finance.types";

export type MonthlyBill = {
  id: string;
  user_id: string;
  source_type: string;
  source_id: string | null;
  name: string;
  category: string;
  group_key: string;
  reference_month: string;
  due_date: string;
  expected_amount: number | string;
  paid_amount: number | string;
  currency: string;
  status: string;
  notes: string | null;
  display_status?: string;
  remaining_amount?: number;
};

export type PaymentRow = {
  id: string;
  user_id: string;
  monthly_bill_id: string | null;
  debt_id: string | null;
  installment_id: string | null;
  amount: number | string;
  payment_date: string;
  payment_method: string | null;
  account_used: string | null;
  notes: string | null;
  attachment_url: string | null;
  is_full: number | boolean;
  created_at: string;
};

function monthKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function dueInMonth(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const d = Math.min(Math.max(1, day), last);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function groupFor(category: string, sourceType: string): string {
  if (sourceType === "debt_installment" || sourceType === "debt") return "dividas";
  const c = category.toLowerCase();
  if (["moradia", "pensão", "contas da casa", "água", "energia", "internet"].some((x) => c.includes(x))) {
    return "essenciais";
  }
  if (c.includes("trabalho") || c.includes("ferramenta") || c.includes("software") || c.includes("smm")) {
    return "trabalho";
  }
  if (["combustível", "alimentação", "lazer"].some((x) => c.includes(x))) return "variaveis";
  return "outros";
}

async function upsertBill(
  bill: {
    userId: string;
    sourceType: string;
    sourceId: string;
    name: string;
    category: string;
    groupKey: string;
    referenceMonth: string;
    dueDate: string;
    expectedAmount: number;
    currency?: string;
    notes?: string | null;
  },
  householdId: string,
) {
  const existing = await query<MonthlyBill[]>(
    `SELECT * FROM monthly_bills
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND source_type = :sourceType AND source_id = :sourceId AND reference_month = :month
     LIMIT 1`,
    {
      householdId,
      sourceType: bill.sourceType,
      sourceId: bill.sourceId,
      month: bill.referenceMonth,
    },
  );

  if (existing[0]) {
    // Don't overwrite paid amounts; refresh expected/due if still unpaid
    if (num(existing[0].paid_amount) <= 0) {
      await query(
        `UPDATE monthly_bills SET
          name = :name, category = :category, group_key = :groupKey,
          due_date = :dueDate, expected_amount = :expected, currency = :currency, notes = :notes
         WHERE id = :id`,
        {
          id: existing[0].id,
          name: bill.name,
          category: bill.category,
          groupKey: bill.groupKey,
          dueDate: bill.dueDate,
          expected: bill.expectedAmount,
          currency: bill.currency || "BRL",
          notes: bill.notes || null,
        },
      );
    }
    return existing[0].id;
  }

  const id = crypto.randomUUID();
  await query(
    `INSERT INTO monthly_bills
      (id, user_id, source_type, source_id, name, category, group_key, reference_month, due_date, expected_amount, paid_amount, currency, status, notes)
     VALUES
      (:id, :userId, :sourceType, :sourceId, :name, :category, :groupKey, :month, :dueDate, :expected, 0, :currency, 'pendente', :notes)`,
    {
      id,
      userId: bill.userId,
      sourceType: bill.sourceType,
      sourceId: bill.sourceId,
      name: bill.name,
      category: bill.category,
      groupKey: bill.groupKey,
      month: bill.referenceMonth,
      dueDate: bill.dueDate,
      expected: bill.expectedAmount,
      currency: bill.currency || "BRL",
      notes: bill.notes || null,
    },
  );
  return id;
}

export async function generateMonthBills(referenceMonth?: string) {
  const { user, householdId } = await requireHousehold();
  const key = referenceMonth || monthKey();
  const [yStr, mStr] = key.split("-");
  const year = Number(yStr);
  const monthIndex = Number(mStr) - 1;

  const recurring = await query<RecurringAccount[]>(
    `SELECT * FROM recurring_accounts
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND archived_at IS NULL AND status != 'inativa'`,
    { householdId, },
  );

  for (const acc of recurring) {
    if (!acc.due_day) continue;
    const amount = num(acc.amount);
    // Skip zero-amount until user distributes (utilities/fuel)
    if (amount <= 0) continue;
    await upsertBill(
      {
        userId: acc.user_id,
        sourceType: "recurring",
        sourceId: acc.id,
        name: acc.name,
        category: acc.category,
        groupKey: groupFor(acc.category, "recurring"),
        referenceMonth: key,
        dueDate: dueInMonth(year, monthIndex, Number(acc.due_day)),
        expectedAmount: amount,
        currency: acc.currency || "BRL",
        notes: acc.notes,
      },
      householdId,
    );
  }

  // Installments due in this month
  const installments = await query<(DebtInstallment & { creditor?: string; category?: string; currency?: string })[]>(
    `SELECT di.*, d.creditor, d.category, d.currency
     FROM debt_installments di
     INNER JOIN debts d ON d.id = di.debt_id
     WHERE di.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)
       AND di.due_date IS NOT NULL
       AND DATE_FORMAT(di.due_date, '%Y-%m') = :month
       AND d.archived_at IS NULL`,
    { householdId, month: key },
  );

  for (const inst of installments) {
    await upsertBill(
      {
        userId: inst.user_id,
        sourceType: "debt_installment",
        sourceId: inst.id,
        name: `${inst.creditor || "Dívida"} — ${inst.notes || `Parcela ${inst.installment_number}`}`,
        category: inst.category || "Parcelas",
        groupKey: "dividas",
        referenceMonth: key,
        dueDate: inst.due_date!,
        expectedAmount: num(inst.amount) - num((inst as { paid_amount?: number }).paid_amount || 0) || num(inst.amount),
        currency: inst.currency || "BRL",
        notes: inst.notes,
      },
      householdId,
    );
  }

  // Single-payment debts with due_day in this month (no installments)
  const debts = await query<Debt[]>(
    `SELECT * FROM debts
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND archived_at IS NULL AND status != 'pago'
       AND needs_review = 0
       AND due_day IS NOT NULL
       AND (installments_total IS NULL OR installments_total <= 1)`,
    { householdId, },
  );

  for (const debt of debts) {
    // Skip if already covered by installments
    const hasInst = await query<{ c: number }[]>(
      `SELECT COUNT(*) AS c FROM debt_installments WHERE debt_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
      { id: debt.id, householdId, },
    );
    if (Number(hasInst[0]?.c) > 0) continue;

    // Don't dump the entire remaining balance as a "monthly bill"
    // unless it's a single payment or has an explicit monthly commitment.
    const installment = num(debt.installment_amount);
    const commitment = num(debt.monthly_commitment);
    const isSingle =
      Number(debt.installments_total) === 1 ||
      debt.payment_type === "pagamento_unico";

    let expected = 0;
    if (installment > 0) expected = installment;
    else if (commitment > 0) expected = commitment;
    else if (isSingle) expected = Math.max(0, num(debt.total_amount) - num(debt.paid_amount));
    else if (debt.payment_type === "cartao_credito") expected = commitment; // fatura variável — 0 até informar
    else continue; // ex.: dívidas sem valor mensal fixo

    if (expected <= 0 && debt.payment_type !== "cartao_credito") continue;

    const dueDate = dueInMonth(year, monthIndex, Number(debt.due_day));

    await upsertBill(
      {
        userId: debt.user_id,
        sourceType: "debt",
        sourceId: debt.id,
        name: debt.creditor,
        category: debt.category,
        groupKey: "dividas",
        referenceMonth: key,
        dueDate,
        expectedAmount: expected,
        currency: debt.currency || "BRL",
        notes: debt.notes,
      },
      householdId,
    );
  }

  return { referenceMonth: key };
}

function enrich(bill: MonthlyBill): MonthlyBill {
  const expected = num(bill.expected_amount);
  const paid = num(bill.paid_amount);
  const remaining = Math.max(0, expected - paid);
  const display = computeBillDisplayStatus({
    status: bill.status,
    due_date: bill.due_date,
    paid_amount: paid,
    expected_amount: expected,
  });
  return {
    ...bill,
    display_status: display,
    remaining_amount: remaining,
    status: display === "pago" ? "pago" : display === "parcial" ? "parcial" : bill.status,
  };
}

export async function listMonthBills(referenceMonth?: string, filter?: string) {
  const { user, householdId } = await requireHousehold();
  const key = referenceMonth || monthKey();
  await generateMonthBills(key);

  const rows = await query<MonthlyBill[]>(
    `SELECT * FROM monthly_bills
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND reference_month = :month
     ORDER BY due_date ASC, name ASC`,
    { householdId, month: key },
  );

  let enriched = rows.map(enrich);

  if (filter && filter !== "todas") {
    enriched = enriched.filter((b) => {
      const ds = b.display_status || b.status;
      if (filter === "pagas") return ds === "pago";
      if (filter === "pendentes") return ds === "pendente" || ds === "vence_hoje" || ds === "vence_em_breve";
      if (filter === "atrasadas") return ds === "atrasado";
      if (filter === "essenciais") return b.group_key === "essenciais";
      if (filter === "parcelas" || filter === "dividas") return b.group_key === "dividas";
      if (filter === "trabalho") return b.group_key === "trabalho";
      return true;
    });
  }

  const totalExpected = enriched.reduce((a, b) => a + num(b.expected_amount), 0);
  const totalPaid = enriched.reduce((a, b) => a + Math.min(num(b.paid_amount), num(b.expected_amount)), 0);
  const totalPending = Math.max(0, totalExpected - totalPaid);
  const paidCount = enriched.filter((b) => (b.display_status || b.status) === "pago").length;

  return {
    referenceMonth: key,
    bills: enriched,
    summary: {
      totalExpected,
      totalPaid,
      totalPending,
      count: enriched.length,
      paidCount,
      pendingCount: enriched.length - paidCount,
      progressPct: enriched.length ? Math.round((paidCount / enriched.length) * 100) : 0,
    },
  };
}

export async function registerBillPayment(input: {
  monthlyBillId?: string;
  debtId?: string;
  installmentId?: string;
  amount: number;
  payment_date: string;
  payment_method?: string | null;
  account_used?: string | null;
  notes?: string | null;
  attachment_url?: string | null;
  is_full?: boolean;
  idempotencyKey?: string | null;
}) {
  const { user, householdId } = await requireHousehold();
  if (input.amount <= 0) throw new Error("Informe um valor válido");

  if (input.idempotencyKey) {
    const dup = await query<{ id: string }[]>(
      `SELECT id FROM payments WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND idempotency_key = :key LIMIT 1`,
      { householdId, key: input.idempotencyKey },
    );
    if (dup.length) throw new Error("Pagamento já registrado");
  }

  let bill: MonthlyBill | null = null;
  if (input.monthlyBillId) {
    const rows = await query<MonthlyBill[]>(
      `SELECT * FROM monthly_bills WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
      { id: input.monthlyBillId, householdId, },
    );
    bill = rows[0] || null;
    if (!bill) throw new Error("Conta não encontrada");
  }

  const paymentId = crypto.randomUUID();
  await query(
    `INSERT INTO payments
      (id, user_id, monthly_bill_id, debt_id, installment_id, amount, payment_date, payment_method, account_used, notes, attachment_url, is_full, idempotency_key)
     VALUES
      (:id, :userId, :billId, :debtId, :instId, :amount, :paymentDate, :method, :accountUsed, :notes, :attachment, :isFull, :key)`,
    {
      id: paymentId,
      userId: user.id,
      billId: input.monthlyBillId || null,
      debtId: input.debtId || (bill?.source_type === "debt" ? bill.source_id : null),
      instId:
        input.installmentId ||
        (bill?.source_type === "debt_installment" ? bill.source_id : null),
      amount: input.amount,
      paymentDate: input.payment_date,
      method: input.payment_method || null,
      accountUsed: input.account_used || null,
      notes: input.notes || null,
      attachment: input.attachment_url || null,
      isFull: input.is_full === false ? 0 : 1,
      key: input.idempotencyKey || null,
    },
  );

  if (bill) {
    const newPaid = num(bill.paid_amount) + input.amount;
    const expected = num(bill.expected_amount);
    const capped = Math.min(newPaid, expected);
    const status = capped >= expected - 0.001 ? "pago" : capped > 0 ? "parcial" : "pendente";
    await query(
      `UPDATE monthly_bills SET paid_amount = :paid, status = :status WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
      { paid: capped, status, id: bill.id, householdId, },
    );

    // Sync debt / installment
    if (bill.source_type === "debt_installment" && bill.source_id) {
      await query(
        `UPDATE debt_installments SET
          status = :status,
          paid_at = CASE WHEN :status = 'pago' THEN :paymentDate ELSE paid_at END
         WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
        { status: status === "pago" ? "pago" : "pendente", paymentDate: input.payment_date, id: bill.source_id, householdId, },
      );
      const inst = await query<DebtInstallment[]>(
        `SELECT * FROM debt_installments WHERE id = :id LIMIT 1`,
        { id: bill.source_id },
      );
      if (inst[0]) {
        await applyDebtPayment(user.id, inst[0].debt_id, input.amount, input.payment_date, paymentId);
      }
    } else if (bill.source_type === "debt" && bill.source_id) {
      await applyDebtPayment(user.id, bill.source_id, input.amount, input.payment_date, paymentId);
    }
  } else if (input.installmentId) {
    const inst = await query<DebtInstallment[]>(
      `SELECT * FROM debt_installments WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
      { id: input.installmentId, householdId, },
    );
    if (!inst[0]) throw new Error("Parcela não encontrada");
    const status = input.is_full !== false ? "pago" : "pendente";
    await query(
      `UPDATE debt_installments SET status = :status, paid_at = :paymentDate WHERE id = :id`,
      { status, paymentDate: input.payment_date, id: input.installmentId },
    );
    // Keep monthly_bills in sync when paying from debt detail
    const linkedBills = await query<MonthlyBill[]>(
      `SELECT * FROM monthly_bills
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND source_type = 'debt_installment' AND source_id = :instId`,
      { householdId, instId: input.installmentId },
    );
    for (const lb of linkedBills) {
      const newPaid = Math.min(num(lb.expected_amount), num(lb.paid_amount) + input.amount);
      const billStatus =
        newPaid >= num(lb.expected_amount) - 0.001 ? "pago" : newPaid > 0 ? "parcial" : "pendente";
      await query(
        `UPDATE monthly_bills SET paid_amount = :paid, status = :status WHERE id = :id`,
        { paid: newPaid, status: billStatus, id: lb.id },
      );
    }
    await applyDebtPayment(user.id, inst[0].debt_id, input.amount, input.payment_date, paymentId);
  } else if (input.debtId) {
    await applyDebtPayment(user.id, input.debtId, input.amount, input.payment_date, paymentId);
  }

  return { ok: true as const, paymentId };
}

async function applyDebtPayment(
  userId: string,
  debtId: string,
  amount: number,
  paymentDate: string,
  paymentId: string,
) {
  const householdId = await resolveHouseholdId(userId);
  const rows = await query<Debt[]>(
    `SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { id: debtId, householdId },
  );
  const debt = rows[0];
  if (!debt) return;

  const balance = Math.max(0, num(debt.total_amount) - num(debt.paid_amount));
  const pay = Math.min(amount, balance);
  const newPaid = num(debt.paid_amount) + pay;
  const isRecurringCard = debt.payment_type === "cartao_credito";
  const fully = !isRecurringCard && newPaid >= num(debt.total_amount) - 0.001;

  await query(
    `INSERT INTO debt_payments (id, user_id, debt_id, amount, paid_at, notes, idempotency_key)
     VALUES (:id, :userId, :debtId, :amount, :paidAt, :notes, :key)
     ON DUPLICATE KEY UPDATE amount = amount`,
    {
      id: crypto.randomUUID(),
      userId,
      debtId,
      amount: pay,
      paidAt: paymentDate,
      notes: `payment:${paymentId}`,
      key: `pay-${paymentId}`,
    },
  );

  const paidInstallments = await query<{ c: number }[]>(
    `SELECT COUNT(*) AS c FROM debt_installments WHERE debt_id = :id AND status = 'pago'`,
    { id: debtId },
  );

  await query(
    `UPDATE debts SET
      paid_amount = :paid,
      installments_paid = :instPaid,
      status = :status,
      paid_off_at = :paidOff
     WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      paid: Math.min(newPaid, num(debt.total_amount)),
      instPaid: Number(paidInstallments[0]?.c || debt.installments_paid),
      status: fully ? "pago" : "em_dia",
      paidOff: fully ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      id: debtId,
      householdId,
    },
  );
}

export async function fetchDashboardMonth(referenceMonth?: string) {
  const { user, householdId } = await requireHousehold();
  const key = referenceMonth || monthKey();
  const billsData = await listMonthBills(key);

  const [y, m] = key.split("-").map(Number);
  const monthStart = `${key}-01`;
  const monthEnd = dueInMonth(y, m - 1, 31);

  const incomes = await query<{ amount: number | string; status: string }[]>(
    `SELECT amount, status FROM incomes
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND (
       (received_at >= :start AND received_at <= :end) OR
       (expected_at >= :start AND expected_at <= :end)
     )`,
    { householdId, start: monthStart, end: monthEnd },
  );

  const receitaRecebida = incomes
    .filter((i) => ["recebida", "parcial"].includes(i.status))
    .reduce((a, i) => a + num(i.amount), 0);
  const receitaPrevista = incomes
    .filter((i) => ["prevista", "parcial", "atrasada", "recebida"].includes(i.status))
    .reduce((a, i) => a + num(i.amount), 0);

  const profile = await query<{ income_avg: number | string | null }[]>(
    `SELECT income_avg FROM profiles WHERE id = :id LIMIT 1`,
    { id: user.id },
  );
  const incomeAvg = num(profile[0]?.income_avg);
  const receitaMes =
    receitaRecebida > 0 ? receitaRecebida : receitaPrevista > 0 ? receitaPrevista : incomeAvg;

  const { totalExpected, totalPaid, totalPending, count, paidCount, progressPct } = billsData.summary;
  const saldoProjetado = receitaMes - totalExpected;
  const faltaPagar = totalPending;
  const commitmentPct = receitaMes > 0 ? (totalExpected / receitaMes) * 100 : 0;

  const nextBill = billsData.bills
    .filter((b) => (b.display_status || b.status) !== "pago")
    .sort((a, b) => a.due_date.localeCompare(b.due_date))[0];

  const overdueCount = billsData.bills.filter((b) => b.display_status === "atrasado").length;

  // Health score transparent
  let score = 0;
  const factors: string[] = [];
  const improve: string[] = [];

  const onTimeRatio = count ? (count - overdueCount) / count : 1;
  const pointsOnTime = Math.round(onTimeRatio * 25);
  score += pointsOnTime;
  factors.push(`Contas em dia: ${pointsOnTime}/25`);

  const reserve = await query<{ current_amount: number | string; safety_target: number | string }[]>(
    `SELECT current_amount, safety_target FROM reserve_accounts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { householdId, },
  );
  const reserveAmt = num(reserve[0]?.current_amount);
  const safety = num(reserve[0]?.safety_target) || 1000;
  const reservePts = reserveAmt >= 10000 ? 20 : reserveAmt >= safety ? 12 : reserveAmt > 0 ? 6 : 0;
  score += reservePts;
  factors.push(`Reserva: ${reservePts}/20`);
  if (reserveAmt < safety) improve.push("Eleve a reserva ao mínimo de R$ 1.000.");

  const balancePts =
    saldoProjetado >= 1000 ? 20 : saldoProjetado >= 0 ? 12 : saldoProjetado >= -500 ? 5 : 0;
  score += balancePts;
  factors.push(`Saldo mensal: ${balancePts}/20`);

  const commitPts =
    commitmentPct <= 70 ? 20 : commitmentPct <= 85 ? 12 : commitmentPct <= 100 ? 6 : 2;
  score += commitPts;
  factors.push(`Comprometimento da renda: ${commitPts}/20`);
  if (commitmentPct > 85) improve.push("Reduza custos ou aumente a receita recorrente.");

  const debts = await query<{ paid_amount: number | string; total_amount: number | string }[]>(
    `SELECT paid_amount, total_amount FROM debts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND currency = 'BRL' AND archived_at IS NULL`,
    { householdId, },
  );
  const totalDebt = debts.reduce((a, d) => a + num(d.total_amount), 0);
  const paidDebt = debts.reduce((a, d) => a + num(d.paid_amount), 0);
  const debtProgress = totalDebt > 0 ? paidDebt / totalDebt : 0;
  const debtPts = Math.round(debtProgress * 15);
  score += debtPts;
  factors.push(`Redução de dívidas: ${debtPts}/15`);
  if (debtProgress < 0.1) improve.push("Quite primeiro os menores saldos.");

  const label =
    score >= 85 ? "Excelente" : score >= 70 ? "Boa" : score >= 50 ? "Regular" : score >= 30 ? "Atenção" : "Crítica";

  return {
    referenceMonth: key,
    receitaMes,
    receitaRecebida,
    receitaPrevista: Math.max(receitaPrevista, incomeAvg),
    totalAPagar: totalExpected,
    totalPago: totalPaid,
    faltaPagar,
    saldoProjetado,
    commitmentPct,
    progress: { paidCount, count, progressPct },
    nextBill,
    overdueCount,
    billsPreview: billsData.bills.slice(0, 12),
    health: {
      score,
      label,
      factors,
      improve: improve.slice(0, 4),
      provisional: incomes.length === 0,
    },
  };
}

export async function saveBudgetSplit(input: {
  bundleKey: "utilities_650" | "fuel_food_1000";
  items: { name: string; amount: number }[];
}) {
  const { user, householdId } = await requireHousehold();
  const expected = input.bundleKey === "utilities_650" ? 650 : 1000;
  const sum = input.items.reduce((a, i) => a + i.amount, 0);
  if (Math.abs(sum - expected) > 0.01) {
    throw new Error(`A soma deve ser exatamente R$ ${expected.toFixed(2)}`);
  }

  for (const item of input.items) {
    await query(
      `INSERT INTO budget_splits (id, user_id, bundle_key, item_name, amount)
       VALUES (:id, :userId, :bundle, :name, :amount)
       ON DUPLICATE KEY UPDATE amount = VALUES(amount)`,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        bundle: input.bundleKey,
        name: item.name,
        amount: item.amount,
      },
    );

    if (input.bundleKey === "utilities_650") {
      await query(
        `UPDATE recurring_accounts SET amount = :amount, archived_at = NULL, notes = NULL
         WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND name = :name`,
        { amount: item.amount, householdId, name: item.name },
      );
    } else {
      await query(
        `UPDATE expenses SET amount = :amount, status = 'ativa', notes = NULL
         WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND description = :name AND is_recurring = 1`,
        { amount: item.amount, householdId, name: item.name },
      );
    }
  }

  // regenerate current month
  await generateMonthBills(monthKey());
  return { ok: true as const };
}

export async function getBudgetSplits() {
  const { user, householdId } = await requireHousehold();
  const rows = await query<{ bundle_key: string; item_name: string; amount: number | string }[]>(
    `SELECT bundle_key, item_name, amount FROM budget_splits WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    { householdId, },
  );
  return rows;
}

export async function getDebtDetail(debtId: string) {
  const { user, householdId } = await requireHousehold();
  const debts = await query<Debt[]>(
    `SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { id: debtId, householdId, },
  );
  const debt = debts[0];
  if (!debt) throw new Error("Dívida não encontrada");

  const installments = await query<DebtInstallment[]>(
    `SELECT * FROM debt_installments WHERE debt_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) ORDER BY installment_number`,
    { id: debtId, householdId, },
  );
  const payments = await query<PaymentRow[]>(
    `SELECT * FROM payments WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND (debt_id = :debtId OR installment_id IN (
       SELECT id FROM debt_installments WHERE debt_id = :debtId
     ) OR monthly_bill_id IN (
       SELECT id FROM monthly_bills WHERE source_type = 'debt' AND source_id = :debtId
     )) ORDER BY payment_date DESC`,
    { householdId, debtId },
  );

  const monthlyBills = await query<MonthlyBill[]>(
    `SELECT * FROM monthly_bills
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND source_type = 'debt' AND source_id = :debtId
     ORDER BY reference_month ASC`,
    { householdId, debtId },
  );

  return { debt, installments, payments, monthlyBills: monthlyBills.map(enrich) };
}

export async function getBillDetail(billId: string) {
  const { user, householdId } = await requireHousehold();
  const rows = await query<MonthlyBill[]>(
    `SELECT * FROM monthly_bills WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { id: billId, householdId, },
  );
  const bill = rows[0];
  if (!bill) throw new Error("Conta não encontrada");

  const payments = await query<PaymentRow[]>(
    `SELECT * FROM payments WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND monthly_bill_id = :id
     ORDER BY payment_date DESC, created_at DESC`,
    { householdId, id: billId },
  );

  let source: { kind: string; label: string; debtId?: string; recurringId?: string } | null = null;

  if (bill.source_type === "recurring" && bill.source_id) {
    const acc = await query<{ name: string }[]>(
      `SELECT name FROM recurring_accounts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
      { id: bill.source_id, householdId, },
    );
    source = {
      kind: "Conta recorrente",
      label: acc[0]?.name || bill.name,
      recurringId: bill.source_id,
    };
  } else if (bill.source_type === "debt" && bill.source_id) {
    const d = await query<{ creditor: string }[]>(
      `SELECT creditor FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
      { id: bill.source_id, householdId, },
    );
    source = {
      kind: "Dívida",
      label: d[0]?.creditor || bill.name,
      debtId: bill.source_id,
    };
  } else if (bill.source_type === "debt_installment" && bill.source_id) {
    const inst = await query<{ debt_id: string }[]>(
      `SELECT debt_id FROM debt_installments WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
      { id: bill.source_id, householdId, },
    );
    if (inst[0]?.debt_id) {
      const d = await query<{ creditor: string }[]>(
        `SELECT creditor FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
        { id: inst[0].debt_id, householdId, },
      );
      source = {
        kind: "Dívida (parcela)",
        label: d[0]?.creditor || bill.name,
        debtId: inst[0].debt_id,
      };
    }
  }

  const enriched = enrich(bill);

  let relatedBills: MonthlyBill[] = [enriched];
  let allPayments = payments;
  let statsFromDebt: {
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
    monthsTotal: number;
    monthsPaid: number;
    progressPct: number;
  } | null = null;

  if (source?.debtId) {
    const debtRows = await query<Debt[]>(
      `SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
      { id: source.debtId, householdId, },
    );
    const debt = debtRows[0];

    const installmentBills = await query<MonthlyBill[]>(
      `SELECT mb.* FROM monthly_bills mb
       INNER JOIN debt_installments di ON di.id = mb.source_id AND mb.source_type = 'debt_installment'
       WHERE mb.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND di.debt_id = :debtId
       ORDER BY mb.reference_month DESC`,
      { householdId, debtId: source.debtId },
    );

    const debtLevelBills = await query<MonthlyBill[]>(
      `SELECT * FROM monthly_bills
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND source_type = 'debt' AND source_id = :debtId
       ORDER BY reference_month DESC`,
      { householdId, debtId: source.debtId },
    );

    const merged = [...installmentBills, ...debtLevelBills];
    if (merged.length) relatedBills = merged.map(enrich);

    allPayments = await query<PaymentRow[]>(
      `SELECT * FROM payments
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND (
         debt_id = :debtId OR
         installment_id IN (
           SELECT id FROM debt_installments WHERE debt_id = :debtId AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)
         )
       )
       ORDER BY payment_date DESC, created_at DESC`,
      { householdId, debtId: source.debtId },
    );

    const debtPayments = await query<PaymentRow[]>(
      `SELECT id, user_id, NULL AS monthly_bill_id, debt_id, NULL AS installment_id,
              amount, paid_at AS payment_date, 'Pix' AS payment_method, NULL AS account_used,
              notes, NULL AS attachment_url, 1 AS is_full, created_at
       FROM debt_payments
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND debt_id = :debtId
       ORDER BY paid_at DESC, created_at DESC`,
      { householdId, debtId: source.debtId },
    );
    const seen = new Set(allPayments.map((p) => p.id));
    for (const dp of debtPayments) {
      if (!seen.has(dp.id)) allPayments.push(dp);
    }
    allPayments.sort(
      (a, b) =>
        String(b.payment_date).localeCompare(String(a.payment_date)) ||
        String(b.created_at).localeCompare(String(a.created_at)),
    );

    if (debt && Number(debt.installments_total) > 0) {
      const totalExpected = num(debt.total_amount) || num(debt.original_amount);
      const totalPaid = num(debt.paid_amount);
      const instPaid = Number(debt.installments_paid) || 0;
      const instTotal = Number(debt.installments_total) || relatedBills.length;
      statsFromDebt = {
        totalExpected,
        totalPaid,
        totalRemaining: Math.max(0, totalExpected - totalPaid),
        monthsTotal: instTotal,
        monthsPaid: instPaid,
        progressPct:
          instTotal > 0
            ? Math.min(100, Math.round((instPaid / instTotal) * 100))
            : totalExpected > 0
              ? Math.min(100, Math.round((totalPaid / totalExpected) * 100))
              : 0,
      };
    }
  } else if (bill.source_type && bill.source_id) {
    const related = await query<MonthlyBill[]>(
      `SELECT * FROM monthly_bills
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND source_type = :st AND source_id = :sid
       ORDER BY reference_month DESC
       LIMIT 36`,
      { householdId, st: bill.source_type, sid: bill.source_id },
    );
    if (related.length) {
      relatedBills = related.map(enrich);
      allPayments = await query<PaymentRow[]>(
        `SELECT p.* FROM payments p
         INNER JOIN monthly_bills mb ON mb.id = p.monthly_bill_id
         WHERE p.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND mb.source_type = :st AND mb.source_id = :sid
         ORDER BY p.payment_date DESC, p.created_at DESC`,
        { householdId, st: bill.source_type, sid: bill.source_id },
      );
    }
  }

  const totalExpected = relatedBills.reduce((a, b) => a + num(b.expected_amount), 0);
  const totalPaid = relatedBills.reduce((a, b) => a + num(b.paid_amount), 0);
  const monthsPaid = relatedBills.filter((b) => (b.display_status || b.status) === "pago").length;
  const progressPct =
    totalExpected > 0 ? Math.min(100, Math.round((totalPaid / totalExpected) * 100)) : 0;

  const stats = statsFromDebt ?? {
    totalExpected,
    totalPaid,
    totalRemaining: Math.max(0, totalExpected - totalPaid),
    monthsTotal: relatedBills.length,
    monthsPaid,
    progressPct,
  };

  return {
    bill: enriched,
    payments: allPayments,
    source,
    remaining: Math.max(0, num(enriched.expected_amount) - num(enriched.paid_amount)),
    relatedBills,
    stats,
  };
}

export async function getRecurringDetail(accountId: string) {
  const { user, householdId } = await requireHousehold();
  const accounts = await query<RecurringAccount[]>(
    `SELECT * FROM recurring_accounts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { id: accountId, householdId, },
  );
  const account = accounts[0];
  if (!account) throw new Error("Conta recorrente não encontrada");

  const bills = await query<MonthlyBill[]>(
    `SELECT * FROM monthly_bills
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND source_type = 'recurring' AND source_id = :id
     ORDER BY reference_month DESC
     LIMIT 24`,
    { householdId, id: accountId },
  );

  const payments = await query<PaymentRow[]>(
    `SELECT p.* FROM payments p
     INNER JOIN monthly_bills mb ON mb.id = p.monthly_bill_id
     WHERE p.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND mb.source_type = 'recurring' AND mb.source_id = :id
     ORDER BY p.payment_date DESC, p.created_at DESC
     LIMIT 50`,
    { householdId, id: accountId },
  );

  const enrichedBills = bills.map(enrich);
  const paidCount = enrichedBills.filter((b) => (b.display_status || b.status) === "pago").length;
  const totalPaid = enrichedBills.reduce((a, b) => a + num(b.paid_amount), 0);

  return {
    account,
    bills: enrichedBills,
    payments,
    stats: {
      billCount: enrichedBills.length,
      paidCount,
      totalPaid,
    },
  };
}
