import { query } from "./db.server";
import { requireHousehold, householdUserScope } from "./household.server";
import { debtBalance, num } from "./format";
import type {
  CalendarEvent,
  Debt,
  DebtInstallment,
  DebtPayment,
  Expense,
  FinancialProfile,
  FinancialSettings,
  Goal,
  HealthReport,
  Income,
  IncomeScenario,
  RecurringAccount,
  ReserveAccount,
  ReserveTransaction,
} from "./finance.types";

export type {
  CalendarEvent,
  Debt,
  DebtInstallment,
  DebtPayment,
  Expense,
  FinancialProfile,
  FinancialSettings,
  Goal,
  HealthReport,
  Income,
  RecurringAccount,
  ReserveAccount,
  ReserveTransaction,
};

function dueDateForDay(year: number, month: number, day: number): string {
  const last = new Date(year, month + 1, 0).getDate();
  const d = Math.min(day, last);
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function periodKey(year: number, month: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

function isTruthy(v: number | boolean | string | null | undefined) {
  return v === true || v === 1 || v === "1";
}

function isActiveDebt(d: Debt) {
  return !d.archived_at && d.status !== "pago" && !isTruthy(d.needs_review);
}

function countsInBrlTotal(d: Debt) {
  if ((d.currency || "BRL") !== "BRL") return false;
  if (d.archived_at) return false;
  if (isTruthy(d.needs_review) && !d.amount_meaning) return false;
  return d.status !== "pago";
}

// —— Incomes / Expenses ——

export async function fetchIncomes() {
  const { user, householdId } = await requireHousehold();
  return query<Income[]>(
    `SELECT * FROM incomes WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) ORDER BY received_at DESC, created_at DESC LIMIT 300`,
    { householdId, },
  );
}

export async function fetchExpenses() {
  const { user, householdId } = await requireHousehold();
  return query<Expense[]>(
    `SELECT * FROM expenses WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) ORDER BY spent_at DESC, created_at DESC LIMIT 300`,
    { householdId, },
  );
}

export async function insertIncome(data: {
  description: string;
  amount: number;
  category?: string;
  source?: string | null;
  client_name?: string | null;
  payment_method?: string | null;
  recurrence?: string;
  status?: string;
  expected_at?: string | null;
  received_at: string;
  is_recurring?: boolean;
  notes?: string | null;
}) {
  const { user, householdId } = await requireHousehold();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO incomes
      (id, user_id, description, amount, category, source, client_name, payment_method, recurrence, status, expected_at, received_at, is_recurring, notes)
     VALUES
      (:id, :userId, :description, :amount, :category, :source, :clientName, :paymentMethod, :recurrence, :status, :expectedAt, :receivedAt, :isRecurring, :notes)`,
    {
      id,
      userId: user.id,
      description: data.description.trim(),
      amount: data.amount,
      category: data.category || null,
      source: data.source || null,
      clientName: data.client_name || null,
      paymentMethod: data.payment_method || null,
      recurrence: data.recurrence || "unique",
      status: data.status || "recebida",
      expectedAt: data.expected_at || null,
      receivedAt: data.received_at,
      isRecurring: data.is_recurring ? 1 : 0,
      notes: data.notes || null,
    },
  );
  return { id };
}

export async function insertExpense(data: {
  description: string;
  amount: number;
  category?: string;
  payment_method?: string | null;
  spent_at: string;
  is_recurring?: boolean;
  is_essential?: boolean;
  status?: string;
  notes?: string | null;
}) {
  const { user, householdId } = await requireHousehold();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO expenses
      (id, user_id, description, amount, category, payment_method, spent_at, is_recurring, is_essential, status, notes)
     VALUES
      (:id, :userId, :description, :amount, :category, :paymentMethod, :spentAt, :isRecurring, :isEssential, :status, :notes)`,
    {
      id,
      userId: user.id,
      description: data.description.trim(),
      amount: data.amount,
      category: data.category || "Outros",
      paymentMethod: data.payment_method || null,
      spentAt: data.spent_at,
      isRecurring: data.is_recurring ? 1 : 0,
      isEssential: data.is_essential === false ? 0 : 1,
      status: data.status || "ativa",
      notes: data.notes || null,
    },
  );
  return { id };
}

export async function removeTransaction(data: {
  table: "incomes" | "expenses";
  id: string;
}) {
  const { user, householdId } = await requireHousehold();
  const sql =
    data.table === "incomes"
      ? "DELETE FROM incomes WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)"
      : "DELETE FROM expenses WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)";
  await query(sql, { id: data.id, householdId, });
  return { ok: true as const };
}

// —— Debts ——

export async function fetchDebts(opts?: {
  withDueDateOnly?: boolean;
  includeArchived?: boolean;
}) {
  const { user, householdId } = await requireHousehold();
  const archived = opts?.includeArchived
    ? ""
    : "AND archived_at IS NULL";
  if (opts?.withDueDateOnly) {
    return query<Debt[]>(
      `SELECT * FROM debts
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND due_date IS NOT NULL ${archived}
       ORDER BY due_date ASC`,
      { householdId, },
    );
  }
  return query<Debt[]>(
    `SELECT * FROM debts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) ${archived} ORDER BY
      CASE WHEN needs_review = 1 THEN 0 ELSE 1 END,
      FIELD(priority, 'essencial', 'alta', 'media', 'baixa'),
      due_date ASC`,
    { householdId, },
  );
}

function dueInMonthLocal(year: number, monthIndex: number, day: number) {
  const last = new Date(year, monthIndex + 1, 0).getDate();
  const d = Math.min(Math.max(1, day || 10), last);
  return `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function monthLabelPt(year: number, monthIndex: number) {
  const raw = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" }).format(
    new Date(year, monthIndex, 1),
  );
  return raw.charAt(0).toUpperCase() + raw.slice(1);
}

function startMonthForDueDay(dueDay: number) {
  const now = new Date();
  const today = now.getDate();
  // Se o dia já passou neste mês, começa no próximo
  if (dueDay < today) {
    return { year: now.getFullYear(), monthIndex: now.getMonth() + 1 };
  }
  return { year: now.getFullYear(), monthIndex: now.getMonth() };
}

export async function insertDebt(data: {
  creditor: string;
  category: string;
  total_amount: number;
  currency?: string;
  installments_total?: number | null;
  installment_amount?: number | null;
  interest_rate?: number | null;
  due_date?: string | null;
  due_day?: number | null;
  priority?: string;
  payment_type?: string | null;
  notes?: string | null;
  needs_review?: boolean;
  amount_meaning?: string | null;
  original_amount?: number | null;
  monthly_commitment?: number | null;
}) {
  const { user, householdId } = await requireHousehold();
  const id = crypto.randomUUID();

  const installmentsTotal = data.installments_total && data.installments_total > 0 ? data.installments_total : 1;
  const installmentAmount =
    data.installment_amount && data.installment_amount > 0
      ? data.installment_amount
      : Math.round((data.total_amount / installmentsTotal) * 100) / 100;
  const dueDay = data.due_day && data.due_day >= 1 && data.due_day <= 31 ? data.due_day : 10;
  const start = startMonthForDueDay(dueDay);
  const firstDue = dueInMonthLocal(start.year, start.monthIndex, dueDay);
  const paymentType =
    data.payment_type || (installmentsTotal > 1 ? "parcelado" : "pagamento_unico");

  await query(
    `INSERT INTO debts
      (id, user_id, creditor, category, currency, total_amount, original_amount, installments_total, installments_paid, installment_amount, interest_rate, due_date, due_day, priority, payment_type, notes, needs_review, amount_meaning, monthly_commitment, status)
     VALUES
      (:id, :userId, :creditor, :category, :currency, :totalAmount, :originalAmount, :installmentsTotal, 0, :installmentAmount, :interestRate, :dueDate, :dueDay, :priority, :paymentType, :notes, :needsReview, :amountMeaning, :monthlyCommitment, 'em_dia')`,
    {
      id,
      userId: user.id,
      creditor: data.creditor.trim(),
      category: data.category,
      currency: data.currency || "BRL",
      totalAmount: data.total_amount,
      originalAmount: data.original_amount ?? data.total_amount,
      installmentsTotal,
      installmentAmount,
      interestRate: data.interest_rate ?? null,
      dueDate: data.due_date || firstDue,
      dueDay,
      priority: data.priority || "media",
      paymentType,
      notes: data.notes || null,
      needsReview: data.needs_review ? 1 : 0,
      amountMeaning: data.amount_meaning || (installmentsTotal > 1 ? "per_installment" : null),
      monthlyCommitment: data.monthly_commitment ?? null,
    },
  );

  // Sempre cria ao menos 1 parcela para permitir botões de pagamento
  for (let i = 0; i < installmentsTotal; i++) {
    const y = start.year + Math.floor((start.monthIndex + i) / 12);
    const m = (start.monthIndex + i) % 12;
    const due = dueInMonthLocal(y, m, dueDay);
    const label = monthLabelPt(y, m);
    await query(
      `INSERT INTO debt_installments
        (id, user_id, debt_id, installment_number, amount, due_date, status, notes)
       VALUES (:id, :userId, :debtId, :num, :amount, :dueDate, 'pendente', :notes)`,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        debtId: id,
        num: i + 1,
        amount: installmentAmount,
        dueDate: due,
        notes: label,
      },
    );
  }

  return { id };
}

/** Reconstrói as parcelas pendentes conforme a quantidade ainda a pagar */
export async function rebuildRemainingInstallments(input: {
  debtId: string;
  remainingInstallments: number;
  installmentAmount?: number | null;
  dueDay?: number | null;
}) {
  const { user, householdId } = await requireHousehold();
  if (input.remainingInstallments < 0 || input.remainingInstallments > 120) {
    throw new Error("Quantidade de parcelas inválida");
  }

  const debts = await query<Debt[]>(
    `SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { id: input.debtId, householdId, },
  );
  const debt = debts[0];
  if (!debt) throw new Error("Dívida não encontrada");

  const paidRows = await query<DebtInstallment[]>(
    `SELECT * FROM debt_installments
     WHERE debt_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND status = 'pago'
     ORDER BY installment_number`,
    { id: input.debtId, householdId, },
  );

  await query(
    `DELETE FROM debt_installments
     WHERE debt_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND status != 'pago'`,
    { id: input.debtId, householdId, },
  );

  const dueDay =
    input.dueDay && input.dueDay >= 1 && input.dueDay <= 31
      ? input.dueDay
      : Number(debt.due_day) || 10;
  const installmentAmount =
    input.installmentAmount && input.installmentAmount > 0
      ? input.installmentAmount
      : num(debt.installment_amount) ||
        (input.remainingInstallments > 0
          ? Math.round((Math.max(0, num(debt.total_amount) - num(debt.paid_amount)) / input.remainingInstallments) * 100) /
            100
          : 0);

  const start = startMonthForDueDay(dueDay);
  const paidCount = paidRows.length;

  for (let i = 0; i < input.remainingInstallments; i++) {
    const y = start.year + Math.floor((start.monthIndex + i) / 12);
    const m = (start.monthIndex + i) % 12;
    const due = dueInMonthLocal(y, m, dueDay);
    await query(
      `INSERT INTO debt_installments
        (id, user_id, debt_id, installment_number, amount, due_date, status, notes)
       VALUES (:id, :userId, :debtId, :num, :amount, :dueDate, 'pendente', :notes)`,
      {
        id: crypto.randomUUID(),
        userId: user.id,
        debtId: input.debtId,
        num: paidCount + i + 1,
        amount: installmentAmount,
        dueDate: due,
        notes: monthLabelPt(y, m),
      },
    );
  }

  const newTotal = num(debt.paid_amount) + installmentAmount * input.remainingInstallments;
  const firstPending = await query<{ due_date: string }[]>(
    `SELECT due_date FROM debt_installments
     WHERE debt_id = :id AND status != 'pago' ORDER BY due_date ASC LIMIT 1`,
    { id: input.debtId },
  );

  await query(
    `UPDATE debts SET
      installments_total = :total,
      installments_paid = :paid,
      installment_amount = :amount,
      due_day = :dueDay,
      due_date = :dueDate,
      total_amount = :totalAmount,
      status = :status,
      paid_off_at = :paidOff,
      payment_type = 'parcelado'
     WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      total: paidCount + input.remainingInstallments,
      paid: paidCount,
      amount: installmentAmount,
      dueDay,
      dueDate: firstPending[0]?.due_date || null,
      totalAmount: Math.max(newTotal, num(debt.paid_amount)),
      status: input.remainingInstallments === 0 ? "pago" : "em_dia",
      paidOff: input.remainingInstallments === 0 ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      id: input.debtId,
      householdId,
    },
  );

  return { ok: true as const };
}

export async function updateDebt(
  id: string,
  data: Partial<{
    creditor: string;
    category: string;
    total_amount: number;
    currency: string;
    installments_total: number | null;
    installment_amount: number | null;
    interest_rate: number | null;
    due_date: string | null;
    due_day: number | null;
    priority: string;
    payment_type: string | null;
    notes: string | null;
    status: string;
    amount_meaning: string | null;
    needs_review: boolean;
    monthly_commitment: number | null;
  }>,
) {
  const { user, householdId } = await requireHousehold();
  const rows = await query<Debt[]>(
    "SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1",
    { id, householdId, },
  );
  if (!rows[0]) throw new Error("Dívida não encontrada");

  await query(
    `UPDATE debts SET
      creditor = COALESCE(:creditor, creditor),
      category = COALESCE(:category, category),
      total_amount = COALESCE(:totalAmount, total_amount),
      currency = COALESCE(:currency, currency),
      installments_total = COALESCE(:installmentsTotal, installments_total),
      installment_amount = COALESCE(:installmentAmount, installment_amount),
      interest_rate = COALESCE(:interestRate, interest_rate),
      due_date = COALESCE(:dueDate, due_date),
      due_day = COALESCE(:dueDay, due_day),
      priority = COALESCE(:priority, priority),
      payment_type = COALESCE(:paymentType, payment_type),
      notes = COALESCE(:notes, notes),
      status = COALESCE(:status, status),
      amount_meaning = COALESCE(:amountMeaning, amount_meaning),
      needs_review = COALESCE(:needsReview, needs_review),
      monthly_commitment = COALESCE(:monthlyCommitment, monthly_commitment)
     WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      id,
      householdId,
      creditor: data.creditor ?? null,
      category: data.category ?? null,
      totalAmount: data.total_amount ?? null,
      currency: data.currency ?? null,
      installmentsTotal: data.installments_total === undefined ? null : data.installments_total,
      installmentAmount: data.installment_amount === undefined ? null : data.installment_amount,
      interestRate: data.interest_rate === undefined ? null : data.interest_rate,
      dueDate: data.due_date === undefined ? null : data.due_date,
      dueDay: data.due_day === undefined ? null : data.due_day,
      priority: data.priority ?? null,
      paymentType: data.payment_type === undefined ? null : data.payment_type,
      notes: data.notes === undefined ? null : data.notes,
      status: data.status ?? null,
      amountMeaning: data.amount_meaning === undefined ? null : data.amount_meaning,
      needsReview: data.needs_review === undefined ? null : data.needs_review ? 1 : 0,
      monthlyCommitment: data.monthly_commitment === undefined ? null : data.monthly_commitment,
    },
  );
  return { ok: true as const };
}

