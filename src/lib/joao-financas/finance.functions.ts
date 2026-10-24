import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type {
  CalendarEvent,
  Debt,
  Expense,
  Goal,
  Income,
  RecurringAccount,
  ReserveAccount,
} from "./finance.types";

export const listIncomes = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchIncomes } = await import("./finance.server");
  return fetchIncomes();
});

export const listExpenses = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchExpenses } = await import("./finance.server");
  return fetchExpenses();
});

export const createIncome = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      description: z.string().min(1),
      amount: z.number().nonnegative(),
      category: z.string().optional(),
      source: z.string().nullable().optional(),
      client_name: z.string().nullable().optional(),
      payment_method: z.string().nullable().optional(),
      recurrence: z.string().default("unique"),
      status: z.string().optional(),
      expected_at: z.string().nullable().optional(),
      received_at: z.string(),
      is_recurring: z.boolean().optional(),
      notes: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { insertIncome } = await import("./finance.server");
    return insertIncome(data);
  });

export const createExpense = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      description: z.string().min(1),
      amount: z.number().nonnegative(),
      category: z.string().default("Outros"),
      payment_method: z.string().nullable().optional(),
      spent_at: z.string(),
      is_recurring: z.boolean().optional(),
      is_essential: z.boolean().optional(),
      status: z.string().optional(),
      notes: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { insertExpense } = await import("./finance.server");
    return insertExpense(data);
  });

export const deleteTransaction = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      table: z.enum(["incomes", "expenses"]),
      id: z.string().uuid(),
    }),
  )
  .handler(async ({ data }) => {
    const { removeTransaction } = await import("./finance.server");
    return removeTransaction(data);
  });

export const listDebts = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({
        withDueDateOnly: z.boolean().optional(),
        includeArchived: z.boolean().optional(),
      })
      .optional(),
  )
  .handler(async ({ data }) => {
    const { fetchDebts } = await import("./finance.server");
    return fetchDebts(data);
  });

export const createDebt = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      creditor: z.string().min(1),
      category: z.string(),
      total_amount: z.number().positive(),
      currency: z.string().optional(),
      installments_total: z.number().int().min(1).max(120).nullable().optional(),
      installment_amount: z.number().nullable().optional(),
      interest_rate: z.number().nullable().optional(),
      due_date: z.string().nullable().optional(),
      due_day: z.number().int().nullable().optional(),
      priority: z.string().optional(),
      payment_type: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      needs_review: z.boolean().optional(),
      amount_meaning: z.string().nullable().optional(),
      original_amount: z.number().nullable().optional(),
      monthly_commitment: z.number().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { insertDebt } = await import("./finance.server");
    return insertDebt(data);
  });

export const updateDebtFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      patch: z.record(z.any()),
    }),
  )
  .handler(async ({ data }) => {
    const { updateDebt } = await import("./finance.server");
    return updateDebt(data.id, data.patch);
  });

export const rebuildInstallmentsFn = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      debtId: z.string().uuid(),
      remainingInstallments: z.number().int().min(0).max(120),
      installmentAmount: z.number().positive().nullable().optional(),
      dueDay: z.number().int().min(1).max(31).nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { rebuildRemainingInstallments } = await import("./finance.server");
    return rebuildRemainingInstallments(data);
  });

export const confirmHavanMeaning = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      meaning: z.enum(["per_installment", "total_remaining"]),
      remainingInstallments: z.number().int().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { confirmDebtAmountMeaning } = await import("./finance.server");
    return confirmDebtAmountMeaning(data.id, data.meaning, data.remainingInstallments);
  });

export const deleteDebt = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { removeDebt } = await import("./finance.server");
    return removeDebt(data.id);
  });

export const archiveDebtFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { archiveDebt } = await import("./finance.server");
    return archiveDebt(data.id);
  });

export const registerDebtPayment = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      debtId: z.string().uuid(),
      amount: z.number().positive(),
      notes: z.string().nullable().optional(),
      idempotencyKey: z.string().nullable().optional(),
      paidAt: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { addDebtPayment } = await import("./finance.server");
    return addDebtPayment(data);
  });

export const payoffDebtFn = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { payoffDebt } = await import("./finance.server");
    return payoffDebt(data.id);
  });

export const listDebtPayments = createServerFn({ method: "GET" })
  .inputValidator(z.object({ debtId: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { fetchDebtPayments } = await import("./finance.server");
    return fetchDebtPayments(data.debtId);
  });

export const listGoals = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchGoals } = await import("./finance.server");
  return fetchGoals();
});