export async function confirmDebtAmountMeaning(
  id: string,
  meaning: "per_installment" | "total_remaining",
  remainingInstallments?: number,
) {
  const { user, householdId } = await requireHousehold();
  const rows = await query<Debt[]>(
    "SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1",
    { id, householdId, },
  );
  const debt = rows[0];
  if (!debt) throw new Error("Dívida não encontrada");

  const informed = num(debt.total_amount);
  let total = informed;
  let installment = num(debt.installment_amount) || informed;
  let installmentsTotal = debt.installments_total;

  if (meaning === "per_installment") {
    const rem = remainingInstallments || debt.installments_total || 3;
    installment = informed;
    total = informed * rem;
    installmentsTotal = rem;
  } else {
    total = informed;
    installment = debt.installment_amount ? num(debt.installment_amount) : informed;
  }

  await query(
    `UPDATE debts SET
      amount_meaning = :meaning,
      needs_review = 0,
      total_amount = :total,
      original_amount = :total,
      installment_amount = :installment,
      installments_total = :installmentsTotal
     WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      meaning,
      total,
      installment,
      installmentsTotal,
      id,
      householdId,
    },
  );
  return { ok: true as const, total, installment };
}

export async function removeDebt(id: string) {
  const { user, householdId } = await requireHousehold();
  await query("DELETE FROM debt_payments WHERE debt_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)", {
    id,
    householdId,
  });
  await query("DELETE FROM debt_installments WHERE debt_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)", {
    id,
    householdId,
  });
  await query("DELETE FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)", {
    id,
    householdId,
  });
  return { ok: true as const };
}

export async function archiveDebt(id: string) {
  const { user, householdId } = await requireHousehold();
  await query(
    `UPDATE debts SET archived_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    { id, householdId, },
  );
  return { ok: true as const };
}

export async function addDebtPayment(data: {
  debtId: string;
  amount: number;
  notes?: string | null;
  idempotencyKey?: string | null;
  paidAt?: string;
}) {
  const { user, householdId } = await requireHousehold();
  if (data.amount <= 0) throw new Error("Valor inválido");

  if (data.idempotencyKey) {
    const dup = await query<{ id: string }[]>(
      `SELECT id FROM debt_payments
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND debt_id = :debtId AND idempotency_key = :key LIMIT 1`,
      { householdId, debtId: data.debtId, key: data.idempotencyKey },
    );
    if (dup.length) throw new Error("Pagamento já registrado");
  }

  const rows = await query<Debt[]>(
    "SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1",
    { id: data.debtId, householdId, },
  );
  const debt = rows[0];
  if (!debt) throw new Error("Dívida não encontrada");
  if (debt.status === "pago") throw new Error("Dívida já quitada");

  const balance = debtBalance(debt);
  if (data.amount > balance + 0.001) {
    throw new Error(`Pagamento maior que o saldo (${balance.toFixed(2)}). Confirme o valor.`);
  }

  const newPaid = num(debt.paid_amount) + data.amount;
  const newInstallments = Number(debt.installments_paid) + 1;
  const isRecurringCard = debt.payment_type === "cartao_credito";
  const fullyPaid = !isRecurringCard && newPaid >= num(debt.total_amount) - 0.001;
  const paymentId = crypto.randomUUID();
  const paidAt = data.paidAt || new Date().toISOString().slice(0, 10);

  await query(
    `INSERT INTO debt_payments (id, user_id, debt_id, amount, paid_at, notes, idempotency_key)
     VALUES (:id, :userId, :debtId, :amount, :paidAt, :notes, :key)`,
    {
      id: paymentId,
      userId: user.id,
      debtId: data.debtId,
      amount: data.amount,
      paidAt,
      notes: data.notes || null,
      key: data.idempotencyKey || null,
    },
  );

  await query(
    `UPDATE debts SET
      paid_amount = :paidAmount,
      installments_paid = :installmentsPaid,
      status = :status,
      paid_off_at = :paidOffAt
     WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      paidAmount: Math.min(newPaid, num(debt.total_amount)),
      installmentsPaid: newInstallments,
      status: fullyPaid ? "pago" : "em_dia",
      paidOffAt: fullyPaid ? new Date().toISOString().slice(0, 19).replace("T", " ") : null,
      id: data.debtId,
      householdId,
    },
  );

  return { ok: true as const, fullyPaid };
}

export async function payoffDebt(id: string) {
  const { user, householdId } = await requireHousehold();
  const rows = await query<Debt[]>(
    "SELECT * FROM debts WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1",
    { id, householdId, },
  );
  const debt = rows[0];
  if (!debt) throw new Error("Dívida não encontrada");
  if (debt.payment_type === "cartao_credito") {
    throw new Error("Cartão de crédito não pode ser quitado — pague a fatura do mês.");
  }
  const remaining = debtBalance(debt);
  if (remaining <= 0) {
    await query(
      `UPDATE debts SET status = 'pago', paid_off_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
      { id, householdId, },
    );
    return { ok: true as const };
  }
  return addDebtPayment({
    debtId: id,
    amount: remaining,
    notes: "Quitação total",
    idempotencyKey: `payoff-${id}-${remaining}`,
  });
}