export const createGoal = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      title: z.string().min(1),
      target_amount: z.number().positive(),
      current_amount: z.number().nonnegative().default(0),
      deadline: z.string().nullable().optional(),
      kind: z.string().optional(),
      monthly_contribution: z.number().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { insertGoal } = await import("./finance.server");
    return insertGoal(data);
  });

export const contributeGoal = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      id: z.string().uuid(),
      amount: z.number().positive(),
      notes: z.string().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { addGoalContribution } = await import("./finance.server");
    return addGoalContribution(data);
  });

export const deleteGoal = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { removeGoal } = await import("./finance.server");
    return removeGoal(data.id);
  });

export const getFinanceOverview = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchFinanceOverview } = await import("./finance.server");
  return fetchFinanceOverview();
});

export const setIncomeScenario = createServerFn({ method: "POST" })
  .inputValidator(z.object({ scenario: z.enum(["min", "avg", "max"]) }))
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./finance.server");
    return updateSettings({ active_income_scenario: data.scenario });
  });

export const setUsdRate = createServerFn({ method: "POST" })
  .inputValidator(z.object({ rate: z.number().positive().nullable() }))
  .handler(async ({ data }) => {
    const { updateSettings } = await import("./finance.server");
    return updateSettings({ usd_rate_manual: data.rate });
  });

export const listRecurring = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchRecurringAccounts } = await import("./finance.server");
  return fetchRecurringAccounts();
});

export const createRecurring = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      name: z.string().min(1),
      category: z.string(),
      amount: z.number().positive(),
      currency: z.string().optional(),
      frequency: z.string().optional(),
      due_day: z.number().int().nullable().optional(),
      priority: z.string().optional(),
      status: z.string().optional(),
      payment_method: z.string().nullable().optional(),
      notes: z.string().nullable().optional(),
      auto_generate: z.boolean().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { insertRecurringAccount } = await import("./finance.server");
    return insertRecurringAccount(data);
  });

export const updateRecurring = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid(), patch: z.record(z.any()) }))
  .handler(async ({ data }) => {
    const { updateRecurringAccount } = await import("./finance.server");
    return updateRecurringAccount(data.id, data.patch);
  });

export const deleteRecurring = createServerFn({ method: "POST" })
  .inputValidator(z.object({ id: z.string().uuid() }))
  .handler(async ({ data }) => {
    const { removeRecurringAccount } = await import("./finance.server");
    return removeRecurringAccount(data.id);
  });

export const generateRecurring = createServerFn({ method: "POST" }).handler(async () => {
  const { generateRecurringForPeriod } = await import("./finance.server");
  return generateRecurringForPeriod();
});

export const getReserve = createServerFn({ method: "GET" }).handler(async () => {
  const { ensureReserve, fetchReserveTransactions } = await import("./finance.server");
  const reserve = await ensureReserve();
  const transactions = await fetchReserveTransactions();
  return { reserve, transactions };
});

export const moveReserve = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      type: z.enum(["deposit", "withdraw"]),
      amount: z.number().positive(),
      reason: z.string().nullable().optional(),
      occurred_at: z.string().optional(),
      attachment_url: z.string().nullable().optional(),
    }),
  )
  .handler(async ({ data }) => {
    const { reserveMove } = await import("./finance.server");
    return reserveMove(data);
  });

export const getCalendar = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchCalendarEvents } = await import("./finance.server");
  return fetchCalendarEvents();
});

export const getPayoffPlan = createServerFn({ method: "GET" })
  .inputValidator(
    z
      .object({ strategy: z.enum(["smallest", "interest", "impact"]).optional() })
      .optional(),
  )
  .handler(async ({ data }) => {
    const { fetchPayoffPlan } = await import("./finance.server");
    return fetchPayoffPlan(data?.strategy || "smallest");
  });

export const searchFinance = createServerFn({ method: "GET" })
  .inputValidator(z.object({ q: z.string() }))
  .handler(async ({ data }) => {
    const { globalSearch } = await import("./finance.server");
    return globalSearch(data.q);
  });

export const getFinancialProfile = createServerFn({ method: "GET" }).handler(async () => {
  const { fetchFinancialProfile, fetchSettings } = await import("./finance.server");
  const [profile, settings] = await Promise.all([fetchFinancialProfile(), fetchSettings()]);
  return { profile, settings };
});