export async function fetchDebtPayments(debtId: string) {
  const { user, householdId } = await requireHousehold();
  return query<DebtPayment[]>(
    `SELECT * FROM debt_payments
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND debt_id = :debtId
     ORDER BY paid_at DESC, created_at DESC`,
    { householdId, debtId },
  );
}

export async function fetchDebtInstallments(debtId: string) {
  const { user, householdId } = await requireHousehold();
  return query<DebtInstallment[]>(
    `SELECT * FROM debt_installments
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND debt_id = :debtId
     ORDER BY installment_number ASC`,
    { householdId, debtId },
  );
}

export async function upsertDebtInstallment(data: {
  debtId: string;
  installment_number: number;
  amount: number;
  due_date?: string | null;
  status?: string;
  notes?: string | null;
}) {
  const { user, householdId } = await requireHousehold();
  const existing = await query<DebtInstallment[]>(
    `SELECT id FROM debt_installments
     WHERE debt_id = :debtId AND installment_number = :num AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { debtId: data.debtId, num: data.installment_number, householdId, },
  );
  if (existing[0]) {
    await query(
      `UPDATE debt_installments SET amount = :amount, due_date = :dueDate, status = :status, notes = :notes
       WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
      {
        amount: data.amount,
        dueDate: data.due_date || null,
        status: data.status || "pendente",
        notes: data.notes || null,
        id: existing[0].id,
        householdId,
      },
    );
    return { id: existing[0].id };
  }
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO debt_installments
      (id, user_id, debt_id, installment_number, amount, due_date, status, notes)
     VALUES (:id, :userId, :debtId, :num, :amount, :dueDate, :status, :notes)`,
    {
      id,
      userId: user.id,
      debtId: data.debtId,
      num: data.installment_number,
      amount: data.amount,
      dueDate: data.due_date || null,
      status: data.status || "pendente",
      notes: data.notes || null,
    },
  );
  return { id };
}

// —— Recurring ——

export async function fetchRecurringAccounts() {
  const { user, householdId } = await requireHousehold();
  return query<RecurringAccount[]>(
    `SELECT * FROM recurring_accounts
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND archived_at IS NULL
     ORDER BY due_day ASC, name ASC`,
    { householdId, },
  );
}

export async function insertRecurringAccount(data: {
  name: string;
  category: string;
  amount: number;
  currency?: string;
  frequency?: string;
  due_day?: number | null;
  priority?: string;
  status?: string;
  payment_method?: string | null;
  notes?: string | null;
  auto_generate?: boolean;
}) {
  const { user, householdId } = await requireHousehold();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO recurring_accounts
      (id, user_id, name, category, amount, currency, frequency, due_day, priority, status, payment_method, notes, auto_generate)
     VALUES
      (:id, :userId, :name, :category, :amount, :currency, :frequency, :dueDay, :priority, :status, :paymentMethod, :notes, :autoGenerate)`,
    {
      id,
      userId: user.id,
      name: data.name.trim(),
      category: data.category,
      amount: data.amount,
      currency: data.currency || "BRL",
      frequency: data.frequency || "mensal",
      dueDay: data.due_day ?? null,
      priority: data.priority || "media",
      status: data.status || "ativa",
      paymentMethod: data.payment_method || null,
      notes: data.notes || null,
      autoGenerate: data.auto_generate === false ? 0 : 1,
    },
  );
  return { id };
}

export async function updateRecurringAccount(
  id: string,
  data: Partial<{
    name: string;
    category: string;
    amount: number;
    frequency: string;
    due_day: number | null;
    priority: string;
    status: string;
    payment_method: string | null;
    notes: string | null;
    auto_generate: boolean;
  }>,
) {
  const { user, householdId } = await requireHousehold();
  await query(
    `UPDATE recurring_accounts SET
      name = COALESCE(:name, name),
      category = COALESCE(:category, category),
      amount = COALESCE(:amount, amount),
      frequency = COALESCE(:frequency, frequency),
      due_day = COALESCE(:dueDay, due_day),
      priority = COALESCE(:priority, priority),
      status = COALESCE(:status, status),
      payment_method = COALESCE(:paymentMethod, payment_method),
      notes = COALESCE(:notes, notes),
      auto_generate = COALESCE(:autoGenerate, auto_generate)
     WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      id,
      householdId,
      name: data.name ?? null,
      category: data.category ?? null,
      amount: data.amount ?? null,
      frequency: data.frequency ?? null,
      dueDay: data.due_day === undefined ? null : data.due_day,
      priority: data.priority ?? null,
      status: data.status ?? null,
      paymentMethod: data.payment_method === undefined ? null : data.payment_method,
      notes: data.notes === undefined ? null : data.notes,
      autoGenerate: data.auto_generate === undefined ? null : data.auto_generate ? 1 : 0,
    },
  );
  return { ok: true as const };
}

export async function removeRecurringAccount(id: string) {
  const { user, householdId } = await requireHousehold();
  await query(
    `UPDATE recurring_accounts SET archived_at = CURRENT_TIMESTAMP WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    { id, householdId, },
  );
  return { ok: true as const };
}

export async function generateRecurringForPeriod(year?: number, month?: number) {
  const { user, householdId } = await requireHousehold();
  const now = new Date();
  const y = year ?? now.getFullYear();
  const m = month ?? now.getMonth();
  const key = periodKey(y, m);
  const accounts = await fetchRecurringAccounts();
  let created = 0;

  for (const acc of accounts) {
    if (!isTruthy(acc.auto_generate) || acc.status === "inativa") continue;
    if (!acc.due_day) continue;
    const due = dueDateForDay(y, m, Number(acc.due_day));
    const id = crypto.randomUUID();
    try {
      await query(
        `INSERT INTO recurring_ledger (id, user_id, account_id, period_key, amount, due_date, status)
         VALUES (:id, :userId, :accountId, :periodKey, :amount, :dueDate, 'pendente')`,
        {
          id,
          userId: user.id,
          accountId: acc.id,
          periodKey: key,
          amount: num(acc.amount),
          dueDate: due,
        },
      );
      created += 1;
    } catch {
      // unique violation = already generated (idempotent)
    }
  }
  return { created, periodKey: key };
}

// —— Goals / Reserve ——

export async function fetchGoals() {
  const { user, householdId } = await requireHousehold();
  return query<Goal[]>(
    `SELECT * FROM goals WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) ORDER BY created_at DESC`,
    { householdId, },
  );
}

export async function insertGoal(data: {
  title: string;
  target_amount: number;
  current_amount?: number;
  deadline?: string | null;
  kind?: string;
  monthly_contribution?: number | null;
}) {
  const { user, householdId } = await requireHousehold();
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO goals (id, user_id, title, target_amount, current_amount, deadline, kind, monthly_contribution)
     VALUES (:id, :userId, :title, :targetAmount, :currentAmount, :deadline, :kind, :monthlyContribution)`,
    {
      id,
      userId: user.id,
      title: data.title.trim(),
      targetAmount: data.target_amount,
      currentAmount: data.current_amount || 0,
      deadline: data.deadline || null,
      kind: data.kind || "custom",
      monthlyContribution: data.monthly_contribution ?? null,
    },
  );
  return { id };
}

export async function addGoalContribution(data: { id: string; amount: number; notes?: string }) {
  const { user, householdId } = await requireHousehold();
  if (data.amount <= 0) throw new Error("Valor inválido");
  await query(
    `UPDATE goals SET current_amount = current_amount + :amount WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    { amount: data.amount, id: data.id, householdId, },
  );
  await query(
    `INSERT INTO goal_transactions (id, user_id, goal_id, amount, notes, occurred_at)
     VALUES (:id, :userId, :goalId, :amount, :notes, :occurredAt)`,
    {
      id: crypto.randomUUID(),
      userId: user.id,
      goalId: data.id,
      amount: data.amount,
      notes: data.notes || null,
      occurredAt: new Date().toISOString().slice(0, 10),
    },
  );
  return { ok: true as const };
}

export async function removeGoal(id: string) {
  const { user, householdId } = await requireHousehold();
  await query("DELETE FROM goal_transactions WHERE goal_id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)", {
    id,
    householdId,
  });
  await query("DELETE FROM goals WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)", {
    id,
    householdId,
  });
  return { ok: true as const };
}

export async function fetchReserve() {
  const { user, householdId } = await requireHousehold();
  const rows = await query<ReserveAccount[]>(
    `SELECT * FROM reserve_accounts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { householdId, },
  );
  return rows[0] || null;
}

export async function fetchReserveTransactions() {
  const { user, householdId } = await requireHousehold();
  return query<ReserveTransaction[]>(
    `SELECT rt.* FROM reserve_transactions rt
     INNER JOIN reserve_accounts ra ON ra.id = rt.reserve_id
     WHERE rt.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)
     ORDER BY rt.occurred_at DESC, rt.created_at DESC`,
    { householdId, },
  );
}

export async function ensureReserve() {
  const { user, householdId } = await requireHousehold();
  const existing = await fetchReserve();
  if (existing) return existing;
  const id = crypto.randomUUID();
  await query(
    `INSERT INTO reserve_accounts (id, user_id, name, current_amount, target_amount, safety_target)
     VALUES (:id, :userId, 'Reserva de emergência', 0, 10000, 1000)`,
    { id, userId: user.id },
  );
  return (await fetchReserve())!;
}

export async function reserveMove(data: {
  type: "deposit" | "withdraw";
  amount: number;
  reason?: string | null;
  occurred_at?: string;
  attachment_url?: string | null;
}) {
  const { user, householdId } = await requireHousehold();
  if (data.amount <= 0) throw new Error("Valor inválido");
  const reserve = await ensureReserve();
  const current = num(reserve.current_amount);
  if (data.type === "withdraw" && data.amount > current) {
    throw new Error("Saldo insuficiente na reserva");
  }
  const next = data.type === "deposit" ? current + data.amount : current - data.amount;
  await query(
    `UPDATE reserve_accounts SET current_amount = :amount WHERE id = :id AND user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    { amount: next, id: reserve.id, householdId, },
  );
  await query(
    `INSERT INTO reserve_transactions
      (id, user_id, reserve_id, type, amount, reason, occurred_at, attachment_url)
     VALUES (:id, :userId, :reserveId, :type, :amount, :reason, :occurredAt, :attachmentUrl)`,
    {
      id: crypto.randomUUID(),
      userId: user.id,
      reserveId: reserve.id,
      type: data.type,
      amount: data.amount,
      reason: data.reason || null,
      occurredAt: data.occurred_at || new Date().toISOString().slice(0, 10),
      attachmentUrl: data.attachment_url || null,
    },
  );
  // sync profile saved_amount + reserve goals
  await query(`UPDATE profiles SET saved_amount = :amount WHERE id = :userId`, {
    amount: next,
    userId: user.id,
  });
  await query(
    `UPDATE goals SET current_amount = :amount
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND kind IN ('reserve_min', 'reserve_main')`,
    { amount: next, householdId, },
  );
  return { ok: true as const, current_amount: next };
}

// —— Settings / Profile ——

export async function fetchFinancialProfile() {
  const { user, householdId } = await requireHousehold();
  const rows = await query<FinancialProfile[]>(
    `SELECT id, display_name, income_type, income_min, income_avg, income_max, saved_amount, situation_note
     FROM profiles WHERE id = :id LIMIT 1`,
    { id: user.id },
  );
  return rows[0] || null;
}

export async function fetchSettings() {
  const { user, householdId } = await requireHousehold();
  const rows = await query<FinancialSettings[]>(
    `SELECT * FROM financial_settings WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) LIMIT 1`,
    { householdId, },
  );
  if (rows[0]) return rows[0];
  await query(
    `INSERT INTO financial_settings (user_id, active_income_scenario) VALUES (:userId, 'avg')`,
    { userId: user.id },
  );
  return {
    user_id: user.id,
    usd_rate_manual: null,
    active_income_scenario: "avg" as const,
  };
}

export async function updateSettings(data: {
  usd_rate_manual?: number | null;
  active_income_scenario?: IncomeScenario;
}) {
  const { user, householdId } = await requireHousehold();
  await fetchSettings();
  await query(
    `UPDATE financial_settings SET
      usd_rate_manual = COALESCE(:usdRate, usd_rate_manual),
      active_income_scenario = COALESCE(:scenario, active_income_scenario)
     WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId)`,
    {
      householdId,
      usdRate: data.usd_rate_manual === undefined ? null : data.usd_rate_manual,
      scenario: data.active_income_scenario ?? null,
    },
  );
  return { ok: true as const };
}

// —— Calendar ——

export async function fetchCalendarEvents() {
  const { user, householdId } = await requireHousehold();
  const now = new Date();
  await generateRecurringForPeriod(now.getFullYear(), now.getMonth());

  const [debts, recurring, incomes, installments, payments, monthlyBills] = await Promise.all([
    query<Debt[]>(
      `SELECT * FROM debts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND archived_at IS NULL AND due_date IS NOT NULL`,
      { householdId, },
    ),
    query<
      (RecurringAccount & { ledger_due?: string; ledger_status?: string; ledger_id?: string })[]
    >(
      `SELECT ra.*, rl.due_date AS ledger_due, rl.status AS ledger_status, rl.id AS ledger_id
       FROM recurring_accounts ra
       LEFT JOIN recurring_ledger rl ON rl.account_id = ra.id
         AND rl.period_key = :periodKey AND rl.user_id = ra.user_id
       WHERE ra.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND ra.archived_at IS NULL`,
      { householdId, periodKey: periodKey(now.getFullYear(), now.getMonth()) },
    ),
    query<Income[]>(
      `SELECT * FROM incomes WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND status IN ('prevista','parcial','atrasada')`,
      { householdId, },
    ),
    query<(DebtInstallment & { creditor?: string })[]>(
      `SELECT di.*, d.creditor
       FROM debt_installments di
       JOIN debts d ON d.id = di.debt_id
       WHERE di.user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND di.due_date IS NOT NULL AND di.status != 'pago'`,
      { householdId, },
    ),
    query<DebtPayment[]>(
      `SELECT * FROM debt_payments WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) ORDER BY paid_at DESC LIMIT 100`,
      { householdId, },
    ),
    query<{ id: string; source_type: string; source_id: string | null }[]>(
      `SELECT id, source_type, source_id FROM monthly_bills
       WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND reference_month = :month`,
      { householdId, month: periodKey(now.getFullYear(), now.getMonth()) },
    ),
  ]);

  const billBySource = new Map<string, string>();
  for (const b of monthlyBills) {
    if (b.source_id) billBySource.set(`${b.source_type}:${b.source_id}`, b.id);
  }

  const events: CalendarEvent[] = [];

  for (const d of debts) {
    if (!d.due_date || d.status === "pago") continue;
    events.push({
      id: `debt-${d.id}`,
      kind: "debt",
      title: d.creditor,
      amount: debtBalance(d),
      currency: d.currency || "BRL",
      date: d.due_date,
      status: d.status,
      priority: d.priority || "media",
      category: d.category,
      debtId: d.id,
    });
  }

  for (const r of recurring) {
    const date =
      r.ledger_due ||
      (r.due_day
        ? dueDateForDay(now.getFullYear(), now.getMonth(), Number(r.due_day))
        : null);
    if (!date) continue;
    events.push({
      id: `rec-${r.id}-${periodKey(now.getFullYear(), now.getMonth())}`,
      kind: "recurring",
      title: r.name,
      amount: num(r.amount),
      currency: r.currency || "BRL",
      date,
      status: r.ledger_status || r.status,
      priority: r.priority,
      category: r.category,
      accountId: r.id,
      billId: billBySource.get(`recurring:${r.id}`),
    });
  }

  for (const i of incomes) {
    const date = i.expected_at || i.received_at;
    events.push({
      id: `inc-${i.id}`,
      kind: "income",
      title: i.description,
      amount: num(i.amount),
      currency: "BRL",
      date,
      status: i.status,
      priority: "media",
      category: i.category || "Receita",
    });
  }

  for (const inst of installments) {
    if (!inst.due_date) continue;
    events.push({
      id: `inst-${inst.id}`,
      kind: "installment",
      title: inst.creditor
        ? `${inst.creditor} — Parcela #${inst.installment_number}`
        : `Parcela #${inst.installment_number}`,
      amount: num(inst.amount),
      currency: "BRL",
      date: inst.due_date,
      status: inst.status,
      priority: "media",
      category: "Parcela",
      debtId: inst.debt_id,
    });
  }

  for (const p of payments) {
    events.push({
      id: `pay-${p.id}`,
      kind: "payment",
      title: "Pagamento realizado",
      amount: num(p.amount),
      currency: "BRL",
      date: p.paid_at,
      status: "pago",
      priority: "media",
      category: "Pagamento",
      debtId: p.debt_id,
    });
  }

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

// —— Overview / Health ——

function computeHealth(input: {
  commitmentPct: number;
  overdueCount: number;
  reserve: number;
  safetyTarget: number;
  projectedBalance: number;
  activeDebts: number;
  incomesThisMonth: number;
}): HealthReport {
  let score = 55;
  const reasons: string[] = [];
  const positives: string[] = [];
  const risks: string[] = [];
  const actions: string[] = [];

  if (input.commitmentPct > 100) {
    score -= 25;
    risks.push("Orçamento mensal acima da renda no cenário atual.");
    reasons.push(`Comprometimento de ${input.commitmentPct.toFixed(0)}% da renda.`);
  } else if (input.commitmentPct > 85) {
    score -= 15;
    risks.push("Renda altamente comprometida.");
    reasons.push(`Comprometimento de ${input.commitmentPct.toFixed(0)}% da renda.`);
  } else if (input.commitmentPct < 70) {
    score += 10;
    positives.push("Comprometimento da renda em nível administrável.");
  }

  if (input.overdueCount > 0) {
    score -= input.overdueCount * 8;
    risks.push(`${input.overdueCount} compromisso(s) atrasado(s).`);
  } else {
    score += 12;
    positives.push("Nenhuma dívida/conta atrasada.");
    reasons.push("Todas as dívidas e contas em dia.");
  }

  if (input.reserve < input.safetyTarget) {
    score -= 15;
    risks.push("Caixa vulnerável: reserva abaixo do mínimo de segurança.");
    actions.push("Priorize depositar até R$ 1.000 na reserva.");
  } else if (input.reserve >= 10000) {
    score += 15;
    positives.push("Reserva principal atingida.");
  } else {
    score += 5;
    positives.push("Reserva acima do mínimo de segurança.");
  }

  if (input.projectedBalance < 0) {
    score -= 12;
    risks.push("Saldo projetado negativo antes das dívidas pontuais.");
    actions.push("Aumente receita ou reduza gastos variáveis.");
  } else if (input.projectedBalance > 1000) {
    score += 8;
    positives.push("Folga mensal positiva no cenário atual.");
  }

  if (input.activeDebts > 5) {
    score -= 5;
    reasons.push(`${input.activeDebts} dívidas ativas em aberto.`);
  }

  if (input.incomesThisMonth <= 0) {
    score -= 5;
    actions.push("Registre receitas do mês para melhorar a previsão.");
  } else {
    positives.push("Há receita registrada no mês.");
  }

  actions.push("Evite novos parcelamentos até reduzir o comprometimento.");
  actions.push("Quite primeiro os menores saldos (efeito bola de neve).");
  actions.push("Mantenha o dia a dia em dia (aluguel, carro, pensão).");

  score = Math.max(0, Math.min(100, Math.round(score)));
  const label =
    score >= 85
      ? "Excelente"
      : score >= 70
        ? "Boa"
        : score >= 50
          ? "Regular"
          : score >= 30
            ? "Atenção"
            : "Crítica";

  return {
    score,
    label,
    reasons,
    positives,
    risks,
    actions: actions.slice(0, 5),
  };
}

export async function fetchFinanceOverview() {
  const { user, householdId } = await requireHousehold();
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  const yearStart = `${now.getFullYear()}-01-01`;

  const [profile, settings, incomes, expenses, debts, goals, recurring, reserve] =
    await Promise.all([
      fetchFinancialProfile(),
      fetchSettings(),
      query<Income[]>(
        `SELECT * FROM incomes WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND received_at >= :yearStart`,
        { householdId, yearStart },
      ),
      query<Expense[]>(
        `SELECT * FROM expenses WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND spent_at >= :yearStart`,
        { householdId, yearStart },
      ),
      fetchDebts({ includeArchived: false }),
      fetchGoals(),
      fetchRecurringAccounts(),
      ensureReserve(),
    ]);

  await generateRecurringForPeriod(now.getFullYear(), now.getMonth());

  const incomeMin = num(profile?.income_min) || 8000;
  const incomeAvg = num(profile?.income_avg) || 9000;
  const incomeMax = num(profile?.income_max) || 10000;
  const scenario = (settings.active_income_scenario || "avg") as IncomeScenario;
  const scenarioIncome =
    scenario === "min" ? incomeMin : scenario === "max" ? incomeMax : incomeAvg;

  const recurringTotal = recurring
    .filter((r) => r.status !== "inativa" && r.category !== "Contas da casa")
    .reduce((a, r) => a + num(r.amount), 0);

  const monthExpenses = expenses.filter((e) => e.spent_at >= monthStart);
  const essentialFromTemplates = expenses
    .filter((e) => isTruthy(e.is_essential) && isTruthy(e.is_recurring))
    .reduce((a, e) => a + num(e.amount), 0);

  // Prefer templates (seed) for monthly essential estimate; fall back to this month's essentials
  const essentialMonthly = monthExpenses
    .filter((e) => isTruthy(e.is_essential) && !isTruthy(e.is_recurring))
    .reduce((a, e) => a + num(e.amount), 0);

  const variableEssentialEstimate =
    essentialFromTemplates > 0 ? essentialFromTemplates : essentialMonthly || 1650;

  const monthlyBeforeDebts = recurringTotal + variableEssentialEstimate;
  const projectedBalance = scenarioIncome - monthlyBeforeDebts;
  const commitmentPct = scenarioIncome > 0 ? (monthlyBeforeDebts / scenarioIncome) * 100 : 0;

  const activeBrlDebts = debts.filter(countsInBrlTotal);
  const usdDebts = debts.filter(
    (d) => (d.currency || "BRL") === "USD" && !d.archived_at && d.status !== "pago",
  );
  const totalDebtsBrl = activeBrlDebts.reduce((a, d) => a + debtBalance(d), 0);
  const totalDebtsUsd = usdDebts.reduce((a, d) => a + debtBalance(d), 0);

  const incomesMonth = incomes.filter(
    (i) => i.received_at >= monthStart && ["recebida", "parcial"].includes(i.status),
  );
  const incomesExpected = incomes.filter((i) =>
    ["prevista", "parcial", "atrasada"].includes(i.status),
  );
  const receitaMes = incomesMonth.reduce((a, i) => a + num(i.amount), 0);
  const receitaPrevista = incomesExpected.reduce((a, i) => a + num(i.amount), 0);
  const gastoMes = monthExpenses.reduce((a, e) => a + num(e.amount), 0);

  const overdue = debts.filter((d) => {
    if (!d.due_date || d.status === "pago" || d.archived_at) return false;
    return new Date(d.due_date + "T00:00:00") < new Date(new Date().toDateString());
  }).length;

  const installmentsThisMonth = debts
    .filter((d) => isActiveDebt(d) && (d.currency || "BRL") === "BRL")
    .reduce((a, d) => a + (num(d.installment_amount) || num(d.monthly_commitment) || 0), 0);

  const health = computeHealth({
    commitmentPct,
    overdueCount: overdue,
    reserve: num(reserve.current_amount),
    safetyTarget: num(reserve.safety_target),
    projectedBalance,
    activeDebts: activeBrlDebts.length + usdDebts.length,
    incomesThisMonth: receitaMes,
  });

  const largestDebt = [...activeBrlDebts].sort(
    (a, b) => debtBalance(b) - debtBalance(a),
  )[0];
  const smallestDebts = [...activeBrlDebts]
    .sort((a, b) => debtBalance(a) - debtBalance(b))
    .slice(0, 2);

  const insights: string[] = [
    `Sua reserva atual é de ${num(reserve.current_amount).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    overdue === 0
      ? "Nenhuma dívida está atrasada."
      : `Há ${overdue} compromisso(s) em atraso.`,
    `No cenário de renda mínima, o saldo antes das dívidas pontuais é ${(incomeMin - monthlyBeforeDebts).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}.`,
    `No cenário de renda média, sobram aproximadamente ${(incomeAvg - monthlyBeforeDebts).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} antes das parcelas.`,
    `No cenário de renda máxima, sobram aproximadamente ${(incomeMax - monthlyBeforeDebts).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} antes das parcelas.`,
  ];
  if (largestDebt) {
    insights.push(
      `${largestDebt.creditor} é a maior dívida em reais (${debtBalance(largestDebt).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}).`,
    );
  }
  if (smallestDebts.length) {
    insights.push(
      `${smallestDebts.map((d) => d.creditor).join(" e ")} são os menores saldos — bons candidatos à quitação rápida.`,
    );
  }
  insights.push("Evite assumir novos parcelamentos.");
  insights.push("Priorize aumentar a receita recorrente.");

  // chart series
  const buckets: Record<string, { month: string; receitas: number; gastos: number }> = {};
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    buckets[key] = {
      month: d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", ""),
      receitas: 0,
      gastos: 0,
    };
  }
  incomes.forEach((r) => {
    const key = r.received_at.slice(0, 7);
    if (buckets[key]) buckets[key].receitas += num(r.amount);
  });
  expenses.forEach((r) => {
    const key = r.spent_at.slice(0, 7);
    if (buckets[key]) buckets[key].gastos += num(r.amount);
  });

  const catMap: Record<string, number> = {};
  monthExpenses.forEach((r) => {
    catMap[r.category] = (catMap[r.category] || 0) + num(r.amount);
  });
  const categories = Object.entries(catMap)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const upcoming = debts
    .filter((d) => d.due_date && d.status !== "pago" && !d.archived_at)
    .slice(0, 8);

  return {
    profile,
    settings,
    incomeMin,
    incomeAvg,
    incomeMax,
    scenario,
    scenarioIncome,
    recurringTotal,
    variableEssentialEstimate,
    monthlyBeforeDebts,
    projectedBalance,
    commitmentPct,
    totalDebtsBrl,
    totalDebtsUsd,
    receitaMes,
    receitaPrevista,
    gastoMes,
    installmentsThisMonth,
    savedAmount: num(profile?.saved_amount ?? reserve.current_amount),
    reserve,
    debts,
    goals,
    recurring,
    series: Object.values(buckets),
    categories,
    upcoming,
    health,
    insights: insights.slice(0, 10),
    actions: health.actions,
    alert:
      projectedBalance < 500
        ? `Seu orçamento mensal está altamente comprometido. No cenário de renda ${
            scenario === "min" ? "mínima" : scenario === "max" ? "máxima" : "média"
          }, ${
            projectedBalance < 0 ? "falta" : "restam aproximadamente"
          } ${Math.abs(projectedBalance).toLocaleString("pt-BR", {
            style: "currency",
            currency: "BRL",
          })} antes das parcelas e dívidas pontuais.`
        : null,
  };
}

export async function globalSearch(q: string) {
  const { user, householdId } = await requireHousehold();
  const term = `%${q.trim()}%`;
  if (q.trim().length < 2) return { debts: [], incomes: [], expenses: [], goals: [], recurring: [] };

  const [debts, incomes, expenses, goals, recurring] = await Promise.all([
    query<Debt[]>(
      `SELECT * FROM debts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND (creditor LIKE :term OR notes LIKE :term OR category LIKE :term) LIMIT 10`,
      { householdId, term },
    ),
    query<Income[]>(
      `SELECT * FROM incomes WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND (description LIKE :term OR client_name LIKE :term OR category LIKE :term) LIMIT 10`,
      { householdId, term },
    ),
    query<Expense[]>(
      `SELECT * FROM expenses WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND (description LIKE :term OR category LIKE :term) LIMIT 10`,
      { householdId, term },
    ),
    query<Goal[]>(
      `SELECT * FROM goals WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND title LIKE :term LIMIT 10`,
      { householdId, term },
    ),
    query<RecurringAccount[]>(
      `SELECT * FROM recurring_accounts WHERE user_id IN (SELECT hm.user_id FROM household_members hm WHERE hm.household_id = :householdId) AND archived_at IS NULL AND (name LIKE :term OR category LIKE :term) LIMIT 10`,
      { householdId, term },
    ),
  ]);

  return { debts, incomes, expenses, goals, recurring };
}

export async function fetchPayoffPlan(strategy: "smallest" | "interest" | "impact" = "smallest") {
  const debts = (await fetchDebts()).filter(
    (d) => countsInBrlTotal(d) && debtBalance(d) > 0,
  );
  const usd = (await fetchDebts()).filter(
    (d) => (d.currency || "BRL") === "USD" && d.status !== "pago" && !d.archived_at,
  );

  const sorted = [...debts].sort((a, b) => {
    if (strategy === "interest") {
      return num(b.interest_rate) - num(a.interest_rate) || debtBalance(a) - debtBalance(b);
    }
    if (strategy === "impact") {
      const ia = num(a.installment_amount) || num(a.monthly_commitment) || debtBalance(a);
      const ib = num(b.installment_amount) || num(b.monthly_commitment) || debtBalance(b);
      return ib - ia;
    }
    return debtBalance(a) - debtBalance(b);
  });

  return { brl: sorted, usd, strategy };
}
